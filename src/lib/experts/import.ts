import { and, inArray, isNull, sql } from "drizzle-orm";
import type { Tx } from "@/db";
import { activities, expertTags, experts, niches, tags } from "@/db/schema";
import type { Platform } from "@/db/schema/enums";
import { IMPORT_FIELDS, type ImportRow } from "./import-fields";
import { findOrCreateNiches, findOrCreateTags, getInitialStage } from "./mutations";
import { normalizeForCompare, parsePlatform } from "./normalize";
import { importRowSchema, type ImportRowData } from "./validation";
import { computeScore } from "@/lib/score";
import { getScoreWeights } from "@/lib/settings";

// Importação de experts por CSV. A análise roda na prévia e de novo na hora
// de importar, então nada que vem do navegador é gravado sem validação.

type ReadyRow = { line: number; data: ImportRowData };

export type ImportAnalysis = {
  total: number;
  ready: ReadyRow[];
  duplicatesInDb: { line: number; handle: string; existingName: string }[];
  duplicatesInFile: { line: number; handle: string; firstLine: number }[];
  errors: { line: number; message: string }[];
  newNiches: string[];
  newTags: string[];
};

const FIELD_LABELS = Object.fromEntries(IMPORT_FIELDS.map((field) => [field.key, field.label]));

const rowKey = (platform: string, handle: string) => `${platform}:${handle.toLowerCase()}`;

export async function analyzeImport(
  tx: Tx,
  rows: ImportRow[],
  defaultPlatform: Platform,
): Promise<ImportAnalysis> {
  const errors: ImportAnalysis["errors"] = [];
  const valid: ReadyRow[] = [];

  // 1. Valida cada linha (linha 1 da planilha é o cabeçalho).
  rows.forEach((row, index) => {
    const line = index + 2;
    const values = Object.fromEntries(IMPORT_FIELDS.map(({ key }) => [key, row[key] ?? ""]));
    values.platform = parsePlatform(values.platform) ?? defaultPlatform;
    const result = importRowSchema.safeParse(values);
    if (result.success) {
      valid.push({ line, data: result.data });
    } else {
      const issue = result.error.issues[0];
      errors.push({ line, message: `${FIELD_LABELS[String(issue.path[0])] ?? "Linha"}: ${issue.message}` });
    }
  });

  // 2. Repetidos dentro da própria planilha (fica a primeira ocorrência).
  const firstLineByKey = new Map<string, number>();
  const duplicatesInFile: ImportAnalysis["duplicatesInFile"] = [];
  const unique: ReadyRow[] = [];
  for (const row of valid) {
    const key = rowKey(row.data.platform, row.data.handle);
    const firstLine = firstLineByKey.get(key);
    if (firstLine) {
      duplicatesInFile.push({ line: row.line, handle: row.data.handle, firstLine });
    } else {
      firstLineByKey.set(key, row.line);
      unique.push(row);
    }
  }

  // 3. Já cadastrados no sistema (mesmo @ e plataforma, sem os excluídos).
  const handles = [...new Set(unique.map((row) => row.data.handle.toLowerCase()))];
  const existing = handles.length
    ? await tx
        .select({ handle: experts.handle, platform: experts.platform, name: experts.name })
        .from(experts)
        .where(and(isNull(experts.deletedAt), inArray(sql`lower(${experts.handle})`, handles)))
    : [];
  const existingByKey = new Map(existing.map((row) => [rowKey(row.platform, row.handle), row.name]));

  const duplicatesInDb: ImportAnalysis["duplicatesInDb"] = [];
  const ready: ReadyRow[] = [];
  for (const row of unique) {
    const existingName = existingByKey.get(rowKey(row.data.platform, row.data.handle));
    if (existingName) duplicatesInDb.push({ line: row.line, handle: row.data.handle, existingName });
    else ready.push(row);
  }

  // 4. Nichos e tags que ainda não existem (serão criados).
  const [nicheRows, tagRows] = await Promise.all([
    tx.select({ name: niches.name }).from(niches),
    tx.select({ name: tags.name }).from(tags),
  ]);
  const newNames = (names: string[], existingNames: { name: string }[]) => {
    const known = new Set(existingNames.map((row) => normalizeForCompare(row.name)));
    const result = new Map<string, string>();
    for (const name of names) {
      const key = normalizeForCompare(name);
      if (key && !known.has(key) && !result.has(key)) result.set(key, name);
    }
    return [...result.values()];
  };

  return {
    total: rows.length,
    ready,
    duplicatesInDb,
    duplicatesInFile,
    errors,
    newNiches: newNames(
      ready.map((row) => row.data.niche ?? ""),
      nicheRows,
    ),
    newTags: newNames(
      ready.flatMap((row) => row.data.tags),
      tagRows,
    ),
  };
}

// Grava as linhas prontas da análise. Retorna quantos leads foram criados.
// "options" muda o registro na linha do tempo (a pesquisa IA usa o seu próprio).
export async function importAnalyzedRows(
  tx: Tx,
  analysis: ImportAnalysis,
  ownerId: string | null,
  userId: string,
  options: { activityDescription?: string; source?: string } = {},
) {
  if (!analysis.ready.length) return 0;

  const stage = await getInitialStage(tx);
  const weights = await getScoreWeights(tx);
  const nicheIds = await findOrCreateNiches(
    tx,
    analysis.ready.map((row) => row.data.niche ?? ""),
  );
  const tagIds = await findOrCreateTags(
    tx,
    analysis.ready.flatMap((row) => row.data.tags),
  );
  const tagsByKey = new Map(
    analysis.ready.map((row) => [rowKey(row.data.platform, row.data.handle), row.data.tags]),
  );

  let created = 0;
  for (let start = 0; start < analysis.ready.length; start += 200) {
    const chunk = analysis.ready.slice(start, start + 200);
    const inserted = await tx
      .insert(experts)
      .values(
        chunk.map(({ data: { niche, tags: _tags, ...fields } }) => ({
          ...fields,
          ...computeScore(fields, weights),
          nicheId: niche ? (nicheIds.get(normalizeForCompare(niche)) ?? null) : null,
          ownerId,
          stageId: stage.id,
        })),
      )
      // Se alguém cadastrou o mesmo @ entre a prévia e a importação, ignora.
      .onConflictDoNothing()
      .returning({ id: experts.id, handle: experts.handle, platform: experts.platform });
    if (!inserted.length) continue;

    const tagLinks = inserted.flatMap((expert) =>
      (tagsByKey.get(rowKey(expert.platform, expert.handle)) ?? [])
        .map((name) => tagIds.get(normalizeForCompare(name)))
        .filter((tagId): tagId is string => Boolean(tagId))
        .map((tagId) => ({ expertId: expert.id, tagId })),
    );
    if (tagLinks.length) await tx.insert(expertTags).values(tagLinks).onConflictDoNothing();

    await tx.insert(activities).values(
      inserted.map((expert) => ({
        expertId: expert.id,
        userId,
        type: "stage_change" as const,
        description: options.activityDescription ?? `Lead importado por planilha na etapa "${stage.name}".`,
        metadata: { fromStageId: null, toStageId: stage.id, source: options.source ?? "csv_import" },
      })),
    );
    created += inserted.length;
  }
  return created;
}
