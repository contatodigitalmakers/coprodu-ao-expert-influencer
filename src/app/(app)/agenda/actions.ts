"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentUser, queryAsUser } from "@/lib/auth";
import { isUuid } from "@/lib/experts/normalize";
import { MeetingError, rescheduleMeeting, saveDiagnosis, scheduleMeeting, setMeetingStatus } from "@/lib/meetings/mutations";
import { MoveError } from "@/lib/pipeline/move";

type Result = { error?: string; message?: string };

const meetingSchema = z.object({
  date: z.iso.date("Informe a data."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Informe a hora."),
  link: z
    .string()
    .trim()
    .max(500)
    .transform((value) => value || null)
    .pipe(z.url("Link da chamada inválido.").nullable()),
  closerId: z.uuid("Escolha o responsável (Closer)."),
});

export type MeetingFormValues = z.input<typeof meetingSchema>;

async function run(fn: () => Promise<unknown>, message?: string): Promise<Result> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof MeetingError || error instanceof MoveError) return { error: error.message };
    throw error;
  }
  refresh();
  return { message };
}

export async function scheduleMeetingAction(expertId: string, values: MeetingFormValues): Promise<Result> {
  const user = await getCurrentUser();
  const parsed = meetingSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!isUuid(expertId)) return { error: "Lead inválido." };
  return run(() => queryAsUser((tx) => scheduleMeeting(tx, expertId, parsed.data, user.id)), "Diagnóstico agendado.");
}

export async function rescheduleMeetingAction(meetingId: string, values: MeetingFormValues): Promise<Result> {
  const user = await getCurrentUser();
  const parsed = meetingSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!isUuid(meetingId)) return { error: "Reunião inválida." };
  return run(() => queryAsUser((tx) => rescheduleMeeting(tx, meetingId, parsed.data, user.id)), "Reunião reagendada.");
}

const text = z.string().trim().max(5000, "Texto muito longo.");
const diagnosisSchema = z.object({
  audience: text,
  currentProducts: text,
  approxRevenue: text,
  appIdea: text,
  planInterestId: z.uuid().nullable(),
  objections: text,
});

export async function saveDiagnosisAction(meetingId: string, values: z.input<typeof diagnosisSchema>): Promise<Result> {
  await getCurrentUser();
  const parsed = diagnosisSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!isUuid(meetingId)) return { error: "Reunião inválida." };
  return run(() => queryAsUser((tx) => saveDiagnosis(tx, meetingId, parsed.data)), "Diagnóstico salvo.");
}

export async function setMeetingStatusAction(meetingId: string, status: string): Promise<Result> {
  const user = await getCurrentUser();
  const parsed = z.enum(["done", "canceled", "no_show"]).safeParse(status);
  if (!parsed.success || !isUuid(meetingId)) return { error: "Status inválido." };
  return run(() => queryAsUser((tx) => setMeetingStatus(tx, meetingId, parsed.data, user.id)));
}
