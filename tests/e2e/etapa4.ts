// Testes de tela da Etapa 4 (score e tela de pesos).
// Uso: npx tsx --env-file=.env.local tests/e2e/etapa4.ts
import type { Page } from "playwright-core";
import { createRunner, expect, login, open } from "./helpers";

async function setWeights(page: Page, weights: number[]) {
  await open(page, "/configuracoes");
  const labels = ["Engajamento", "Já vende produto digital", "Problema recorrente", "Método estruturado", "Frequência de conteúdo"];
  for (const [index, label] of labels.entries()) {
    await page.getByLabel(label, { exact: true }).filter({ visible: true }).fill(String(weights[index]));
  }
  await page.getByRole("button", { name: "Salvar pesos" }).filter({ visible: true }).click();
}

async function main() {
  const { start, step, report } = createRunner("etapa4");
  const { browser, page } = await start();
  let expertUrl = "";

  try {
    await login(page);

    await step(page, "Cadastro calcula o score (100, A)", async () => {
      await open(page, "/experts/novo");
      await page.getByLabel("Nome *", { exact: true }).fill("Score Cheio E2E");
      await page.getByLabel("@ principal *", { exact: true }).fill("score.cheio.e2e");
      await page.getByLabel("Engajamento (%)", { exact: true }).fill("6");
      for (const group of await page.getByRole("radiogroup").all()) {
        await group.getByRole("radio", { name: "Sim" }).click();
      }
      await page.getByRole("button", { name: "Cadastrar expert" }).click();
      await page.waitForURL(/\/experts\/[0-9a-f-]{36}$/);
      await page.waitForLoadState("networkidle");
      expertUrl = page.url();
      await page.getByText("A 100").filter({ visible: true }).waitFor();
    });

    await step(page, "Edição recalcula o score (só engajamento 3% → 18, C)", async () => {
      await open(page, `${expertUrl}/editar`);
      await page.getByLabel("Engajamento (%)", { exact: true }).fill("3");
      for (const group of await page.getByRole("radiogroup").all()) {
        await group.getByRole("radio", { name: "Não", exact: true }).click();
      }
      await page.getByRole("button", { name: "Salvar alterações" }).click();
      await page.waitForURL(expertUrl);
      await page.waitForLoadState("networkidle");
      await page.getByText("C 18").filter({ visible: true }).waitFor();
    });

    await step(page, "Score aparece na lista e no filtro", async () => {
      await open(page, "/experts?score=C");
      await page.getByRole("link", { name: "Score Cheio E2E" }).filter({ visible: true }).waitFor();
      await open(page, "/experts?score=A");
      await page.getByText("Nenhum expert encontrado com esses filtros.").filter({ visible: true }).waitFor();
    });

    await step(page, "Pesos que não somam 100 são recusados", async () => {
      await setWeights(page, [30, 25, 20, 15, 5]);
      await page.getByText("Os pesos precisam somar 100 (hoje somam 95).").filter({ visible: true }).waitFor();
    });

    await step(page, "Pesos novos recalculam os leads (engajamento 100 → 60, B)", async () => {
      await setWeights(page, [100, 0, 0, 0, 0]);
      await page.getByText(/Pesos salvos\. Score recalculado em \d+ lead/).filter({ visible: true }).waitFor();
      await open(page, expertUrl);
      await page.getByText("B 60").filter({ visible: true }).waitFor();
    });

    await step(page, "Pesos padrão restaurados", async () => {
      await setWeights(page, [30, 25, 20, 15, 10]);
      await page.getByText(/Pesos salvos/).filter({ visible: true }).waitFor();
      await open(page, expertUrl);
      const text = await page.getByText("C 18").filter({ visible: true }).count();
      expect(text > 0, "score deveria voltar a 18");
    });
  } finally {
    await browser.close();
  }
  process.exit(report() ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
