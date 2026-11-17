// Testes de tela da Central Financeira (menu, app, vendas, custos e resumos).
// Usa o exemplo da planilha Controle_Apps_Coproducao.xlsx em outubro e
// novembro de 2001 (para não misturar com dados reais) e apaga tudo no fim.
// Uso: BASE_URL=http://localhost:3200 npx tsx --env-file=.env.local tests/e2e/financeiro.ts
import postgres from "postgres";
import { BASE_URL, choose, createRunner, expect, login, open } from "./helpers";

const visible = { visible: true } as const;
const APP_NAME = "App Financeiro E2E";

async function main() {
  const sql = postgres(process.env.DATABASE_URL_MIGRATIONS!, { max: 1, onnotice: () => {} });
  const { start, step, report } = createRunner("financeiro");
  const { browser, page } = await start({ viewport: { width: 1400, height: 1000 } });
  let appId = "";
  const text = async (testId: string) => (await page.getByTestId(testId).filter(visible).first().innerText()).replace(/\s/g, " ");
  const save = async (name: string) => {
    await Promise.all([page.waitForResponse((response) => response.request().method() === "POST"), page.getByRole("button", { name }).click()]);
  };

  try {
    await login(page);

    await step(page, "Menu mostra a Central Financeira abaixo da Comercial", async () => {
      const group = page.getByRole("group", { name: "Central Financeira" }).filter(visible);
      for (const name of ["Resumo", "Mês a mês", "Apps", "Vendas", "Custos"]) await group.getByRole("link", { name, exact: true }).waitFor();
      await page.getByRole("link", { name: "Dashboard", exact: true }).filter(visible).waitFor();
      await group.getByRole("link", { name: "Apps", exact: true }).click();
      await page.waitForURL(`${BASE_URL}/financeiro/apps`);
      await page.waitForLoadState("networkidle");
      const active = await group.getByRole("link", { name: "Apps", exact: true }).getAttribute("class");
      expect(active?.includes("lap-elevado") === true, "item Apps destacado");
    });

    await step(page, "Cadastrar app (40% padrão)", async () => {
      await open(page, "/financeiro/apps/novo");
      expect((await page.locator("#app-companyShare").inputValue()) === "40", "% padrão");
      await page.locator("#app-name").fill(APP_NAME);
      await page.locator("#app-partnerName").fill("Julia E2E");
      await page.locator("#app-partnerHandle").fill("@julia.e2e");
      await page.locator("#app-salesPlatform").fill("Hotmart");
      await page.locator("#app-monthlyPrice").fill("49,90");
      await choose(page, "Status", "Em operação");
      await save("Cadastrar app");
      await page.waitForURL(/\/financeiro\/apps\/[0-9a-f-]{36}$/);
      appId = page.url().split("/").at(-1)!;
      await page.getByRole("heading", { name: APP_NAME }).waitFor();
    });

    const sale = async (month: string, values: [string, string, string, string, string, string]) => {
      await open(page, `/financeiro/vendas/nova?app=${appId}`);
      expect((await page.locator("#sale-companyShare").inputValue()) === "40", "% vem do app");
      await page.locator("#sale-month").fill(month);
      const fields = ["newSales", "activeSubscribers", "cancellations", "grossRevenue", "platformFees", "refunds"];
      for (const [index, field] of fields.entries()) await page.locator(`#sale-${field}`).fill(values[index]);
    };

    await step(page, "Lançar vendas de outubro e novembro, com o cálculo ao vivo", async () => {
      await sale("2001-10", ["210", "205", "5", "10.479,00", "1047,9", "249,5"]);
      expect((await text("sale-net")) === "R$ 9.181,60" && (await text("sale-company")) === "R$ 3.672,64", `${await text("sale-net")} / ${await text("sale-company")}`);
      await save("Salvar lançamento");
      await page.waitForURL(`${BASE_URL}/financeiro/apps/${appId}`);
      await sale("2001-11", ["160", "330", "35", "16467", "1646,7", "399,2"]);
      await save("Salvar lançamento");
      await page.waitForURL(`${BASE_URL}/financeiro/apps/${appId}`);
      await page.getByTestId("app-revenue").filter(visible).getByText("R$ 9.441,08").waitFor();
    });

    await step(page, "Lançar custo rateado e custo geral", async () => {
      await open(page, `/financeiro/custos/novo?app=${appId}`);
      await page.locator("#cost-spentOn").fill("2001-10-05");
      await choose(page, "Categoria", "Tráfego pago · Custos do app");
      await page.locator("#cost-amount").fill("2500");
      await page.getByLabel("Rateado com o influenciador?").check();
      expect((await page.locator("#cost-partnerShare").inputValue()) === "60", "% do influenciador vem do app");
      expect((await text("cost-partner")) === "R$ 1.500,00", await text("cost-partner"));
      await save("Salvar custo");
      await page.waitForURL(`${BASE_URL}/financeiro/apps/${appId}`);

      await open(page, "/financeiro/custos/novo");
      await page.locator("#cost-spentOn").fill("2001-10-15");
      await choose(page, "Categoria", "IA de desenvolvimento · Custos da empresa");
      await page.locator("#cost-amount").fill("550");
      await page.locator("#cost-description").fill("Assinatura E2E");
      expect((await page.getByLabel("Rateado com o influenciador?").count()) === 0, "custo geral não mostra o rateio");
      await save("Salvar custo");
      await page.waitForURL(`${BASE_URL}/financeiro/custos?mes=2001-10`);
      await page.getByRole("table", { name: "Lançamentos de custos" }).getByText("Geral (empresa)").first().waitFor();
    });

    // Os outros 8 custos do exemplo entram direto no banco.
    await sql`insert into public.costs (app_id, spent_on, category, amount, shared, partner_share, description) values
      (${appId}, '2001-10-31', 'ai_app', 410, false, null, 'E2E'),
      (${appId}, '2001-10-10', 'infrastructure', 180, false, null, 'E2E'),
      (null, '2001-10-20', 'software', 300, false, null, 'E2E'),
      (${appId}, '2001-11-05', 'paid_traffic', 4000, true, 60, 'E2E'),
      (${appId}, '2001-11-30', 'ai_app', 690, false, null, 'E2E'),
      (${appId}, '2001-11-10', 'infrastructure', 220, false, null, 'E2E'),
      (null, '2001-11-15', 'ai_development', 550, false, null, 'E2E'),
      (null, '2001-11-20', 'taxes', 600, false, null, 'E2E')`;

    await step(page, "Resumo de out–nov igual à planilha", async () => {
      await open(page, "/financeiro?de=2001-10&ate=2001-11");
      const values = {
        "company-result": "R$ 3.341,08",
        "apps-profit": "R$ 5.341,08",
        "general-costs": "R$ 2.000,00",
        "ai-total": "R$ 2.200,00",
        "company-revenue": "R$ 9.441,08",
        "apps-margin": "56,6%",
      };
      const wrong = [];
      for (const [id, value] of Object.entries(values)) if ((await text(id)) !== value) wrong.push(`${id}=${await text(id)}`);
      expect(wrong.length === 0, wrong.join(", "));
      const row = page.getByRole("table", { name: "Resultado por app" }).getByRole("row").filter({ hasText: APP_NAME });
      for (const cell of ["R$ 8.000,00", "R$ 6.500,00", "R$ 1.100,00", "R$ 3.900,00", "R$ 2,09", "R$ 17,57", "4,15"]) await row.getByText(cell, { exact: true }).waitFor();
    });

    await step(page, "Mês a mês: resultado e acumulado iguais à planilha", async () => {
      await open(page, "/financeiro/mensal?ano=2001");
      const october = await text("month-2001-10");
      const november = await text("month-2001-11");
      expect(october.includes("R$ 1.232,64") && november.includes("R$ 2.108,44") && november.includes("R$ 3.341,08"), `${october} | ${november}`);
      expect((await text("year-total")).includes("R$ 3.341,08"), await text("year-total"));
      await page.getByRole("figure", { name: "Resultado da empresa" }).waitFor();
    });

    await step(page, "Mudar o % do app não muda os lançamentos antigos", async () => {
      await open(page, `/financeiro/apps/${appId}/editar`);
      await page.locator("#app-companyShare").fill("50");
      await save("Salvar alterações");
      await page.waitForURL(`${BASE_URL}/financeiro/apps/${appId}`);
      await open(page, `/financeiro/vendas?app=${appId}`);
      expect((await text("sales-company-total")) === "R$ 9.441,08", await text("sales-company-total"));
      await open(page, `/financeiro/vendas/nova?app=${appId}`);
      expect((await page.locator("#sale-companyShare").inputValue()) === "50", "novo lançamento usa o % novo");
    });

    await step(page, "Venda repetida no mesmo mês mostra o aviso", async () => {
      await page.locator("#sale-month").fill("2001-10");
      await page.locator("#sale-grossRevenue").fill("100");
      await save("Salvar lançamento");
      await page.getByRole("alert").getByText(`Já existe o lançamento de ${APP_NAME} em outubro de 2001. Edite o existente.`).waitFor();
    });

    await step(page, "App com lançamentos não pode ser excluído; custo pode", async () => {
      await open(page, `/financeiro/apps/${appId}`);
      expect((await page.getByRole("button", { name: "Excluir" }).filter(visible).count()) === 0, "sem botão Excluir");
      await page.getByText("não pode ser excluído").filter(visible).waitFor();
      await open(page, "/financeiro/custos?app=geral&mes=2001-10");
      await page.getByRole("row").filter({ hasText: "Assinatura E2E" }).getByRole("link", { name: "Editar" }).click();
      await page.waitForURL(/\/financeiro\/custos\/[0-9a-f-]{36}\/editar$/);
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Excluir" }).filter(visible).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
      await page.waitForURL(`${BASE_URL}/financeiro/custos`);
      const [deleted] = await sql`select count(*)::int as n from public.costs where description = 'Assinatura E2E' and deleted_at is not null`;
      expect(deleted.n === 1, "custo excluído (exclusão lógica)");
    });

    await step(page, "Celular: tabelas largas rolam dentro do cartão", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const path of ["/financeiro?de=2001-10&ate=2001-11", "/financeiro/mensal?ano=2001", "/financeiro/vendas", "/financeiro/custos"]) {
        await open(page, path);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow <= 1, `${path} passa da largura em ${overflow}px`);
      }
    });
  } finally {
    await browser.close();
    if (appId) {
      await sql`delete from public.costs where app_id = ${appId}`;
      await sql`delete from public.app_sales where app_id = ${appId}`;
    }
    await sql`delete from public.costs where app_id is null and spent_on < '2002-01-01' and description like '%E2E%'`;
    await sql`delete from public.apps where name = ${APP_NAME}`;
    await sql.end();
  }
  process.exit(report() ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
