import { and, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import type { Tx } from "@/db";
import {
  activities,
  cadenceEnrollments,
  cadenceSteps,
  cadences,
  experts,
  lossReasons,
  stages,
  tasks,
  templates,
} from "@/db/schema";
import type { Channel, TaskOutcome } from "@/db/schema/enums";
import { getStageByKey } from "@/lib/experts/mutations";
import { todayInSaoPaulo } from "@/lib/format";
import { CHANNEL_LABELS, TASK_OUTCOME_LABELS } from "@/lib/labels";
import { moveExpert } from "@/lib/pipeline/move";
import { closeActiveEnrollment } from "./enrollment-status";

export class CadenceError extends Error {}

// "2026-11-06" + 3 dias → "2026-11-09"
export function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export type StepInput = { id: string | null; dayOffset: number; channel: Channel; templateId: string | null };

// Cria ou atualiza a cadência e substitui seus passos (na ordem do dia).
export async function saveCadence(
  tx: Tx,
  cadenceId: string | null,
  input: { name: string; active: boolean; steps: StepInput[] },
) {
  const templateIds = input.steps.map((step) => step.templateId).filter((id): id is string => Boolean(id));
  if (templateIds.length) {
    const found = await tx
      .select({ id: templates.id, channel: templates.channel })
      .from(templates)
      .where(and(inArray(templates.id, templateIds), isNull(templates.deletedAt)));
    for (const step of input.steps) {
      if (!step.templateId) continue;
      const template = found.find((item) => item.id === step.templateId);
      if (!template) throw new CadenceError("Um dos templates escolhidos não existe mais.");
      if (template.channel !== step.channel) {
        throw new CadenceError(`O template do passo D${step.dayOffset} é de outro canal.`);
      }
    }
  }

  let id = cadenceId;
  if (id) {
    await tx.update(cadences).set({ name: input.name, active: input.active }).where(eq(cadences.id, id));
  } else {
    [{ id }] = await tx.insert(cadences).values({ name: input.name, active: input.active }).returning({ id: cadences.id });
  }

  const steps = [...input.steps].sort((a, b) => a.dayOffset - b.dayOffset);
  const keptIds = steps.map((step) => step.id).filter((stepId): stepId is string => Boolean(stepId));
  await tx
    .delete(cadenceSteps)
    .where(and(eq(cadenceSteps.cadenceId, id!), keptIds.length ? notInArray(cadenceSteps.id, keptIds) : undefined));
  for (const [index, step] of steps.entries()) {
    const values = { dayOffset: step.dayOffset, channel: step.channel, templateId: step.templateId, order: index + 1 };
    if (step.id) await tx.update(cadenceSteps).set(values).where(eq(cadenceSteps.id, step.id));
    else await tx.insert(cadenceSteps).values({ ...values, cadenceId: id! });
  }
  return id!;
}

// Inscreve o lead na cadência e gera uma tarefa por passo, com data.
export async function enrollExpert(tx: Tx, expertId: string, cadenceId: string, userId: string) {
  const [expert] = await tx
    .select({ id: experts.id, ownerId: experts.ownerId, stageOrder: stages.order, isWon: stages.isWon, isLost: stages.isLost })
    .from(experts)
    .innerJoin(stages, eq(stages.id, experts.stageId))
    .where(and(eq(experts.id, expertId), isNull(experts.deletedAt)));
  if (!expert) throw new CadenceError("Lead não encontrado.");
  if (expert.isWon) throw new CadenceError("Lead ganho não entra em cadência.");

  const [cadence] = await tx.select().from(cadences).where(eq(cadences.id, cadenceId));
  if (!cadence?.active) throw new CadenceError("Cadência não encontrada ou inativa.");
  const steps = await tx.select().from(cadenceSteps).where(eq(cadenceSteps.cadenceId, cadenceId)).orderBy(cadenceSteps.order);
  if (!steps.length) throw new CadenceError("Esta cadência não tem passos.");

  const [active] = await tx
    .select({ id: cadenceEnrollments.id })
    .from(cadenceEnrollments)
    .where(and(eq(cadenceEnrollments.expertId, expertId), eq(cadenceEnrollments.status, "active")));
  if (active) throw new CadenceError("O lead já está em uma cadência ativa (regra 2).");

  const [enrollment] = await tx
    .insert(cadenceEnrollments)
    .values({ expertId, cadenceId })
    .returning({ id: cadenceEnrollments.id });

  const today = todayInSaoPaulo();
  await tx.insert(tasks).values(
    steps.map((step) => ({
      expertId,
      userId: expert.ownerId ?? userId,
      enrollmentId: enrollment.id,
      stepId: step.id,
      dueDate: addDays(today, step.dayOffset),
      channel: step.channel,
    })),
  );

  await tx.insert(activities).values({
    expertId,
    userId,
    type: "note",
    description: `Inscrito na cadência “${cadence.name}” (${steps.length} passos).`,
    metadata: { enrollmentId: enrollment.id, cadenceId },
  });

  // "Novo lead" (ou perdido, que assim é reativado) vai para "Em cadência".
  const inCadence = await getStageByKey(tx, "in_cadence");
  if (expert.isLost || expert.stageOrder < inCadence.order) {
    await moveExpert(tx, { expertId, toStageId: inCadence.id }, userId);
  }
  return enrollment.id;
}

const ACTIVITY_BY_CHANNEL = {
  interaction: "interaction",
  dm: "dm",
  whatsapp: "whatsapp",
  email: "email",
  call: "call",
} as const;

// Registra o resultado de uma tarefa (seção 3.4) e aplica as consequências:
// - conta o uso/resposta do template;
// - "respondeu" pausa a cadência e move o lead para "Respondeu";
// - cadência que termina sem resposta leva o lead a Perdido (motivo "Sem resposta").
export async function completeTask(tx: Tx, taskId: string, outcome: TaskOutcome, userId: string) {
  const [task] = await tx
    .select({
      id: tasks.id,
      expertId: tasks.expertId,
      enrollmentId: tasks.enrollmentId,
      channel: tasks.channel,
      dayOffset: cadenceSteps.dayOffset,
      templateId: cadenceSteps.templateId,
    })
    .from(tasks)
    .leftJoin(cadenceSteps, eq(cadenceSteps.id, tasks.stepId))
    .where(and(eq(tasks.id, taskId), eq(tasks.status, "pending")));
  if (!task) throw new CadenceError("Tarefa não encontrada ou já concluída.");

  await tx.update(tasks).set({ status: "done", outcome }).where(eq(tasks.id, task.id));

  if (task.templateId && outcome !== "invalid_number") {
    await tx
      .update(templates)
      .set({
        timesUsed: sql`${templates.timesUsed} + 1`,
        timesReplied: sql`${templates.timesReplied} + ${outcome === "replied" ? 1 : 0}`,
      })
      .where(eq(templates.id, task.templateId));
  }

  const step = task.dayOffset === null ? "" : `D${task.dayOffset} · `;
  await tx.insert(activities).values({
    expertId: task.expertId,
    userId,
    type: ACTIVITY_BY_CHANNEL[task.channel],
    description: `${step}${CHANNEL_LABELS[task.channel]}: ${TASK_OUTCOME_LABELS[outcome].toLowerCase()}.`,
    metadata: { taskId: task.id, outcome, templateId: task.templateId },
  });

  if (outcome === "replied") {
    await closeActiveEnrollment(tx, task.expertId, "paused");
    const replied = await getStageByKey(tx, "replied");
    const [current] = await tx
      .select({ order: stages.order, isLost: stages.isLost, isWon: stages.isWon })
      .from(experts)
      .innerJoin(stages, eq(stages.id, experts.stageId))
      .where(eq(experts.id, task.expertId));
    if (current && !current.isWon && (current.isLost || current.order < replied.order)) {
      await moveExpert(tx, { expertId: task.expertId, toStageId: replied.id }, userId);
    }
    return;
  }
  if (task.enrollmentId) await finishIfComplete(tx, task.enrollmentId, userId);
}

// Pula a tarefa (ex.: passo que não se aplica ao lead).
export async function skipTask(tx: Tx, taskId: string, userId: string) {
  const [task] = await tx
    .update(tasks)
    .set({ status: "skipped" })
    .where(and(eq(tasks.id, taskId), eq(tasks.status, "pending")))
    .returning({ enrollmentId: tasks.enrollmentId });
  if (!task) throw new CadenceError("Tarefa não encontrada ou já concluída.");
  if (task.enrollmentId) await finishIfComplete(tx, task.enrollmentId, userId);
}

// Sem tarefas pendentes, a cadência termina. Se ninguém respondeu, o lead vai
// para Perdido com motivo "Sem resposta" e, depois de N dias (configurações),
// aparece na fila de reativação.
async function finishIfComplete(tx: Tx, enrollmentId: string, userId: string) {
  const [enrollment] = await tx
    .select()
    .from(cadenceEnrollments)
    .where(and(eq(cadenceEnrollments.id, enrollmentId), eq(cadenceEnrollments.status, "active")));
  if (!enrollment) return;

  const enrollmentTasks = await tx
    .select({ status: tasks.status, outcome: tasks.outcome })
    .from(tasks)
    .where(eq(tasks.enrollmentId, enrollmentId));
  if (enrollmentTasks.some((task) => task.status === "pending")) return;

  await tx.update(cadenceEnrollments).set({ status: "finished" }).where(eq(cadenceEnrollments.id, enrollmentId));
  if (enrollmentTasks.some((task) => task.outcome === "replied")) return;

  const [current] = await tx
    .select({ isWon: stages.isWon, isLost: stages.isLost, order: stages.order })
    .from(experts)
    .innerJoin(stages, eq(stages.id, experts.stageId))
    .where(eq(experts.id, enrollment.expertId));
  const replied = await getStageByKey(tx, "replied");
  if (!current || current.isWon || current.isLost || current.order >= replied.order) return;

  const lost = await getStageByKey(tx, "lost");
  const [noReply] = await tx.select({ id: lossReasons.id }).from(lossReasons).where(eq(lossReasons.key, "no_reply"));
  await moveExpert(
    tx,
    { expertId: enrollment.expertId, toStageId: lost.id, lossReasonId: noReply?.id, lossNote: "Cadência terminou sem resposta." },
    userId,
  );
}
