"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { databaseHint } from "@/db/errors";
import { getCurrentUser, queryAsUser } from "@/lib/auth";
import { isUuid } from "@/lib/experts/normalize";
import { MoveError } from "@/lib/pipeline/move";
import { parseMoney } from "@/lib/proposals/calc";
import { createProposal, markAnswered, markSent, ProposalError, updateDraft } from "@/lib/proposals/mutations";

type Result = { error?: string };

const proposalSchema = z.object({
  planId: z.uuid("Escolha o plano."),
  extras: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Dê um nome a cada serviço extra.").max(120),
        value: z
          .string()
          .transform(parseMoney)
          .refine((value) => Number.isFinite(value) && value >= 0, "Valor de serviço extra inválido."),
      }),
    )
    .max(20, "No máximo 20 serviços extras."),
});

export type ProposalInput = z.input<typeof proposalSchema>;

async function run(fn: () => Promise<unknown>): Promise<Result> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof ProposalError || error instanceof MoveError) return { error: error.message };
    if (databaseHint(error) === "accepted_proposal_frozen") return { error: "Proposta aceita não pode ter os valores alterados." };
    throw error;
  }
  refresh();
  return {};
}

export async function createProposalAction(expertId: string, input: ProposalInput): Promise<Result> {
  const user = await getCurrentUser();
  const parsed = proposalSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!isUuid(expertId)) return { error: "Lead inválido." };
  let proposalId = "";
  const result = await run(async () => {
    proposalId = await queryAsUser((tx) => createProposal(tx, expertId, parsed.data.planId, parsed.data.extras, user.id));
  });
  if (result.error) return result;
  redirect(`/propostas/${proposalId}`);
}

export async function updateProposalAction(proposalId: string, input: ProposalInput): Promise<Result> {
  await getCurrentUser();
  const parsed = proposalSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!isUuid(proposalId)) return { error: "Proposta inválida." };
  const result = await run(() => queryAsUser((tx) => updateDraft(tx, proposalId, parsed.data.planId, parsed.data.extras)));
  if (result.error) return result;
  redirect(`/propostas/${proposalId}`);
}

export async function markSentAction(proposalId: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!isUuid(proposalId)) return { error: "Proposta inválida." };
  return run(() => queryAsUser((tx) => markSent(tx, proposalId, user.id)));
}

export async function markAnsweredAction(proposalId: string, accepted: boolean): Promise<Result> {
  const user = await getCurrentUser();
  if (!isUuid(proposalId)) return { error: "Proposta inválida." };
  return run(() => queryAsUser((tx) => markAnswered(tx, proposalId, accepted, user.id)));
}
