import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { cache } from "react";
import type { Tx } from "@/db";
import { activities, expertTags, experts, lossReasons, niches, stages, tags, users } from "@/db/schema";
import type { Platform } from "@/db/schema/enums";
import { queryAsUser } from "@/lib/auth";
import { FOLLOWER_RANGES, OWNER_ME, OWNER_NONE, type ExpertFilters } from "./filters";
import { isUuid } from "./normalize";

// Leituras de experts. Todas passam por queryAsUser() (RLS ativa).

export const PAGE_SIZE = 50;

export type TagItem = { id: string; name: string; color: string };

// Tags de vários experts de uma vez: id do expert → tags.
async function getTagsByExpert(tx: Tx, expertIds: string[]) {
  const map = new Map<string, TagItem[]>();
  if (!expertIds.length) return map;
  const rows = await tx
    .select({ expertId: expertTags.expertId, id: tags.id, name: tags.name, color: tags.color })
    .from(expertTags)
    .innerJoin(tags, eq(tags.id, expertTags.tagId))
    .where(inArray(expertTags.expertId, expertIds))
    .orderBy(asc(tags.name));
  for (const { expertId, ...tag } of rows) {
    map.set(expertId, [...(map.get(expertId) ?? []), tag]);
  }
  return map;
}

// Escapa % e _ para a busca com ilike tratar como texto comum.
function likePattern(text: string) {
  return `%${text.replace(/[\\%_]/g, "\\$&")}%`;
}

function filterConditions(filters: ExpertFilters, currentUserId: string) {
  const conditions: (SQL | undefined)[] = [isNull(experts.deletedAt)];

  if (filters.search) {
    const pattern = likePattern(filters.search.replace(/^@/, ""));
    conditions.push(or(ilike(experts.name, pattern), ilike(experts.handle, pattern)));
  }
  if (filters.nicheId) conditions.push(eq(experts.nicheId, filters.nicheId));
  if (filters.stageId) conditions.push(eq(experts.stageId, filters.stageId));
  if (filters.owner === OWNER_ME) conditions.push(eq(experts.ownerId, currentUserId));
  else if (filters.owner === OWNER_NONE) conditions.push(isNull(experts.ownerId));
  else if (filters.owner) conditions.push(eq(experts.ownerId, filters.owner));
  if (filters.tier) conditions.push(eq(experts.scoreTier, filters.tier));
  if (filters.followers) {
    const range = FOLLOWER_RANGES[filters.followers];
    conditions.push(gte(experts.followers, range.min));
    if (range.max !== null) conditions.push(lt(experts.followers, range.max));
  }
  return conditions;
}

export async function listExperts(filters: ExpertFilters, currentUserId: string) {
  return queryAsUser(async (tx) => {
    const conditions = filterConditions(filters, currentUserId);
    if (filters.tagId) {
      conditions.push(
        exists(
          tx
            .select({ id: expertTags.id })
            .from(expertTags)
            .where(and(eq(expertTags.expertId, experts.id), eq(expertTags.tagId, filters.tagId))),
        ),
      );
    }
    const where = and(...conditions);

    const [{ total }] = await tx.select({ total: count() }).from(experts).where(where);
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(filters.page, pageCount);

    const rows = await tx
      .select({
        id: experts.id,
        name: experts.name,
        handle: experts.handle,
        platform: experts.platform,
        followers: experts.followers,
        score: experts.score,
        scoreTier: experts.scoreTier,
        nicheName: niches.name,
        stageName: stages.name,
        ownerName: users.name,
      })
      .from(experts)
      .innerJoin(stages, eq(stages.id, experts.stageId))
      .leftJoin(niches, eq(niches.id, experts.nicheId))
      .leftJoin(users, eq(users.id, experts.ownerId))
      .where(where)
      .orderBy(desc(experts.createdAt), desc(experts.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE);

    const tagsByExpert = await getTagsByExpert(
      tx,
      rows.map((row) => row.id),
    );

    return {
      rows: rows.map((row) => ({ ...row, tags: tagsByExpert.get(row.id) ?? [] })),
      total,
      page,
      pageCount,
    };
  });
}

export type ExpertListRow = Awaited<ReturnType<typeof listExperts>>["rows"][number];

// Ficha do expert. null se não existe ou foi excluído.
export async function getExpert(id: string) {
  if (!isUuid(id)) return null;
  return queryAsUser(async (tx) => {
    const [row] = await tx
      .select({
        expert: experts,
        nicheName: niches.name,
        stageName: stages.name,
        ownerName: users.name,
        lossReasonName: lossReasons.name,
      })
      .from(experts)
      .innerJoin(stages, eq(stages.id, experts.stageId))
      .leftJoin(niches, eq(niches.id, experts.nicheId))
      .leftJoin(users, eq(users.id, experts.ownerId))
      .leftJoin(lossReasons, eq(lossReasons.id, experts.lossReasonId))
      .where(and(eq(experts.id, id), isNull(experts.deletedAt)));
    if (!row) return null;

    const tagsByExpert = await getTagsByExpert(tx, [id]);
    return {
      ...row.expert,
      nicheName: row.nicheName,
      stageName: row.stageName,
      ownerName: row.ownerName,
      lossReasonName: row.lossReasonName,
      tags: tagsByExpert.get(id) ?? [],
    };
  });
}

export type ExpertDetail = NonNullable<Awaited<ReturnType<typeof getExpert>>>;

// Linha do tempo do expert, do mais recente para o mais antigo.
export async function getTimeline(expertId: string) {
  if (!isUuid(expertId)) return [];
  return queryAsUser((tx) =>
    tx
      .select({
        id: activities.id,
        type: activities.type,
        description: activities.description,
        createdAt: activities.createdAt,
        userName: users.name,
      })
      .from(activities)
      .leftJoin(users, eq(users.id, activities.userId))
      .where(eq(activities.expertId, expertId))
      .orderBy(desc(activities.createdAt), desc(activities.id)),
  );
}

export type TimelineItem = Awaited<ReturnType<typeof getTimeline>>[number];

// Opções dos campos de seleção (formulário e filtros).
export const getFormOptions = cache(async () =>
  queryAsUser(async (tx) => {
    const [nicheRows, stageRows, userRows, tagRows] = await Promise.all([
      tx
        .select({ id: niches.id, name: niches.name })
        .from(niches)
        .where(eq(niches.active, true))
        .orderBy(asc(niches.name)),
      tx.select({ id: stages.id, name: stages.name }).from(stages).orderBy(asc(stages.order)),
      tx
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.active, true))
        .orderBy(asc(users.name)),
      tx.select({ id: tags.id, name: tags.name, color: tags.color }).from(tags).orderBy(asc(tags.name)),
    ]);
    return { niches: nicheRows, stages: stageRows, users: userRows, tags: tagRows };
  }),
);

export type FormOptions = Awaited<ReturnType<typeof getFormOptions>>;

// Lead já cadastrado com o mesmo @ na mesma plataforma (ignora o próprio na edição).
export async function findDuplicate(handle: string, platform: Platform, excludeId: string | null) {
  if (!handle) return null;
  return queryAsUser(async (tx) => {
    const [row] = await tx
      .select({ id: experts.id, name: experts.name })
      .from(experts)
      .where(
        and(
          eq(experts.platform, platform),
          eq(sql`lower(${experts.handle})`, handle.toLowerCase()),
          isNull(experts.deletedAt),
          excludeId ? ne(experts.id, excludeId) : undefined,
        ),
      )
      .limit(1);
    return row ?? null;
  });
}
