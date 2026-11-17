import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import type { Tx } from "@/db";
import { apps, appSales, costs, experts, niches, stages, type CostCategory } from "@/db/schema";
import { queryAsUser } from "@/lib/auth";
import { isUuid } from "@/lib/experts/normalize";
import {
  addMonths,
  costPartnerAmount,
  currentMonth,
  saleTotals,
  summarizeApps,
  summarizeMonths,
  type CostTotal,
  type SaleRow,
} from "./calc";
import { GENERAL_COSTS } from "./labels";

// Leituras da Central Financeira. As funções com "tx" são usadas também pelos
// testes; as outras rodam como o usuário logado (só o Admin lê, pela RLS).

const activeApps = isNull(apps.deletedAt);

// ---------- Apps ----------

export async function listApps() {
  return queryAsUser((tx) =>
    tx
      .select({
        id: apps.id,
        name: apps.name,
        partnerName: apps.partnerName,
        partnerHandle: apps.partnerHandle,
        niche: apps.niche,
        salesPlatform: apps.salesPlatform,
        monthlyPrice: apps.monthlyPrice,
        companyShare: apps.companyShare,
        status: apps.status,
        contractDate: apps.contractDate,
        launchDate: apps.launchDate,
      })
      .from(apps)
      .where(activeApps)
      .orderBy(asc(apps.name)),
  );
}

export async function getApp(appId: string) {
  if (!isUuid(appId)) return null;
  const [row] = await queryAsUser((tx) =>
    tx
      .select({ app: apps, expertName: experts.name })
      .from(apps)
      .leftJoin(experts, eq(experts.id, apps.expertId))
      .where(and(eq(apps.id, appId), activeApps)),
  );
  return row ? { ...row.app, expertName: row.expertName } : null;
}

// Apps para os campos e filtros de vendas e custos.
export async function getAppOptions() {
  return queryAsUser((tx) =>
    tx
      .select({ id: apps.id, name: apps.name, companyShare: apps.companyShare, status: apps.status })
      .from(apps)
      .where(activeApps)
      .orderBy(asc(apps.name)),
  );
}

export type AppOption = Awaited<ReturnType<typeof getAppOptions>>[number];

// Leads que podem virar app: em Negociação ou Ganho (e o já ligado, ao editar).
// Traz o % da empresa da última proposta aceita e a data do contrato do projeto.
export async function getAppLeadOptions(currentExpertId: string | null) {
  return queryAsUser((tx) =>
    tx
      .select({
        id: experts.id,
        name: experts.name,
        handle: experts.handle,
        niche: niches.name,
        ourShare: sql<number | null>`(select p.our_share from public.proposals p
          where p.expert_id = ${experts.id} and p.status = 'accepted'
          order by p.accepted_at desc nulls last limit 1)`,
        contractDate: sql<string | null>`(select to_char(pr.contract_signed_at, 'YYYY-MM-DD') from public.projects pr
          where pr.expert_id = ${experts.id} order by pr.created_at desc limit 1)`,
      })
      .from(experts)
      .innerJoin(stages, eq(stages.id, experts.stageId))
      .leftJoin(niches, eq(niches.id, experts.nicheId))
      .where(
        and(
          isNull(experts.deletedAt),
          or(inArray(stages.key, ["negotiation", "won"]), currentExpertId ? eq(experts.id, currentExpertId) : undefined),
        ),
      )
      .orderBy(asc(experts.name)),
  );
}

export type AppLeadOption = Awaited<ReturnType<typeof getAppLeadOptions>>[number];

// ---------- Lançamentos ----------

export type SalesFilters = { month: string | null; appId: string | null };

export async function listSales(filters: SalesFilters) {
  const rows = await queryAsUser((tx) =>
    tx
      .select({ sale: appSales, appName: apps.name })
      .from(appSales)
      .innerJoin(apps, eq(apps.id, appSales.appId))
      .where(
        and(
          isNull(appSales.deletedAt),
          activeApps,
          filters.month ? eq(appSales.month, filters.month) : undefined,
          filters.appId ? eq(appSales.appId, filters.appId) : undefined,
        ),
      )
      .orderBy(desc(appSales.month), asc(apps.name))
      .limit(500),
  );
  return rows.map(({ sale, appName }) => ({ ...sale, appName, ...saleTotals(sale) }));
}

export async function getSale(saleId: string) {
  if (!isUuid(saleId)) return null;
  const [row] = await queryAsUser((tx) =>
    tx.select().from(appSales).where(and(eq(appSales.id, saleId), isNull(appSales.deletedAt))),
  );
  return row ?? null;
}

export type CostsFilters = { month: string | null; appId: string | null; category: CostCategory | null };

export async function listCosts(filters: CostsFilters) {
  const rows = await queryAsUser((tx) =>
    tx
      .select({ cost: costs, appName: apps.name })
      .from(costs)
      .leftJoin(apps, eq(apps.id, costs.appId))
      .where(
        and(
          isNull(costs.deletedAt),
          or(isNull(costs.appId), isNull(apps.deletedAt)),
          filters.month ? and(gte(costs.spentOn, filters.month), lte(costs.spentOn, monthEnd(filters.month))) : undefined,
          filters.appId === GENERAL_COSTS ? isNull(costs.appId) : filters.appId ? eq(costs.appId, filters.appId) : undefined,
          filters.category ? eq(costs.category, filters.category) : undefined,
        ),
      )
      .orderBy(desc(costs.spentOn), desc(costs.createdAt))
      .limit(500),
  );
  return rows.map(({ cost, appName }) => ({ ...cost, appName, partnerAmount: costPartnerAmount(cost) }));
}

