import type { AppStatus, CostCategory } from "@/db/schema";
import { todayInSaoPaulo } from "@/lib/format";

// Cálculos da Central Financeira, iguais às fórmulas da planilha
// Controle_Apps_Coproducao.xlsx. Funções puras: o banco devolve os lançamentos
// e as somas, e os números saem daqui (dá para testar sem banco).
// Meses são sempre o dia 1 no formato "2026-11-01".

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
// Divisão que devolve null quando não dá para dividir (a planilha mostrava 0).
const ratio = (value: number, base: number) => (base === 0 ? null : value / base);

// ---------- Meses ----------

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_LONG = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export function currentMonth(now = new Date()) {
  return `${todayInSaoPaulo(now).slice(0, 7)}-01`;
}

export function addMonths(month: string, count: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const index = year * 12 + monthNumber - 1 + count;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-01`;
}

// "2026-11" (campo <input type="month"> ou parâmetro da URL) → "2026-11-01".
export function parseMonth(value: unknown) {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? `${value}-01` : null;
}

// "2026-11-01" → "nov/2026"
export function monthLabel(month: string) {
  return `${MONTHS[Number(month.slice(5, 7)) - 1]}/${month.slice(0, 4)}`;
}

// "2026-11-01" → "novembro de 2026"
export function monthLongLabel(month: string) {
  return `${MONTHS_LONG[Number(month.slice(5, 7)) - 1]} de ${month.slice(0, 4)}`;
}

// Data "2026-11-17" → mês "2026-11-01".
export const monthOf = (date: string) => `${date.slice(0, 7)}-01`;

// ---------- Lançamentos ----------

export type SaleRow = {
  appId: string;
  month: string;
  newSales: number;
  activeSubscribers: number;
  cancellations: number;
  grossRevenue: number;
  platformFees: number;
  refunds: number;
  companyShare: number; // % da empresa, congelado no lançamento
};

// Comissão líquida = bruto − taxas − reembolsos; a empresa fica com o % dela.
export function saleTotals(sale: Pick<SaleRow, "grossRevenue" | "platformFees" | "refunds" | "companyShare">) {
  const net = round2(sale.grossRevenue - sale.platformFees - sale.refunds);
  const company = round2((net * sale.companyShare) / 100);
  return { net, company, partner: round2(net - company) };
}

// Parte do influenciador num custo rateado (o que ele deve devolver).
export function costPartnerAmount(cost: { amount: number; shared: boolean; partnerShare: number | null }) {
  return cost.shared && cost.partnerShare !== null ? round2((cost.amount * cost.partnerShare) / 100) : 0;
}

// Custos somados por app (null = geral), mês e categoria.
export type CostTotal = {
  appId: string | null;
  month: string;
  category: CostCategory;
  amount: number;
  partnerAmount: number;
};

export function toCostTotal(cost: {
  appId: string | null;
  spentOn: string;
  category: CostCategory;
  amount: number;
  shared: boolean;
  partnerShare: number | null;
}): CostTotal {
  return { appId: cost.appId, month: monthOf(cost.spentOn), category: cost.category, amount: cost.amount, partnerAmount: costPartnerAmount(cost) };
}

// ---------- Resumo por app (aba "Resumo por App") ----------

export type AppRef = { id: string; name: string; status: AppStatus };

export type AppSummary = {
  newSales: number;
  grossRevenue: number;
  netRevenue: number;
  companyRevenue: number;
  appCosts: number;
  trafficCosts: number;
  aiAppCosts: number;
  partnerSettlement: number; // acerto a receber do influenciador
  profit: number;
  margin: number | null;
  activeSubscribers: number; // mês final
  aiPerSubscriber: number | null; // IA no app do mês final ÷ assinantes
  cpa: number | null;
  roas: number | null;
  revenueShare: number | null; // participação na receita da empresa
};

function aggregate(sales: SaleRow[], costs: CostTotal[], endMonth: string): AppSummary {
  const totals = sales.map(saleTotals);
  const ofCategory = (category: CostCategory, month?: string) =>
    round2(sum(costs.filter((cost) => cost.category === category && (!month || cost.month === month)).map((cost) => cost.amount)));
  const companyRevenue = round2(sum(totals.map((total) => total.company)));
  const appCosts = round2(sum(costs.map((cost) => cost.amount)));
  const partnerSettlement = round2(sum(costs.map((cost) => cost.partnerAmount)));
  const newSales = sum(sales.map((sale) => sale.newSales));
  const grossRevenue = round2(sum(sales.map((sale) => sale.grossRevenue)));
  const trafficCosts = ofCategory("paid_traffic");
  const activeSubscribers = sum(sales.filter((sale) => sale.month === endMonth).map((sale) => sale.activeSubscribers));
  const profit = round2(companyRevenue - appCosts + partnerSettlement);
  return {
    newSales,
    grossRevenue,
    netRevenue: round2(sum(totals.map((total) => total.net))),
    companyRevenue,
    appCosts,
    trafficCosts,
    aiAppCosts: ofCategory("ai_app"),
    partnerSettlement,
    profit,
    margin: ratio(profit, companyRevenue),
    activeSubscribers,
    aiPerSubscriber: ratio(ofCategory("ai_app", endMonth), activeSubscribers),
    cpa: ratio(trafficCosts, newSales),
    roas: ratio(grossRevenue, trafficCosts),
    revenueShare: null,
  };
}

// Resumo do período [from, to] (meses inclusive), por app e da empresa.
export function summarizeApps({
  apps,
  sales,
  costs,
  from,
  to,
}: {
  apps: AppRef[];
  sales: SaleRow[];
  costs: CostTotal[];
  from: string;
  to: string;
}) {
  const appIds = new Set(apps.map((app) => app.id));
  const inPeriod = (month: string) => month >= from && month <= to;
  const periodSales = sales.filter((sale) => appIds.has(sale.appId) && inPeriod(sale.month));
  const periodCosts = costs.filter((cost) => inPeriod(cost.month) && (cost.appId === null || appIds.has(cost.appId)));
  const appCosts = periodCosts.filter((cost) => cost.appId !== null);

  const total = aggregate(periodSales, appCosts, to);
  total.revenueShare = total.companyRevenue === 0 ? null : 1;

  const rows = apps
    .map((app) => {
      const summary = aggregate(
        periodSales.filter((sale) => sale.appId === app.id),
        appCosts.filter((cost) => cost.appId === app.id),
        to,
      );
      summary.revenueShare = ratio(summary.companyRevenue, total.companyRevenue);
      return { ...app, ...summary };
    })
    .sort((a, b) => b.companyRevenue - a.companyRevenue || a.name.localeCompare(b.name, "pt-BR"));

  const generalCosts = round2(sum(periodCosts.filter((cost) => cost.appId === null).map((cost) => cost.amount)));
  const aiTotal = round2(
    sum(periodCosts.filter((cost) => cost.category === "ai_app" || cost.category === "ai_development").map((cost) => cost.amount)),
  );
  const topRevenue = Math.max(0, ...rows.map((row) => row.companyRevenue));

  return {
    rows,
    total,
    company: {
      appsProfit: total.profit,
      generalCosts,
      result: round2(total.profit - generalCosts),
      aiTotal,
      concentration: ratio(topRevenue, total.companyRevenue),
    },
  };
}

// ---------- Mês a mês (aba "Resumo Mensal") ----------

// Topo do eixo dos gráficos, "redondo": 3.672 → 4.000, 5.768 → 6.000, 140 → 200.
export function niceMax(value: number) {
  if (value <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 4, 6, 8, 10].find((candidate) => candidate * magnitude >= value) ?? 10;
  return step * magnitude;
}


export type MonthSummary = {
  month: string;
  grossRevenue: number;
  companyRevenue: number;
  appCosts: number;
  partnerSettlement: number;
  appsProfit: number;
  generalCosts: number;
  result: number;
  cumulative: number; // resultado acumulado desde o primeiro mês com lançamento
  aiApp: number;
  aiDevelopment: number;
  aiTotal: number;
  aiShare: number | null; // IA ÷ receita da empresa
  activeSubscribers: number | null; // todos os apps; no total do ano fica vazio
};

function monthTotals(month: string, sales: SaleRow[], costs: CostTotal[], cumulativeBefore: number): MonthSummary {
  const monthSales = sales.filter((sale) => sale.month === month);
  const monthCosts = costs.filter((cost) => cost.month === month);
  const costSum = (filter: (cost: CostTotal) => boolean) => round2(sum(monthCosts.filter(filter).map((cost) => cost.amount)));
  const companyRevenue = round2(sum(monthSales.map((sale) => saleTotals(sale).company)));
  const appCosts = costSum((cost) => cost.appId !== null);
  const partnerSettlement = round2(sum(monthCosts.map((cost) => cost.partnerAmount)));
  const appsProfit = round2(companyRevenue - appCosts + partnerSettlement);
  const generalCosts = costSum((cost) => cost.appId === null);
  const result = round2(appsProfit - generalCosts);
  const aiApp = costSum((cost) => cost.category === "ai_app");
  const aiDevelopment = costSum((cost) => cost.category === "ai_development");
  const aiTotal = round2(aiApp + aiDevelopment);
  return {
    month,
    grossRevenue: round2(sum(monthSales.map((sale) => sale.grossRevenue))),
    companyRevenue,
    appCosts,
    partnerSettlement,
    appsProfit,
    generalCosts,
    result,
    cumulative: round2(cumulativeBefore + result),
    aiApp,
    aiDevelopment,
    aiTotal,
    aiShare: ratio(aiTotal, companyRevenue),
    activeSubscribers: sum(monthSales.map((sale) => sale.activeSubscribers)),
  };
}

// Os 12 meses do ano e o total. O acumulado começa no primeiro mês com
// lançamento, mesmo que seja de um ano anterior.
export function summarizeMonths({ sales, costs, year }: { sales: SaleRow[]; costs: CostTotal[]; year: number }) {
  const january = `${year}-01-01`;
  const months = [...sales.map((sale) => sale.month), ...costs.map((cost) => cost.month)];
  const first = months.length ? months.reduce((a, b) => (a < b ? a : b)) : january;

  const rows: MonthSummary[] = [];
  let cumulative = 0;
  for (let month = first < january ? first : january; month <= `${year}-12-01`; month = addMonths(month, 1)) {
    const row = monthTotals(month, sales, costs, cumulative);
    cumulative = row.cumulative;
    if (month >= january) rows.push(row);
  }

  const total = (key: keyof MonthSummary) => round2(sum(rows.map((row) => row[key] as number)));
  const companyRevenue = total("companyRevenue");
  const aiTotal = total("aiTotal");
  return {
    rows,
    total: {
      grossRevenue: total("grossRevenue"),
      companyRevenue,
      appCosts: total("appCosts"),
      partnerSettlement: total("partnerSettlement"),
      appsProfit: total("appsProfit"),
      generalCosts: total("generalCosts"),
      result: total("result"),
      cumulative: rows.at(-1)?.cumulative ?? 0,
      aiApp: total("aiApp"),
      aiDevelopment: total("aiDevelopment"),
      aiTotal,
      aiShare: ratio(aiTotal, companyRevenue),
      activeSubscribers: null,
    },
  };
}
