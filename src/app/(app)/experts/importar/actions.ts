"use server";

import { z } from "zod";
import { platform } from "@/db/schema/enums";
import { getCurrentUser, queryAsUser } from "@/lib/auth";
import { analyzeImport, importAnalyzedRows, type ImportAnalysis } from "@/lib/experts/import";
import { IMPORT_MAX_ROWS } from "@/lib/experts/import-fields";

const inputSchema = z.object({
  rows: z
    .array(z.record(z.string(), z.string().max(5000)))
    .min(1, "A planilha está vazia.")
    .max(IMPORT_MAX_ROWS, `A planilha pode ter no máximo ${IMPORT_MAX_ROWS} linhas.`),
  defaultPlatform: z.enum(platform.enumValues),
  ownerId: z.uuid().nullable().optional(),
});

type ImportInput = z.input<typeof inputSchema>;

// Até 100 itens de cada lista vão para a tela (o total vem nos contadores).
const LIST_LIMIT = 100;

function toSummary(analysis: ImportAnalysis) {
  return {
    total: analysis.total,
    readyCount: analysis.ready.length,
    duplicatesInDbCount: analysis.duplicatesInDb.length,
    duplicatesInFileCount: analysis.duplicatesInFile.length,
    errorCount: analysis.errors.length,
    duplicatesInDb: analysis.duplicatesInDb.slice(0, LIST_LIMIT),
    duplicatesInFile: analysis.duplicatesInFile.slice(0, LIST_LIMIT),
    errors: analysis.errors.slice(0, LIST_LIMIT),
    newNiches: analysis.newNiches,
    newTags: analysis.newTags,
  };
}

export type ImportSummary = ReturnType<typeof toSummary>;

export type ImportResponse<T> = { ok: true; data: T } | { ok: false; error: string };

function parseInput(input: ImportInput) {
  const parsed = inputSchema.safeParse(input);
  return parsed.success
    ? ({ ok: true, data: parsed.data } as const)
    : ({ ok: false, error: parsed.error.issues[0].message } as const);
}

// Prévia: valida a planilha sem gravar nada.
export async function previewImport(input: ImportInput): Promise<ImportResponse<ImportSummary>> {
  await getCurrentUser();
  const parsed = parseInput(input);
  if (!parsed.ok) return parsed;

  const analysis = await queryAsUser((tx) =>
    analyzeImport(tx, parsed.data.rows, parsed.data.defaultPlatform),
  );
  return { ok: true, data: toSummary(analysis) };
}

// Importação: refaz a análise e grava os leads válidos numa única transação.
export async function runImport(
  input: ImportInput,
): Promise<ImportResponse<{ created: number; skipped: number; errorCount: number }>> {
  const user = await getCurrentUser();
  const parsed = parseInput(input);
  if (!parsed.ok) return parsed;

  const result = await queryAsUser(async (tx) => {
    const analysis = await analyzeImport(tx, parsed.data.rows, parsed.data.defaultPlatform);
    const created = await importAnalyzedRows(tx, analysis, parsed.data.ownerId ?? null, user.id);
    const valid = analysis.total - analysis.errors.length;
    return { created, skipped: valid - created, errorCount: analysis.errors.length };
  });
  return { ok: true, data: result };
}
