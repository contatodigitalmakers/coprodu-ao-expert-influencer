// Testes da Central Financeira. Banco real, tudo desfeito no final.
// Uso: npx tsx --env-file=.env.local tests/db/financeiro.ts
// Sem DATABASE_URL, roda só a parte que não usa o banco.
import { eq, sql } from "drizzle-orm";
import { runAsUser, type Tx } from "@/db";
import { appSales, users } from "@/db/schema";
import { addMonths, monthLabel, summarizeApps, summarizeMonths, toCostTotal, type SaleRow } from "@/lib/finance/calc";
import { createApp, createCost, createSale, deleteApp, deleteSale, FinanceError, updateApp } from "@/lib/finance/mutations";
import { loadMonthlySummary, loadPeriodSummary } from "@/lib/finance/queries";
import { appSchema, costSchema, saleSchema, type AppInput, type CostInput, type SaleInput } from "@/lib/finance/validation";

// Exemplo da planilha Controle_Apps_Coproducao.xlsx (APP-001, outubro e
// novembro), com os números que ela calcula.
const EXPECTED = {
  companyRevenue: 9441.08, appCosts: 8000, trafficCosts: 6500, aiAppCosts: 1100, partnerSettlement: 3900,
  profit: 5341.08, newSales: 370, grossRevenue: 26946, netRevenue: 23602.7, activeSubscribers: 330,
};
const EXPECTED_RATIOS = { margin: 0.565727649802777, aiPerSubscriber: 2.09090909090909, cpa: 17.5675675675676, roas: 4.14553846153846 };
const EXPECTED_COMPANY = { generalCosts: 2000, result: 3341.08, aiTotal: 2200, concentration: 1 };
const EXPECTED_MONTHS = [
  { companyRevenue: 3672.64, appCosts: 3090, partnerSettlement: 1500, appsProfit: 2082.64, generalCosts: 850, result: 1232.64, cumulative: 1232.64, aiTotal: 960, activeSubscribers: 205 },
  { companyRevenue: 5768.44, appCosts: 4910, partnerSettlement: 2400, appsProfit: 3258.44, generalCosts: 1150, result: 2108.44, cumulative: 3341.08, aiTotal: 1240, activeSubscribers: 330 },
];

// Lançamentos do exemplo num ano qualquer (o teste com banco usa 2001, para
// não misturar com dados reais).
function example(year: number) {
  const m = (month: number) => `${year}-${String(month).padStart(2, "0")}`;
  const sales: Omit<SaleInput, "appId">[] = [
    { month: m(10), newSales: "210", activeSubscribers: "205", cancellations: "5", grossRevenue: "10.479,00", platformFees: "1047,9", refunds: "249,5", companyShare: "40", notes: "" },
    { month: m(11), newSales: "160", activeSubscribers: "330", cancellations: "35", grossRevenue: "16467", platformFees: "1646,7", refunds: "399,2", companyShare: "40", notes: "" },
  ];
  const cost = (day: string, app: boolean, category: CostInput["category"], amount: string, shared = false): Omit<CostInput, "appId"> & { app: boolean } => ({
    app, spentOn: day, category, amount, shared, partnerShare: shared ? "60" : "", supplier: "", description: "EXEMPLO",
  });
  const costs = [
    cost(`${m(10)}-05`, true, "paid_traffic", "2500", true),
    cost(`${m(10)}-31`, true, "ai_app", "410"),
    cost(`${m(10)}-10`, true, "infrastructure", "180"),
    cost(`${m(10)}-15`, false, "ai_development", "550"),
    cost(`${m(10)}-20`, false, "software", "300"),
    cost(`${m(11)}-05`, true, "paid_traffic", "4000", true),
    cost(`${m(11)}-30`, true, "ai_app", "690"),
    cost(`${m(11)}-10`, true, "infrastructure", "220"),
    cost(`${m(11)}-15`, false, "ai_development", "550"),
    cost(`${m(11)}-20`, false, "taxes", "600"),
  ];
  return { sales, costs };
}

const close = (a: number | null, b: number) => a !== null && Math.abs(a - b) < 0.005;

