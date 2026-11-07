"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentUser, queryAsUser } from "@/lib/auth";
import { moveErrorMessage, moveExpert } from "@/lib/pipeline/move";
import { getAcceptedProposals } from "@/lib/pipeline/queries";

const date = z.iso.date("Data inválida.");

const moveSchema = z.object({
  expertId: z.uuid(),
  toStageId: z.uuid(),
  lossReasonId: z.uuid().nullable().optional(),
  lossNote: z.string().max(2000).nullable().optional(),
  won: z
    .object({ proposalId: z.uuid("Escolha a proposta aceita."), contractSignedAt: date, setupPaidAt: date })
    .nullable()
    .optional(),
});

export type MoveResult = { ok: true } | { ok: false; error: string };

// Move o lead de etapa (Kanban, lista ou ficha).
export async function moveExpertStage(input: z.input<typeof moveSchema>): Promise<MoveResult> {
  const user = await getCurrentUser();
  const parsed = moveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  try {
    await queryAsUser((tx) => moveExpert(tx, parsed.data, user.id));
  } catch (error) {
    const message = moveErrorMessage(error);
    if (message) return { ok: false, error: message };
    throw error;
  }
  refresh();
  return { ok: true };
}

// Propostas aceitas do lead, para o diálogo de Ganho.
export async function listAcceptedProposals(expertId: string) {
  await getCurrentUser();
  return getAcceptedProposals(expertId);
}
