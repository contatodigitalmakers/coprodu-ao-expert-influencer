"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { settings } from "@/db/schema";
import type { ScoreWeights } from "@/db/schema/catalog";
import { queryAsUser, requireAdmin } from "@/lib/auth";
import { SCORE_CRITERIA } from "@/lib/score";
import { recalculateAllScores } from "@/lib/settings";

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
