// Testes de tela da Etapa 6 (templates).
// Uso: npx tsx --env-file=.env.local tests/e2e/etapa6.ts
import { choose, createRunner, expect, login, open } from "./helpers";

const visible = { visible: true } as const;

async function main() {
  const { start, step, report } = createRunner("etapa6");
  const { browser, page } = await start();

  try {
    await login(page);

    await step(page, "Biblioteca mostra os 9 templates iniciais por categoria", async () => {
      await open(page, "/templates");
      for (const group of ["Abordagem", "Follow-up", "Quebra de objeção", "Convite para diagnóstico", "Encerramento", "Script / roteiro"]) {
        await page.getByRole("region", { name: group, exact: true }).waitFor();
      }
      await page.getByRole("link", { name: "D1 · Abordagem por DM" }).filter(visible).waitFor();
      await page.getByText("Usado 0 vezes · sem dados de resposta").first().waitFor();
    });

    await step(page, "Filtro por canal (WhatsApp)", async () => {
      await page.getByRole("link", { name: "WhatsApp", exact: true }).filter(visible).click();
      await page.waitForURL(/canal=whatsapp/);
      await page.getByRole("link", { name: "D5 · Contato por WhatsApp" }).filter(visible).waitFor();
      const dm = await page.getByRole("link", { name: "D1 · Abordagem por DM" }).filter(visible).count();
      expect(dm === 0, "template de DM não deveria aparecer no filtro de WhatsApp");
    });

    await step(page, "Novo template: variáveis e prévia", async () => {
      await open(page, "/templates/novo");
      await page.getByLabel("Nome *", { exact: true }).fill("Teste E2E · Convite");
      await choose(page, "Canal *", "WhatsApp");
      await choose(page, "Categoria *", "Convite para diagnóstico");
      const body = page.getByLabel("Texto *", { exact: true });
      await body.fill("Oi, ");
      await page.getByRole("button", { name: "{nome}" }).click(); // entra onde está o cursor (no fim)
      await page.getByTestId("template-preview").getByText("Oi, Maria").waitFor();
      await body.fill("Oi, {nome}! Vamos falar de {nicho}? {nomee}");
      const preview = await page.getByTestId("template-preview").innerText();
      expect(preview.startsWith("Oi, Maria! Vamos falar de Nutrição?"), `prévia: ${preview}`);
      await page.getByText("Variável desconhecida: {nomee}").waitFor();
    });

    await step(page, "Variável desconhecida bloqueia o salvamento", async () => {
      await page.getByRole("button", { name: "Criar template" }).click();
      await page.getByText("Variável desconhecida: {nomee}.").waitFor();
      expect(page.url().endsWith("/templates/novo"), "deveria continuar no formulário");
    });

    await step(page, "Salvar template válido", async () => {
      const body = page.getByLabel("Texto *", { exact: true });
      await body.fill("Oi, {nome}! Vamos marcar o diagnóstico? Abraço, {nome_sdr}");
      const preview = await page.getByTestId("template-preview").innerText();
      expect(preview.includes("Abraço, Teste Automatizado"), `prévia: ${preview}`);
      await page.getByRole("button", { name: "Criar template" }).click();
      await page.waitForURL(/\/templates$/);
      await page.getByRole("link", { name: "Teste E2E · Convite" }).filter(visible).waitFor();
    });

    await step(page, "Editar e excluir template", async () => {
      await page.getByRole("link", { name: "Teste E2E · Convite" }).filter(visible).click();
      await page.waitForURL(/\/editar$/);
      await page.waitForLoadState("networkidle");
      await page.getByLabel("Nome *", { exact: true }).filter(visible).fill("Teste E2E · Convite editado");
      await page.getByRole("button", { name: "Salvar alterações" }).click();
      await page.waitForURL(/\/templates$/);
      await page.getByRole("link", { name: "Teste E2E · Convite editado" }).filter(visible).click();
      await page.waitForURL(/\/editar$/);
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Excluir" }).filter(visible).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
      await page.waitForURL(/\/templates$/);
      await page.waitForLoadState("networkidle");
      const left = await page.getByRole("link", { name: /Teste E2E/ }).filter(visible).count();
      expect(left === 0, "template excluído não deveria aparecer");
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
