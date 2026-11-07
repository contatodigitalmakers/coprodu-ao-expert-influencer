import { isNull, sql } from "drizzle-orm";
import type { Tx } from "@/db";
import { experts, settings } from "@/db/schema";
import type { ScoreWeights } from "@/db/schema/catalog";
import { computeScore } from "./score";

// Configurações gerais (tabela settings, linha única).

export async function getSettings(tx: Tx) {
  const [row] = await tx.select().from(settings).limit(1);
  if (!row) throw new Error("Configurações não encontradas (tabela settings vazia).");
  return row;
}

export async function getScoreWeights(tx: Tx): Promise<ScoreWeights> {
  return (await getSettings(tx)).scoreWeights;
}

// Recalcula o score de todos os leads (usado quando os pesos mudam).
export async function recalculateAllScores(tx: Tx, weights: ScoreWeights) {
  const rows = await tx
    .select({
      id: experts.id,
      engagementRate: experts.engagementRate,
      sellsProduct: experts.sellsProduct,
      recurringProblem: experts.recurringProblem,
      hasMethod: experts.hasMethod,
      contentFrequency: experts.contentFrequency,
    })
    .from(experts)
    .where(isNull(experts.deletedAt));

  for (let start = 0; start < rows.length; start += 500) {
    const values = rows.slice(start, start + 500).map((row) => {
      const { score, scoreTier } = computeScore(row, weights);
      return sql`(${row.id}::uuid, ${score}::int, ${scoreTier}::score_tier)`;
    });
    await tx.execute(sql`
      update ${experts} as e
      set score = v.score, score_tier = v.tier
      from (values ${sql.join(values, sql`, `)}) as v(id, score, tier)
      where e.id = v.id`);
  }
  return rows.length;
}
