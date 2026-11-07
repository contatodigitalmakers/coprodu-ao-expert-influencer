import type { ScoreWeights } from "@/db/schema/catalog";
import type { ScoreTier } from "@/db/schema/enums";

// Score de qualificação (ICP), seção 3.2 do escopo.
// Nota de 0 a 100 = soma dos pesos dos critérios atendidos:
// - sim/não: "sim" ganha o peso cheio; "não" ou não informado ganha 0;
// - engajamento: proporcional até ENGAGEMENT_FOR_FULL_POINTS (%), depois peso cheio.

export const ENGAGEMENT_FOR_FULL_POINTS = 5;

export const SCORE_CRITERIA: { key: keyof ScoreWeights; label: string }[] = [
  { key: "engagement", label: "Engajamento" },
  { key: "sellsProduct", label: "Já vende produto digital" },
  { key: "recurringProblem", label: "Problema recorrente" },
  { key: "hasMethod", label: "Método estruturado" },
  { key: "contentFrequency", label: "Frequência de conteúdo" },
];

export type ScoreInput = {
  engagementRate: number | null;
  sellsProduct: boolean | null;
  recurringProblem: boolean | null;
  hasMethod: boolean | null;
  contentFrequency: boolean | null;
};

export function scoreTierFor(score: number): ScoreTier {
  if (score >= 70) return "A";
  if (score >= 40) return "B";
  return "C";
}

export function computeScore(input: ScoreInput, weights: ScoreWeights) {
  const total = SCORE_CRITERIA.reduce((sum, { key }) => sum + weights[key], 0);
  if (total <= 0) return { score: 0, scoreTier: scoreTierFor(0) };

  const engagement =
    input.engagementRate === null ? 0 : Math.min(input.engagementRate / ENGAGEMENT_FOR_FULL_POINTS, 1);
  const points =
    weights.engagement * engagement +
    weights.sellsProduct * (input.sellsProduct ? 1 : 0) +
    weights.recurringProblem * (input.recurringProblem ? 1 : 0) +
    weights.hasMethod * (input.hasMethod ? 1 : 0) +
    weights.contentFrequency * (input.contentFrequency ? 1 : 0);

  // Pesos somam 100; a divisão só protege contra pesos fora do padrão.
  const score = Math.round((points / total) * 100);
  return { score, scoreTier: scoreTierFor(score) };
}
