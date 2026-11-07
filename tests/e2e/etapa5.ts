// Testes de tela da Etapa 5 (pipeline).
// Uso: npx tsx --env-file=.env.local tests/e2e/etapa5.ts
import type { Page } from "playwright-core";
import postgres from "postgres";
import { choose, createRunner, expect, login, open } from "./helpers";

const visible = { visible: true } as const;

// Arrasta o card até a coluna. Em etapas comuns, espera a resposta da ação do
// servidor (Perdido e Ganho abrem um diálogo antes).
async function drag(page: Page, cardName: string, stageName: string, waitForSave = true) {
  const card = page.getByLabel(`Lead ${cardName}`, { exact: true }).filter(visible);
  const column = page.getByRole("region", { name: `Etapa ${stageName}`, exact: true });
  await card.scrollIntoViewIfNeeded();
  const from = (await card.boundingBox())!;
  const to = (await column.boundingBox())!;
  // Segura pela parte de baixo do card (fora do link do nome).
  await page.mouse.move(from.x + from.width / 2, from.y + from.height - 10);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 15, from.y + from.height, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + 90, { steps: 25 });
  const saved = waitForSave
    ? page.waitForResponse((response) => response.request().method() === "POST" && response.url().includes("/pipeline"))
    : null;
  await page.mouse.up();
  await saved;
}

const inColumn = (page: Page, stageName: string, cardName: string) =>
  page
    .getByRole("region", { name: `Etapa ${stageName}`, exact: true })
    .getByLabel(`Lead ${cardName}`, { exact: true });

