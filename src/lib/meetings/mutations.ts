import { and, eq, isNull } from "drizzle-orm";
import type { Tx } from "@/db";
import { activities, experts, meetings, stages, users } from "@/db/schema";
import type { DiagnosisForm } from "@/db/schema/deals";
import type { MeetingStatus } from "@/db/schema/enums";
import { getStageByKey } from "@/lib/experts/mutations";
import { formatDateTime } from "@/lib/format";
import { MEETING_STATUS_LABELS } from "@/lib/labels";
import { moveExpert } from "@/lib/pipeline/move";

export class MeetingError extends Error {}

// "2026-11-12" + "15:00" no horário de Brasília (sem horário de verão desde 2019).
export function toScheduledAt(date: string, time: string) {
  const value = new Date(`${date}T${time}:00-03:00`);
  if (Number.isNaN(value.getTime())) throw new MeetingError("Data ou hora inválida.");
  return value;
}

// Avança o lead até a etapa (se ele ainda estiver antes dela e não estiver ganho/perdido).
async function advanceTo(tx: Tx, expertId: string, stageKey: string, userId: string) {
  const target = await getStageByKey(tx, stageKey);
  const [current] = await tx
    .select({ order: stages.order, isWon: stages.isWon, isLost: stages.isLost })
    .from(experts)
    .innerJoin(stages, eq(stages.id, experts.stageId))
    .where(eq(experts.id, expertId));
  if (current && !current.isWon && !current.isLost && current.order < target.order) {
    await moveExpert(tx, { expertId, toStageId: target.id }, userId);
  }
}

async function closerName(tx: Tx, closerId: string) {
  const [closer] = await tx.select({ name: users.name }).from(users).where(and(eq(users.id, closerId), eq(users.active, true)));
  if (!closer) throw new MeetingError("Escolha o responsável (Closer).");
  return closer.name;
}

export type MeetingInput = { date: string; time: string; link: string | null; closerId: string };

// Agenda a reunião de diagnóstico (seção 3.7) e move o lead para "Diagnóstico agendado".
export async function scheduleMeeting(tx: Tx, expertId: string, input: MeetingInput, userId: string) {
  const [expert] = await tx.select({ id: experts.id }).from(experts).where(and(eq(experts.id, expertId), isNull(experts.deletedAt)));
  if (!expert) throw new MeetingError("Lead não encontrado.");
  const scheduledAt = toScheduledAt(input.date, input.time);
  const closer = await closerName(tx, input.closerId);

  const [meeting] = await tx
    .insert(meetings)
    .values({ expertId, userId: input.closerId, scheduledAt, link: input.link })
    .returning({ id: meetings.id });
  await tx.insert(activities).values({
    expertId,
    userId,
    type: "meeting",
    description: `Diagnóstico agendado para ${formatDateTime(scheduledAt)} com ${closer}.`,
    metadata: { meetingId: meeting.id },
  });
  await advanceTo(tx, expertId, "meeting_scheduled", userId);
  return meeting.id;
}

// Reagenda (data, hora, link e responsável).
export async function rescheduleMeeting(tx: Tx, meetingId: string, input: MeetingInput, userId: string) {
  const scheduledAt = toScheduledAt(input.date, input.time);
  const closer = await closerName(tx, input.closerId);
  const [meeting] = await tx
    .update(meetings)
    .set({ scheduledAt, link: input.link, userId: input.closerId, status: "scheduled" })
    .where(eq(meetings.id, meetingId))
    .returning({ expertId: meetings.expertId });
  if (!meeting) throw new MeetingError("Reunião não encontrada.");
  await tx.insert(activities).values({
    expertId: meeting.expertId,
    userId,
    type: "meeting",
    description: `Diagnóstico reagendado para ${formatDateTime(scheduledAt)} com ${closer}.`,
    metadata: { meetingId },
  });
}

export async function saveDiagnosis(tx: Tx, meetingId: string, diagnosis: DiagnosisForm) {
  const [meeting] = await tx.update(meetings).set({ diagnosis }).where(eq(meetings.id, meetingId)).returning({ id: meetings.id });
  if (!meeting) throw new MeetingError("Reunião não encontrada.");
}

// Realizada move o lead para "Diagnóstico realizado"; os outros status só registram.
export async function setMeetingStatus(tx: Tx, meetingId: string, status: Exclude<MeetingStatus, "scheduled">, userId: string) {
  const [meeting] = await tx.update(meetings).set({ status }).where(eq(meetings.id, meetingId)).returning({ expertId: meetings.expertId });
  if (!meeting) throw new MeetingError("Reunião não encontrada.");
  await tx.insert(activities).values({
    expertId: meeting.expertId,
    userId,
    type: "meeting",
    description: `Diagnóstico: ${MEETING_STATUS_LABELS[status].toLowerCase()}.`,
    metadata: { meetingId, status },
  });
  if (status === "done") await advanceTo(tx, meeting.expertId, "meeting_done", userId);
}
