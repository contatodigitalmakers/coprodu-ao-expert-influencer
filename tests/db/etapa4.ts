// Testes da Etapa 4 (score). Banco real, tudo desfeito no final.
// Uso: npx tsx --env-file=.env.local tests/db/etapa4.ts
import { eq } from "drizzle-orm";
import { runAsUser } from "@/db";
import { experts, settings, users } from "@/db/schema";
import { getInitialStage } from "@/lib/experts/mutations";
import { computeScore, type ScoreInput } from "@/lib/score";
import { getScoreWeights, recalculateAllScores } from "@/lib/settings";

const DEFAULT = { engagement: 30, sellsProduct: 25, recurringProblem: 20, hasMethod: 15, contentFrequency: 10 };
const sameWeights = (a: Record<string, number>, b: Record<string, number>) =>
  Object.keys(b).length === Object.keys(a).length && Object.entries(b).every(([key, value]) => a[key] === value);
const none: ScoreInput = { engagementRate: null, sellsProduct: null, recurringProblem: null, hasMethod: null, contentFrequency: null };

async function main() {
  const results: { name: string; pass: boolean; detail: string }[] = [];
  const check = (name: string, pass: boolean, detail = "") => results.push({ name, pass, detail });

  const cases: [string, ScoreInput, number, string][] = [
    ["Tudo sim e 5% de engajamento", { engagementRate: 5, sellsProduct: true, recurringProblem: true, hasMethod: true, contentFrequency: true }, 100, "A"],
    ["Nada informado", none, 0, "C"],
    ["2,5% de engajamento + vende produto", { ...none, engagementRate: 2.5, sellsProduct: true }, 40, "B"],
    ["Engajamento acima de 5% tem teto", { ...none, engagementRate: 12, hasMethod: true, contentFrequency: true }, 55, "B"],
    ["Recorrente + método + frequência", { ...none, recurringProblem: true, hasMethod: true, contentFrequency: true }, 45, "B"],
    ["Os mesmos + vende produto = 70 (A)", { ...none, sellsProduct: true, recurringProblem: true, hasMethod: true, contentFrequency: true }, 70, "A"],
    ["39 pontos é C", { ...none, engagementRate: 2.33, sellsProduct: true }, 39, "C"],
    ["\"Não\" vale 0", { ...none, sellsProduct: false, hasMethod: false }, 0, "C"],
  ];
  for (const [name, input, score, tier] of cases) {
    const got = computeScore(input, DEFAULT);
    check(`${name} → ${score} (${tier})`, got.score === score && got.scoreTier === tier, `obtido ${got.score} (${got.scoreTier})`);
  }
  check("Pesos zerados não quebram", computeScore(none, { ...DEFAULT, engagement: 0, sellsProduct: 0, recurringProblem: 0, hasMethod: 0, contentFrequency: 0 }).score === 0);

  class Rollback extends Error {}
  const fake = { sub: "00000000-0000-0000-0000-000000000000", role: "authenticated" } as never;
  const [user] = await runAsUser(fake, (tx) => tx.select({ id: users.id }).from(users).limit(1));
  const claims = { sub: user.id, role: "authenticated" } as never;

  try {
    await runAsUser(claims, async (tx) => {
      const weights = await getScoreWeights(tx);
      check("Pesos padrão no banco (30/25/20/15/10)", sameWeights(weights, DEFAULT), JSON.stringify(weights));

      const stage = await getInitialStage(tx);
      const [expert] = await tx
        .insert(experts)
        .values({ name: "Score E2E", handle: "score.e2e", platform: "instagram", stageId: stage.id, sellsProduct: true, engagementRate: 5 })
        .returning({ id: experts.id });

      // Pesos novos: só "vende produto" conta.
      const onlyProduct = { engagement: 0, sellsProduct: 100, recurringProblem: 0, hasMethod: 0, contentFrequency: 0 };
      await tx.update(settings).set({ scoreWeights: onlyProduct });
      const count = await recalculateAllScores(tx, onlyProduct);
      const [after] = await tx.select({ score: experts.score, tier: experts.scoreTier }).from(experts).where(eq(experts.id, expert.id));
      check("Recálculo aplica os pesos novos (100, A)", after.score === 100 && after.tier === "A", JSON.stringify(after));
      check("Recálculo percorre os leads", count >= 1, `${count}`);

      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }

  const restored = await runAsUser(claims, (tx) => getScoreWeights(tx));
  check("Pesos voltaram ao padrão (rollback)", sameWeights(restored, DEFAULT));

  for (const r of results) console.log(`${r.pass ? "OK     " : "FALHOU "} ${r.name}${r.detail && !r.pass ? `  (${r.detail})` : ""}`);
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} testes passaram`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