async function main() {
  const results: { name: string; pass: boolean; detail: string }[] = [];
  const check = (name: string, pass: boolean, detail = "") => results.push({ name, pass, detail });

  // ---------- Sem banco ----------
  const appInput: AppInput = {
    name: " App Treino ", expertId: "", partnerName: "Julia", partnerHandle: "@Julia.Fit", niche: "Fitness", salesPlatform: "Hotmart",
    monthlyPrice: "49,90", companyShare: "40%", status: "operating", contractDate: "2026-09-01", launchDate: "", notes: "",
  };
  const app = appSchema.safeParse(appInput);
  check("App: limpa o nome e o @, lê R$ e %", app.success && app.data.name === "App Treino" && app.data.partnerHandle === "julia.fit" && app.data.monthlyPrice === 49.9 && app.data.companyShare === 40 && app.data.launchDate === null, JSON.stringify(app));
  check("App: recusa % acima de 100", !appSchema.safeParse({ ...appInput, companyShare: "120" }).success);
  check("App: recusa data que não existe", !appSchema.safeParse({ ...appInput, contractDate: "2026-02-30" }).success);

  const sale = saleSchema.safeParse({ appId: crypto.randomUUID(), ...example(2026).sales[0] });
  check("Venda: mês vira o dia 1 e os valores em pt-BR viram número", sale.success && sale.data.month === "2026-10-01" && sale.data.grossRevenue === 10479 && sale.data.platformFees === 1047.9, JSON.stringify(sale));
  check("Venda: recusa sem mês", !saleSchema.safeParse({ appId: crypto.randomUUID(), ...example(2026).sales[0], month: "" }).success);
  check("Venda: recusa número quebrado em vendas novas", !saleSchema.safeParse({ appId: crypto.randomUUID(), ...example(2026).sales[0], newSales: "2,5" }).success);

  const generalShared = costSchema.safeParse({ appId: "", spentOn: "2026-10-05", category: "software", amount: "100", shared: true, partnerShare: "60", supplier: "", description: "" });
  check("Custo: geral da empresa não pode ser rateado", !generalShared.success && generalShared.error.issues[0].message.includes("não é rateado"));
  const notShared = costSchema.safeParse({ appId: crypto.randomUUID(), spentOn: "2026-10-05", category: "software", amount: "100", shared: false, partnerShare: "60", supplier: "", description: "" });
  check("Custo: sem rateio, o % do influenciador fica vazio", notShared.success && notShared.data.partnerShare === null);
  check("Custo: recusa valor zero", !costSchema.safeParse({ appId: "", spentOn: "2026-10-05", category: "software", amount: "0", shared: false, partnerShare: "", supplier: "", description: "" }).success);

  check("Meses: dezembro + 1 = janeiro do ano seguinte", addMonths("2026-12-01", 1) === "2027-01-01" && addMonths("2026-01-01", -1) === "2025-12-01" && monthLabel("2026-11-01") === "nov/2026");

  // Exemplo da planilha calculado sem banco.
  const data = example(2026);
  const appId = "app-1";
  const saleRows: SaleRow[] = data.sales.map((row) => ({ ...saleSchema.parse({ appId: crypto.randomUUID(), ...row }), appId }));
  const costRows = data.costs.map(({ app: ofApp, ...row }) => toCostTotal({ ...costSchema.parse({ ...row, appId: ofApp ? crypto.randomUUID() : "" }), appId: ofApp ? appId : null }));
  const refs = [{ id: appId, name: "App Treino EXEMPLO", status: "operating" as const }, { id: "app-2", name: "App Finanças EXEMPLO", status: "in_development" as const }];
  const summary = summarizeApps({ apps: refs, sales: saleRows, costs: costRows, from: "2026-10-01", to: "2026-11-01" });
  const row = summary.rows[0];
  const wrong = Object.entries(EXPECTED).filter(([key, value]) => row[key as keyof typeof EXPECTED] !== value);
  check("Resumo por app: os mesmos valores da planilha", row.id === appId && wrong.length === 0, JSON.stringify(wrong.map(([key]) => [key, row[key as keyof typeof EXPECTED]])));
  const wrongRatios = Object.entries(EXPECTED_RATIOS).filter(([key, value]) => !close(row[key as keyof typeof EXPECTED_RATIOS], value));
  check("Resumo por app: margem, IA por assinante, CPA e ROAS da planilha", wrongRatios.length === 0, JSON.stringify(wrongRatios.map(([key]) => [key, row[key as keyof typeof EXPECTED_RATIOS]])));
  const wrongCompany = Object.entries(EXPECTED_COMPANY).filter(([key, value]) => !close(summary.company[key as keyof typeof EXPECTED_COMPANY], value));
  check("Empresa: custos gerais, resultado, IA total e concentração da planilha", wrongCompany.length === 0 && summary.total.profit === 5341.08, JSON.stringify(summary.company));
  check("App sem lançamento aparece zerado, sem divisão por zero", summary.rows[1].companyRevenue === 0 && summary.rows[1].margin === null && summary.rows[1].roas === null && summary.rows[1].revenueShare === 0);

  const months = summarizeMonths({ sales: saleRows, costs: costRows, year: 2026 });
  const wrongMonths = EXPECTED_MONTHS.flatMap((expected, index) =>
    Object.entries(expected).filter(([key, value]) => months.rows[9 + index][key as keyof typeof expected] !== value).map(([key]) => `${index}:${key}`),
  );
  check("Mês a mês: outubro e novembro iguais à planilha", months.rows.length === 12 && wrongMonths.length === 0, wrongMonths.join(", "));
  check("Mês a mês: total do ano e acumulado", months.total.result === 3341.08 && months.total.cumulative === 3341.08 && close(months.total.aiShare, 0.233024187910705) && months.rows[11].cumulative === 3341.08, JSON.stringify(months.total));
  const nextYear = summarizeMonths({ sales: saleRows, costs: costRows, year: 2027 });
  check("Mês a mês: o acumulado continua no ano seguinte", nextYear.rows[0].cumulative === 3341.08 && nextYear.total.result === 0);

  // ---------- Com banco ----------
  if (process.env.DATABASE_URL) {
    class Rollback extends Error {}
    const fake = { sub: "00000000-0000-0000-0000-000000000000", role: "authenticated" } as never;
    const [admin] = await runAsUser(fake, (tx) => tx.select({ id: users.id }).from(users).where(eq(users.role, "admin")).limit(1));
    check("Há um usuário admin para o teste", Boolean(admin));
    if (!admin) return finish(results);
    const claims = { sub: admin.id, role: "authenticated" } as never;

    // Consulta com outro papel e volta para o admin.
    const as = async (tx: Tx, who: "anon" | "other", query: ReturnType<typeof sql>) => {
      const role = who === "anon" ? sql`anon` : sql`authenticated`;
      await tx.execute(sql`select set_config('request.jwt.claims', ${who === "anon" ? "" : JSON.stringify(fake)}, true)`);
      await tx.execute(sql`set local role ${role}`);
      try {
        return await tx.transaction(async (sp) => ({ rows: (await sp.execute(query)) as unknown as Record<string, unknown>[], error: null as string | null }));
      } catch (error) {
        return { rows: [], error: String((error as { cause?: unknown }).cause ?? error) };
      } finally {
        await tx.execute(sql`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`);
        await tx.execute(sql`set local role authenticated`);
      }
    };
    const message = async (fn: () => Promise<unknown>) => {
      try {
        await fn();
        return "";
      } catch (error) {
        if (error instanceof FinanceError) return error.message;
        throw error;
      }
    };

    try {
      await runAsUser(claims, async (tx) => {
        const db = example(2001);
        const appIdDb = await createApp(tx, appSchema.parse({ ...appInput, name: "App Financeiro Teste E2E" }));
        for (const input of db.sales) await createSale(tx, saleSchema.parse({ appId: appIdDb, ...input }), admin.id);
        for (const { app: ofApp, ...input } of db.costs) await createCost(tx, costSchema.parse({ ...input, appId: ofApp ? appIdDb : "" }), admin.id);

        const period = await loadPeriodSummary(tx, { from: "2001-10-01", to: "2001-11-01" });
        const dbRow = period.rows.find((item) => item.id === appIdDb);
        const dbWrong = dbRow ? Object.entries(EXPECTED).filter(([key, value]) => dbRow[key as keyof typeof EXPECTED] !== value) : [["app", "não apareceu"]];
        check("Banco: o resumo do período bate com a planilha", dbWrong.length === 0 && close(period.company.result, 3341.08) && period.company.generalCosts === 2000, JSON.stringify({ dbWrong, company: period.company }));

        const monthly = await loadMonthlySummary(tx, 2001);
        check("Banco: o mês a mês bate com a planilha", monthly.rows[9].result === 1232.64 && monthly.rows[10].cumulative === 3341.08 && monthly.rows[10].activeSubscribers === 330, JSON.stringify(monthly.rows[10]));

        const duplicate = await message(() => createSale(tx, saleSchema.parse({ appId: appIdDb, ...db.sales[0] }), admin.id));
        check("Venda repetida no mesmo app e mês é recusada", duplicate === "Já existe o lançamento de App Financeiro Teste E2E em outubro de 2001. Edite o existente.", duplicate);

        const invalidCost = await tx.transaction(async (sp) => {
          await sp.execute(sql`insert into public.costs (spent_on, category, amount, shared, partner_share) values ('2001-10-01', 'software', 10, true, 60)`);
        }).then(() => "gravou", (error) => String((error as { cause?: { constraint_name?: string } }).cause?.constraint_name));
        check("Banco recusa custo geral rateado", invalidCost === "costs_shared_rules", invalidCost);

        await updateApp(tx, appIdDb, appSchema.parse({ ...appInput, name: "App Financeiro Teste E2E", companyShare: "50" }));
        const frozen = await tx.select({ share: appSales.companyShare }).from(appSales).where(eq(appSales.appId, appIdDb));
        check("Mudar o % do app não muda os lançamentos antigos", frozen.length === 2 && frozen.every((item) => item.share === 40), JSON.stringify(frozen));

        const blocked = await message(() => deleteApp(tx, appIdDb));
        check("App com lançamentos não pode ser excluído", blocked.includes("mude o status para Encerrado"), blocked);

        const [november] = await tx.select({ id: appSales.id }).from(appSales).where(eq(appSales.month, "2001-11-01"));
        await deleteSale(tx, november.id);
        const afterDelete = await loadPeriodSummary(tx, { from: "2001-10-01", to: "2001-11-01" });
        check("Venda excluída sai das somas", afterDelete.rows.find((item) => item.id === appIdDb)?.companyRevenue === 3672.64);

        const other = await as(tx, "other", sql`select count(*)::int as n from public.apps`);
        const otherInsert = await as(tx, "other", sql`insert into public.apps (name, partner_name, company_share) values ('Invasor', 'X', 40)`);
        check("Usuário que não é admin não lê nem grava", other.rows[0]?.n === 0 && otherInsert.error !== null, JSON.stringify({ other, otherInsert: otherInsert.error?.slice(0, 80) }));

        const anon = await as(tx, "anon", sql`select count(*)::int as n from public.app_sales`);
        const anonCosts = await as(tx, "anon", sql`select count(*)::int as n from public.costs`);
        check("Visitante sem login não lê vendas nem custos", (anon.rows[0]?.n ?? 0) === 0 && (anonCosts.rows[0]?.n ?? 0) === 0, JSON.stringify({ anon, anonCosts }));

        throw new Rollback();
      });
    } catch (error) {
      if (!(error instanceof Rollback)) throw error;
    }
  } else {
    console.log("(sem DATABASE_URL: só a parte sem banco)");
  }

  finish(results);
}

function finish(results: { name: string; pass: boolean; detail: string }[]) {
  for (const r of results) console.log(`${r.pass ? "OK     " : "FALHOU "} ${r.name}${r.pass || !r.detail ? "" : `  (${r.detail})`}`);
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\nfinanceiro: ${results.length - failed}/${results.length} OK`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
