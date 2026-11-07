import { and, eq, inArray, isNull } from "drizzle-orm";
import type { Tx } from "@/db";
import { activities, experts, plans, proposals } from "@/db/schema";
import type { ProposalExtra } from "@/db/schema/deals";
import { getStageByKey } from "@/lib/experts/mutations";
import { formatCurrency } from "@/lib/format";
import { advanceExpertTo } from "@/lib/pipeline/move";
import { getSettings } from "@/lib/settings";
import { proposalTotal } from "./calc";

export class ProposalError extends Error {}

async function activePlan(tx: Tx, planId: string) {
  const [plan] = await tx.select().from(plans).where(and(eq(plans.id, planId), eq(plans.active, true)));
  if (!plan) throw new ProposalError("Escolha um plano ativo.");
  return plan;
}

async function log(tx: Tx, expertId: string, userId: string | null, description: string, proposalId: string) {
  await tx.insert(activities).values({ expertId, userId, type: "proposal", description, metadata: { proposalId } });
}

// Gerador de proposta (seção 3.8): valores e divisão copiados do plano.
export async function createProposal(tx: Tx, expertId: string, planId: string, extras: ProposalExtra[], userId: string) {
  const [expert] = await tx.select({ id: experts.id }).from(experts).where(and(eq(experts.id, expertId), isNull(experts.deletedAt)));
  if (!expert) throw new ProposalError("Lead não encontrado.");
  const plan = await activePlan(tx, planId);
  const [proposal] = await tx
    .insert(proposals)
    .values({
      expertId,
      planId,
      setupValue: plan.setupValue,
      expertShare: plan.expertShare,
      ourShare: plan.ourShare,
      extras,
      total: proposalTotal(plan.setupValue, extras),
    })
    .returning({ id: proposals.id, total: proposals.total });
  await log(tx, expertId, userId, `Proposta criada (${plan.name}, total ${formatCurrency(proposal.total)}).`, proposal.id);
  return proposal.id;
}

// Rascunho pode trocar de plano e de extras.
export async function updateDraft(tx: Tx, proposalId: string, planId: string, extras: ProposalExtra[]) {
  const plan = await activePlan(tx, planId);
  const [updated] = await tx
    .update(proposals)
    .set({
      planId,
      setupValue: plan.setupValue,
      expertShare: plan.expertShare,
      ourShare: plan.ourShare,
      extras,
      total: proposalTotal(plan.setupValue, extras),
    })
    .where(and(eq(proposals.id, proposalId), eq(proposals.status, "draft")))
    .returning({ id: proposals.id });
  if (!updated) throw new ProposalError("Só rascunhos podem ser editados.");
}

// Enviada: o link público passa a funcionar e o lead vai para "Proposta enviada".
export async function markSent(tx: Tx, proposalId: string, userId: string) {
  const [proposal] = await tx
    .update(proposals)
    .set({ status: "sent", sentAt: new Date() })
    .where(and(eq(proposals.id, proposalId), eq(proposals.status, "draft")))
    .returning({ expertId: proposals.expertId });
  if (!proposal) throw new ProposalError("Só rascunhos podem ser marcados como enviados.");
  await log(tx, proposal.expertId, userId, "Proposta enviada.", proposalId);
  await advanceExpertTo(tx, proposal.expertId, (await getStageByKey(tx, "proposal_sent")).id, userId);
}

// Resposta registrada pela equipe (ex.: o expert aceitou pelo WhatsApp).
export async function markAnswered(tx: Tx, proposalId: string, accepted: boolean, userId: string) {
  const [proposal] = await tx
    .update(proposals)
    .set(accepted ? { status: "accepted", acceptedAt: new Date() } : { status: "rejected" })
    .where(and(eq(proposals.id, proposalId), inArray(proposals.status, ["sent", "viewed"])))
    .returning({ expertId: proposals.expertId });
  if (!proposal) throw new ProposalError("A proposta precisa estar enviada para receber resposta.");

  await log(tx, proposal.expertId, userId, accepted ? "Proposta aceita." : "Proposta recusada.", proposalId);
  if (accepted) {
    const settings = await getSettings(tx);
    await advanceExpertTo(tx, proposal.expertId, settings.acceptedProposalStageId, userId);
  }
}