async function main() {
  const sql = postgres(process.env.DATABASE_URL_MIGRATIONS!, { max: 1, onnotice: () => {} });
  const [stageNew] = await sql`select id from public.stages where key = 'new'`;
  const [stageReplied] = await sql`select id from public.stages where key = 'replied'`;
  const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);
  // Todas as linhas com as mesmas colunas (o postgres usa as colunas da primeira).
  await sql`insert into public.experts ${sql([
    { name: "Kanban A E2E", handle: "e2e.kanban.a", platform: "instagram", stage_id: stageNew.id, stage_entered_at: new Date() },
    { name: "Kanban B E2E", handle: "e2e.kanban.b", platform: "instagram", stage_id: stageNew.id, stage_entered_at: new Date() },
    { name: "Kanban C E2E", handle: "e2e.kanban.c", platform: "instagram", stage_id: stageNew.id, stage_entered_at: new Date() },
    { name: "Parado D E2E", handle: "e2e.parado.d", platform: "instagram", stage_id: stageReplied.id, stage_entered_at: daysAgo(10) },
  ])}`;

  const { start, step, report } = createRunner("etapa5");
  const { browser, page } = await start({ viewport: { width: 3300, height: 1000 } });

  try {
    await login(page);

    await step(page, "Kanban mostra as 10 etapas e os cards", async () => {
      await open(page, "/pipeline");
      expect((await page.getByRole("region", { name: /^Etapa / }).count()) === 10, "deveria haver 10 colunas");
      await inColumn(page, "Novo lead", "Kanban A E2E").waitFor();
    });

    await step(page, "Alerta de lead parado além do limite", async () => {
      const card = inColumn(page, "Respondeu", "Parado D E2E");
      await card.getByText("10 dias").waitFor();
      const header = await page.getByRole("region", { name: "Etapa Respondeu", exact: true }).locator("header").innerText();
      expect(header.includes("1 parado(s)"), `cabeçalho: ${header}`);
    });

    await step(page, "Arrastar para Respondeu muda a etapa e registra", async () => {
      await drag(page, "Kanban A E2E", "Respondeu");
      await inColumn(page, "Respondeu", "Kanban A E2E").waitFor();
      await open(page, "/pipeline"); // recarrega: a mudança ficou gravada
      await inColumn(page, "Respondeu", "Kanban A E2E").waitFor();
    });

    await step(page, "Perdido exige motivo", async () => {
      await drag(page, "Kanban B E2E", "Perdido", false);
      const dialog = page.getByRole("dialog");
      await dialog.getByText("Mover Kanban B E2E para Perdido").waitFor();
      await dialog.getByRole("button", { name: "Mover para Perdido" }).click();
      await dialog.getByText("Escolha o motivo da perda.").waitFor();
      await choose(page, "Motivo da perda", "Sem interesse");
      await dialog.getByRole("button", { name: "Mover para Perdido" }).click();
      await inColumn(page, "Perdido", "Kanban B E2E").waitFor();
    });

    await step(page, "Ganho sem proposta aceita é bloqueado", async () => {
      await drag(page, "Kanban C E2E", "Ganho", false);
      const dialog = page.getByRole("dialog");
      await dialog.getByText("Este lead não tem proposta aceita.", { exact: false }).waitFor();
      expect(await dialog.getByRole("button", { name: "Confirmar Ganho" }).isDisabled(), "botão deveria estar desabilitado");
      await dialog.getByRole("button", { name: "Cancelar" }).click();
      await inColumn(page, "Novo lead", "Kanban C E2E").waitFor();
    });

    await step(page, "Visão em lista move de etapa", async () => {
      await open(page, "/pipeline?visao=lista");
      await choose(page, "Mover Kanban A E2E", "Qualificado");
      const row = page.getByRole("row").filter({ hasText: "Kanban A E2E" }).filter(visible);
      await row.getByRole("cell", { name: "Qualificado", exact: true }).waitFor();
    });

    await step(page, "Ficha: reativar lead perdido e linha do tempo", async () => {
      await open(page, "/experts?busca=e2e.kanban.b");
      await page.getByRole("link", { name: "Kanban B E2E" }).filter(visible).click();
      await page.waitForURL(/\/experts\/[0-9a-f-]{36}$/);
      await page.waitForLoadState("networkidle");
      await page.getByText('Etapa alterada de "Novo lead" para "Perdido". Motivo: Sem interesse.').filter(visible).waitFor();
      await choose(page, "Mover etapa", "Novo lead");
      await page.getByText('Lead reativado: de "Perdido" para "Novo lead".').filter(visible).waitFor();
    });

    await step(page, "Configurações: renomear etapa, limite e adicionar etapa", async () => {
      await open(page, "/configuracoes");
      await page.getByLabel("Nome da etapa 4", { exact: true }).fill("Qualificado E2E");
      await page.getByLabel("Limite de dias da etapa Qualificado E2E", { exact: true }).fill("5");
      await page.getByRole("button", { name: "Adicionar etapa" }).click();
      await page.getByLabel("Nome da etapa 9", { exact: true }).fill("Contrato E2E");
      await page.getByRole("button", { name: "Salvar etapas" }).click();
      await page.getByText("Etapas salvas.").filter(visible).waitFor();
      await open(page, "/pipeline");
      await page.getByRole("region", { name: "Etapa Qualificado E2E", exact: true }).waitFor();
      await page.getByRole("region", { name: "Etapa Contrato E2E", exact: true }).waitFor();
    });

    await step(page, "Configurações: etapa do sistema não pode ser removida e etapa vazia sim", async () => {
      await open(page, "/configuracoes");
      expect(await page.getByRole("button", { name: "Remover etapa Ganho" }).isDisabled(), "Ganho não deveria ser removível");
      await page.getByRole("button", { name: "Remover etapa Contrato E2E" }).click();
      await page.getByLabel("Nome da etapa 4", { exact: true }).fill("Qualificado");
      await page.getByLabel("Limite de dias da etapa Qualificado", { exact: true }).fill("3");
      await page.getByRole("button", { name: "Salvar etapas" }).click();
      await page.getByText("Etapas salvas.").filter(visible).waitFor();
      const [{ count }] = await sql`select count(*)::int as count from public.stages`;
      expect(count === 10, `deveria voltar a 10 etapas (tem ${count})`);
    });
  } finally {
    await browser.close();
    await sql.end();
  }
  process.exit(report() ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
