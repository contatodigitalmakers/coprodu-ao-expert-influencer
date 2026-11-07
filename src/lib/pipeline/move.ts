import { and, eq, isNull } from "drizzle-orm";
import type { Tx } from "@/db";
import { databaseHint, isUniqueViolation } from "@/db/errors";
import { activities, experts, lossReasons, projects, proposals, stages } from "@/db/schema";
import { closeActiveEnrollment } from "@/lib/cadences/enrollment-status";
import { getStageByKey } from "@/lib/experts/mutations";

// Mudança de etapa de um lead. As regras principais também estão no banco
// (gatilhos da migration 0005): aqui validamos antes para dar mensagens claras.

export type MoveInput = {
  expertId: string;
  toStageId: string;
  // Obrigatório ao mover para Perdido (regra 3).
  lossReasonId?: string | null;
  lossNote?: string | null;
  // Obrigatório ao mover para Ganho (regras 4 e 5).
  won?: { proposalId: string; contractSignedAt: string; setupPaidAt: string } | null;
};

export class MoveError extends Error {}

export async function moveExpert(tx: Tx, input: MoveInput, userId: string | null) {
  const [target] = await tx.select().from(stages).where(eq(stages.id, input.toStageId));
  if (!target) throw new MoveError("Etapa não encontrada.");

  const [expert] = await tx
    .select({ id: experts.id, stageId: experts.stageId })
    .from(experts)
    .where(and(eq(experts.id, input.expertId), isNull(experts.deletedAt)));
  if (!expert) throw new MoveError("Lead não encontrado.");
  if (expert.stageId === target.id) return;

  let lossReasonId: string | null = null;
  let lossNote: string | null = null;
  if (target.isLost) {
    const [reason] = input.lossReasonId
      ? await tx.select().from(lossReasons).where(eq(lossReasons.id, input.lossReasonId))
      : [];
    if (!reason) throw new MoveError("Escolha o motivo da perda.");
    lossNote = input.lossNote?.trim() || null;
    if (reason.key === "other" && !lossNote) throw new MoveError("Descreva o motivo da perda.");
    lossReasonId = reason.id;
  }

  if (target.isWon) {
    const won = input.won;
    if (!won) throw new MoveError("Informe a proposta aceita, a assinatura e o pagamento do setup.");
    const [proposal] = await tx
      .select({ id: proposals.id })
      .from(proposals)
      .where(
        and(eq(proposals.id, won.proposalId), eq(proposals.expertId, expert.id), eq(proposals.status, "accepted")),
      );
    if (!proposal) throw new MoveError("Mover para Ganho exige uma proposta aceita deste lead.");
    if (!won.contractSignedAt || !won.setupPaidAt) {
      throw new MoveError("Informe a data de assinatura do contrato e do pagamento do setup.");
    }
    await tx.insert(projects).values({
      expertId: expert.id,
      proposalId: proposal.id,
      contractSignedAt: won.contractSignedAt,
      setupPaidAt: won.setupPaidAt,
    });
  }

  // O gatilho registra a mudança na linha do tempo e atualiza stage_entered_at.
  await tx
    .update(experts)
    .set({ stageId: target.id, lossReasonId, lossNote })
    .where(eq(experts.id, expert.id));

  // Cadência: Ganho/Perdido encerram; Respondeu ou além pausam (seção 3.4).
  if (target.isWon || target.isLost) {
    await closeActiveEnrollment(tx, expert.id, "finished");
  } else if (target.order >= (await getStageByKey(tx, "replied")).order) {
    await closeActiveEnrollment(tx, expert.id, "paused");
  }

  if (target.isWon) {
    await tx.insert(activities).values({
      expertId: expert.id,
      userId,
      type: "note",
      description: "Projeto criado com status “Aguardando kickoff”.",
    });
  }
}

const HINT_MESSAGES: Record<string, string> = {
  loss_reason_required: "Mover para Perdido exige motivo.",
  accepted_proposal_required: "Mover para Ganho exige uma proposta aceita.",
  won_requires_project: "Ganho exige data de assinatura e pagamento do setup confirmados.",
};

// Mensagem para o usuário a partir de um erro de mudança de etapa.
export function moveErrorMessage(error: unknown) {
  if (error instanceof MoveError) return error.message;
  const hint = databaseHint(error);
  if (hint && HINT_MESSAGES[hint]) return HINT_MESSAGES[hint];
  if (isUniqueViolation(error, "projects_proposal_id_unique")) return "Esta proposta já tem um projeto.";
  return null;
}

// Avança o lead até a etapa, se ele ainda estiver antes dela e não estiver
// ganho nem perdido (usado por reuniões e propostas).
export async function advanceExpertTo(tx: Tx, expertId: string, stageId: string, userId: string | null) {
  const [target] = await tx.select().from(stages).where(eq(stages.id, stageId));
  const [current] = await tx
    .select({ order: stages.order, isWon: stages.isWon, isLost: stages.isLost })
    .from(experts)
    .innerJoin(stages, eq(stages.id, experts.stageId))
    .where(eq(experts.id, expertId));
  if (target && !target.isWon && !target.isLost && current && !current.isWon && !current.isLost && current.order < target.order) {
    await moveExpert(tx, { expertId, toStageId: target.id }, userId);
  }
}
