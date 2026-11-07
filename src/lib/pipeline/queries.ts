import { and, asc, desc, eq, isNull, type SQL } from "drizzle-orm";
import { cache } from "react";
import { experts, lossReasons, niches, plans, proposals, stages, users } from "@/db/schema";
import { queryAsUser } from "@/lib/auth";
import { OWNER_ME, OWNER_NONE } from "@/lib/experts/filters";
import { isUuid } from "@/lib/experts/normalize";

const DAY = 24 * 60 * 60 * 1000;

export type StageOption = {
  id: string;
  key: string | null;
  name: string;
  maxDays: number | null;
  isWon: boolean;
  isLost: boolean;
};

export type LossReasonOption = { id: string; key: string | null; name: string };

// Etapas (na ordem) e motivos de perda: usados no pipeline e na ficha.
export const getStageOptions = cache(async () =>
  queryAsUser(async (tx) => {
    const [stageRows, reasonRows] = await Promise.all([
      tx
        .select({
          id: stages.id,
          key: stages.key,
          name: stages.name,
          maxDays: stages.maxDays,
          isWon: stages.isWon,
          isLost: stages.isLost,
        })
        .from(stages)
        .orderBy(asc(stages.order)),
      tx
        .select({ id: lossReasons.id, key: lossReasons.key, name: lossReasons.name })
        .from(lossReasons)
        .orderBy(asc(lossReasons.name)),
    ]);
    // "Outro" vai para o fim da lista de motivos.
    reasonRows.sort((a, b) => Number(a.key === "other") - Number(b.key === "other"));
    return { stages: stageRows as StageOption[], lossReasons: reasonRows as LossReasonOption[] };
  }),
);

// Dias inteiros desde que o lead entrou na etapa.
export function daysSince(date: Date, now = Date.now()) {
  return Math.max(0, Math.floor((now - date.getTime()) / DAY));
}

// Leads do pipeline (sem os excluídos), com dias parados na etapa.
export async function getPipelineCards(owner: string | null, currentUserId: string) {
  const conditions: SQL[] = [isNull(experts.deletedAt)];
  if (owner === OWNER_ME) conditions.push(eq(experts.ownerId, currentUserId));
  else if (owner === OWNER_NONE) conditions.push(isNull(experts.ownerId));
  else if (isUuid(owner)) conditions.push(eq(experts.ownerId, owner));

  const rows = await queryAsUser((tx) =>
    tx
      .select({
        id: experts.id,
        name: experts.name,
        handle: experts.handle,
        followers: experts.followers,
        score: experts.score,
        scoreTier: experts.scoreTier,
        stageId: experts.stageId,
        stageEnteredAt: experts.stageEnteredAt,
        nicheName: niches.name,
        ownerName: users.name,
        maxDays: stages.maxDays,
      })
      .from(experts)
      .innerJoin(stages, eq(stages.id, experts.stageId))
      .leftJoin(niches, eq(niches.id, experts.nicheId))
      .leftJoin(users, eq(users.id, experts.ownerId))
      .where(and(...conditions))
      .orderBy(asc(experts.stageEnteredAt)),
  );

  const now = Date.now();
  return rows.map(({ stageEnteredAt, maxDays, ...row }) => {
    const daysInStage = daysSince(stageEnteredAt, now);
    return { ...row, daysInStage, isOverdue: maxDays !== null && daysInStage > maxDays };
  });
}

export type PipelineCard = Awaited<ReturnType<typeof getPipelineCards>>[number];

// Propostas aceitas do lead (exigidas para marcar Ganho).
export async function getAcceptedProposals(expertId: string) {
  if (!isUuid(expertId)) return [];
  return queryAsUser((tx) =>
    tx
      .select({ id: proposals.id, planName: plans.name, total: proposals.total, acceptedAt: proposals.acceptedAt })
      .from(proposals)
      .innerJoin(plans, eq(plans.id, proposals.planId))
      .where(and(eq(proposals.expertId, expertId), eq(proposals.status, "accepted")))
      .orderBy(desc(proposals.acceptedAt)),
  );
}
