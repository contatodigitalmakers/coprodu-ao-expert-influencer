import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { cache } from "react";
import { runAsAnon } from "@/db";
import { experts, plans, proposals } from "@/db/schema";
import type { ProposalExtra } from "@/db/schema/deals";
import type { ProposalStatus } from "@/db/schema/enums";
import { queryAsUser } from "@/lib/auth";
import { isUuid } from "@/lib/experts/normalize";

const proposalFields = {
  id: proposals.id,
  status: proposals.status,
  setupValue: proposals.setupValue,
  expertShare: proposals.expertShare,
  ourShare: proposals.ourShare,
  extras: proposals.extras,
  total: proposals.total,
  publicToken: proposals.publicToken,
  sentAt: proposals.sentAt,
  viewedAt: proposals.viewedAt,
  acceptedAt: proposals.acceptedAt,
  createdAt: proposals.createdAt,
  planId: plans.id,
  planName: plans.name,
  expertId: experts.id,
  expertName: experts.name,
  expertHandle: experts.handle,
};

export async function listProposals(status: ProposalStatus | null) {
  return queryAsUser((tx) =>
    tx
      .select(proposalFields)
      .from(proposals)
      .innerJoin(plans, eq(plans.id, proposals.planId))
      .innerJoin(experts, eq(experts.id, proposals.expertId))
      .where(and(isNull(experts.deletedAt), status ? eq(proposals.status, status) : undefined))
      .orderBy(desc(proposals.createdAt)),
  );
}

export type ProposalRow = Awaited<ReturnType<typeof listProposals>>[number];

export async function getProposal(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await queryAsUser((tx) =>
    tx
      .select(proposalFields)
      .from(proposals)
      .innerJoin(plans, eq(plans.id, proposals.planId))
      .innerJoin(experts, eq(experts.id, proposals.expertId))
      .where(eq(proposals.id, id)),
  );
  return row ?? null;
}

export async function getExpertProposals(expertId: string) {
  if (!isUuid(expertId)) return [];
  return queryAsUser((tx) =>
    tx
      .select(proposalFields)
      .from(proposals)
      .innerJoin(plans, eq(plans.id, proposals.planId))
      .innerJoin(experts, eq(experts.id, proposals.expertId))
      .where(eq(proposals.expertId, expertId))
      .orderBy(desc(proposals.createdAt)),
  );
}

export const getActivePlans = cache(async () =>
  queryAsUser((tx) =>
    tx
      .select({ id: plans.id, name: plans.name, setupValue: plans.setupValue, expertShare: plans.expertShare, ourShare: plans.ourShare })
      .from(plans)
      .where(eq(plans.active, true))
      .orderBy(asc(plans.setupValue)),
  ),
);

export type PublicProposal = {
  expertName: string;
  planName: string;
  setupValue: number;
  expertShare: number;
  ourShare: number;
  extras: ProposalExtra[];
  total: number;
  status: ProposalStatus;
  sentAt: string | null;
  acceptedAt: string | null;
};

// Página pública: lê pelo token (sem login) e registra a visualização.
export async function getPublicProposal(token: string) {
  if (!isUuid(token)) return null;
  const rows = await runAsAnon((tx) => tx.execute<{ proposal: PublicProposal | null }>(sql`select public.get_public_proposal(${token}::uuid) as proposal`));
  const proposal = rows[0]?.proposal ?? null;
  return proposal && { ...proposal, setupValue: Number(proposal.setupValue), total: Number(proposal.total) };
}

// Resposta do expert na página pública.
export async function respondToProposal(token: string, accept: boolean) {
  if (!isUuid(token)) return "unavailable";
  const rows = await runAsAnon((tx) => tx.execute<{ result: string }>(sql`select public.respond_to_proposal(${token}::uuid, ${accept}) as result`));
  return rows[0]?.result ?? "unavailable";
}
