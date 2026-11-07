"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { settings, stages, users } from "@/db/schema";
import type { ScoreWeights } from "@/db/schema/catalog";
import { queryAsUser, requireAdmin } from "@/lib/auth";
import { SCORE_CRITERIA } from "@/lib/score";
import { getStagesWithCounts, recalculateAllScores } from "@/lib/settings";

export type SettingsFormState = {
  error?: string;
  message?: string;
  savedAt?: number;
};

const weight = z.coerce
  .number("Use números.")
  .int("Use números inteiros.")
  .min(0, "Peso mínimo é 0.")
  .max(100, "Peso máximo é 100.");

const weightsSchema = z.object({
  engagement: weight,
  sellsProduct: weight,
  recurringProblem: weight,
  hasMethod: weight,
  contentFrequency: weight,
});

// Pesos do score (seção 3.2). Ao salvar, recalcula o score de todos os leads.
export async function saveScoreWeights(_prev: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  await requireAdmin();
  const parsed = weightsSchema.safeParse(
    Object.fromEntries(SCORE_CRITERIA.map(({ key }) => [key, formData.get(key) ?? ""])),
  );
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const weights: ScoreWeights = parsed.data;
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (total !== 100) return { error: `Os pesos precisam somar 100 (hoje somam ${total}).` };

  const count = await queryAsUser(async (tx) => {
    await tx.update(settings).set({ scoreWeights: weights });
    return recalculateAllScores(tx, weights);
  });
  refresh();
  return { message: `Pesos salvos. Score recalculado em ${count} lead(s).`, savedAt: Date.now() };
}

const stageRowSchema = z.object({
  id: z.uuid().nullable(),
  name: z.string().trim().min(1, "Toda etapa precisa de nome.").max(60, "Nome de etapa muito longo."),
  maxDays: z
    .string()
    .trim()
    .transform((value) => (value ? Number(value) : null))
    .refine((value) => value === null || (Number.isInteger(value) && value >= 1 && value <= 365), "Limite de dias deve ser de 1 a 365."),
});

const stagesSchema = z.array(stageRowSchema).min(2).max(30);

// Etapas do pipeline (seção 3.3): nome, limite de dias, ordem, novas e removidas.
// Etapas do sistema (com key) e etapas com leads não podem ser removidas.
export async function saveStages(rows: z.input<typeof stagesSchema>): Promise<SettingsFormState> {
  await requireAdmin();
  const parsed = stagesSchema.safeParse(rows);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const names = parsed.data.map((row) => row.name.toLowerCase());
  if (new Set(names).size !== names.length) return { error: "Há duas etapas com o mesmo nome." };

  // Erros lançados aqui desfazem a transação inteira (nada é salvo pela metade).
  class StageError extends Error {}
  try {
    await queryAsUser(async (tx) => {
      const existing = await getStagesWithCounts(tx);
      const keptIds = new Set(parsed.data.map((row) => row.id).filter(Boolean));
      for (const stage of existing.filter((item) => !keptIds.has(item.id))) {
        if (stage.key) throw new StageError(`A etapa “${stage.name}” é usada pelo sistema e não pode ser removida.`);
        if (stage.leadCount > 0) throw new StageError(`A etapa “${stage.name}” tem leads. Mova-os antes de remover.`);
        await tx.delete(stages).where(eq(stages.id, stage.id));
      }
      for (const [index, row] of parsed.data.entries()) {
        const values = { name: row.name, maxDays: row.maxDays, order: index + 1 };
        if (row.id) await tx.update(stages).set(values).where(eq(stages.id, row.id));
        else await tx.insert(stages).values(values);
      }
    });
  } catch (error) {
    if (error instanceof StageError) return { error: error.message };
    throw error;
  }
  refresh();
  return { message: "Etapas salvas.", savedAt: Date.now() };
}

const goalsSchema = z.array(
  z.object({
    id: z.uuid(),
    dailyGoal: z
      .string()
      .trim()
      .transform((value) => (value ? Number(value) : null))
      .refine((value) => value === null || (Number.isInteger(value) && value >= 1 && value <= 500), "A meta deve ser de 1 a 500 toques."),
  }),
);

// Meta diária de toques por usuário (seção 3.5). Vazio = padrão (40).
export async function saveDailyGoals(rows: z.input<typeof goalsSchema>): Promise<SettingsFormState> {
  await requireAdmin();
  const parsed = goalsSchema.safeParse(rows);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await queryAsUser(async (tx) => {
    for (const row of parsed.data) {
      await tx.update(users).set({ dailyGoal: row.dailyGoal }).where(eq(users.id, row.id));
    }
  });
  refresh();
  return { message: "Metas salvas.", savedAt: Date.now() };
}