export async function getCost(costId: string) {
  if (!isUuid(costId)) return null;
  const [row] = await queryAsUser((tx) => tx.select().from(costs).where(and(eq(costs.id, costId), isNull(costs.deletedAt))));
  return row ?? null;
}

// Último dia do mês ("2026-11-01" → "2026-11-30").
function monthEnd(month: string) {
  const next = new Date(`${addMonths(month, 1)}T12:00:00Z`);
  next.setUTCDate(0);
  return next.toISOString().slice(0, 10);
}

// ---------- Resumos ----------

type Range = { from: string; to: string };

// Vendas (já são uma linha por app e mês) e custos somados por app, mês e
// categoria, só de apps não excluídos. Sem "range", traz tudo.
export async function loadEntries(tx: Tx, range?: Range, appId?: string) {
  const salesWhere: (SQL | undefined)[] = [isNull(appSales.deletedAt), isNull(apps.deletedAt)];
  const costsWhere: (SQL | undefined)[] = [isNull(costs.deletedAt), or(isNull(costs.appId), isNull(apps.deletedAt))];
  if (range) {
    salesWhere.push(gte(appSales.month, range.from), lte(appSales.month, range.to));
    costsWhere.push(gte(costs.spentOn, range.from), lte(costs.spentOn, monthEnd(range.to)));
  }
  if (appId) {
    salesWhere.push(eq(appSales.appId, appId));
    costsWhere.push(eq(costs.appId, appId));
  }

  const month = sql<string>`to_char(date_trunc('month', ${costs.spentOn}), 'YYYY-MM-DD')`;
  const [sales, costTotals] = await Promise.all([
    tx
      .select({
        appId: appSales.appId,
        month: appSales.month,
        newSales: appSales.newSales,
        activeSubscribers: appSales.activeSubscribers,
        cancellations: appSales.cancellations,
        grossRevenue: appSales.grossRevenue,
        platformFees: appSales.platformFees,
        refunds: appSales.refunds,
        companyShare: appSales.companyShare,
      })
      .from(appSales)
      .innerJoin(apps, eq(apps.id, appSales.appId))
      .where(and(...salesWhere)),
    tx
      .select({
        appId: costs.appId,
        month,
        category: costs.category,
        amount: sql<number>`sum(${costs.amount})`.mapWith(Number),
        partnerAmount: sql<number>`sum(case when ${costs.shared} then round(${costs.amount} * ${costs.partnerShare} / 100.0, 2) else 0 end)`.mapWith(Number),
      })
      .from(costs)
      .leftJoin(apps, eq(apps.id, costs.appId))
      .where(and(...costsWhere))
      .groupBy(costs.appId, month, costs.category),
  ]);
  return { sales: sales as SaleRow[], costs: costTotals as CostTotal[] };
}

async function appRefs(tx: Tx) {
  return tx.select({ id: apps.id, name: apps.name, status: apps.status }).from(apps).where(activeApps).orderBy(asc(apps.name));
}

export async function loadPeriodSummary(tx: Tx, range: Range) {
  const [refs, entries] = await Promise.all([appRefs(tx), loadEntries(tx, range)]);
  return summarizeApps({ apps: refs, ...entries, ...range });
}

export async function loadMonthlySummary(tx: Tx, year: number) {
  return summarizeMonths({ ...(await loadEntries(tx)), year });
}

// Resumo do período (aba "Resumo por App").
export async function getPeriodSummary(range: Range) {
  return queryAsUser((tx) => loadPeriodSummary(tx, range));
}

// Mês a mês do ano (aba "Resumo Mensal").
export async function getMonthlySummary(year: number) {
  return queryAsUser((tx) => loadMonthlySummary(tx, year));
}

// Ficha do app: números desde o primeiro lançamento e os últimos 12 meses.
export async function getAppResults(app: { id: string; name: string; status: (typeof apps.$inferSelect)["status"] }) {
  const entries = await queryAsUser((tx) => loadEntries(tx, undefined, app.id));
  const months = [...entries.sales.map((sale) => sale.month), ...entries.costs.map((cost) => cost.month)].sort();
  const last = months.at(-1) ?? currentMonth();
  const first = months[0] ?? last;
  const summarize = (from: string, to: string) => summarizeApps({ apps: [app], ...entries, from, to }).rows[0];
  const recent = Array.from({ length: 12 }, (_, index) => addMonths(last, -index))
    .filter((month) => month >= first)
    .map((month) => ({ month, ...summarize(month, month) }));
  return { hasEntries: months.length > 0, allTime: summarize(first, last), first, last, recent };
}

// Meses com lançamento (para montar os filtros de mês).
export async function getEntryMonthRange() {
  const [row] = await queryAsUser((tx) =>
    tx.execute<{ first: string | null; last: string | null }>(sql`
      select to_char(min(m), 'YYYY-MM-DD') as first, to_char(max(m), 'YYYY-MM-DD') as last from (
        select s.month as m from public.app_sales s where s.deleted_at is null
        union all
        select date_trunc('month', c.spent_on)::date from public.costs c where c.deleted_at is null
      ) months`),
  );
  return { first: row?.first ?? null, last: row?.last ?? null };
}
