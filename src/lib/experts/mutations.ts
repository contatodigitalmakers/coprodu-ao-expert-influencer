import { and, asc, eq } from "drizzle-orm";
import type { Tx } from "@/db";
import { expertTags, niches, stages, tags } from "@/db/schema";
import { normalizeForCompare } from "./normalize";

// Funções de gravação usadas pelas Server Actions de experts.
// Sempre recebem a transação aberta por queryAsUser().

// Etapa inicial do pipeline ("Novo lead"): a primeira na ordem que não é Ganho/Perdido.
export async function getInitialStage(tx: Tx) {
  const [stage] = await tx
    .select({ id: stages.id, name: stages.name })
    .from(stages)
    .where(and(eq(stages.isWon, false), eq(stages.isLost, false)))
    .orderBy(asc(stages.order))
    .limit(1);
  if (!stage) throw new Error("Nenhuma etapa cadastrada no pipeline.");
  return stage;
}

// Mapa nome normalizado → id. Compara sem diferenciar maiúsculas e acentos,
// então "Nutricao" encontra "Nutrição".
type NameMap = Map<string, string>;

function uniqueNames(names: string[]) {
  const seen = new Map<string, string>();
  for (const name of names) {
    const key = normalizeForCompare(name);
    if (key && !seen.has(key)) seen.set(key, name.trim());
  }
  return seen;
}

export async function findOrCreateTags(tx: Tx, names: string[]): Promise<NameMap> {
  const wanted = uniqueNames(names);
  const map: NameMap = new Map();
  if (!wanted.size) return map;

  const existing = await tx.select({ id: tags.id, name: tags.name }).from(tags);
  for (const row of existing) map.set(normalizeForCompare(row.name), row.id);

  const missing = [...wanted].filter(([key]) => !map.has(key)).map(([, name]) => ({ name }));
  if (missing.length) {
    const created = await tx.insert(tags).values(missing).returning({ id: tags.id, name: tags.name });
    for (const row of created) map.set(normalizeForCompare(row.name), row.id);
  }
  return map;
}

export async function findOrCreateNiches(tx: Tx, names: string[]): Promise<NameMap> {
  const wanted = uniqueNames(names);
  const map: NameMap = new Map();
  if (!wanted.size) return map;

  const existing = await tx.select({ id: niches.id, name: niches.name }).from(niches);
  for (const row of existing) map.set(normalizeForCompare(row.name), row.id);

  const missing = [...wanted].filter(([key]) => !map.has(key)).map(([, name]) => ({ name }));
  if (missing.length) {
    const created = await tx.insert(niches).values(missing).returning({ id: niches.id, name: niches.name });
    for (const row of created) map.set(normalizeForCompare(row.name), row.id);
  }
  return map;
}

// Substitui as tags do expert pelas informadas (criando as que não existem).
export async function replaceExpertTags(tx: Tx, expertId: string, names: string[]) {
  const tagIds = await findOrCreateTags(tx, names);
  await tx.delete(expertTags).where(eq(expertTags.expertId, expertId));
  const ids = [...new Set(names.map((name) => tagIds.get(normalizeForCompare(name))))].filter(
    (id): id is string => Boolean(id),
  );
  if (ids.length) {
    await tx.insert(expertTags).values(ids.map((tagId) => ({ expertId, tagId })));
  }
}
