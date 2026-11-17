import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DashboardFilters } from "@/app/(app)/dashboard/_components/dashboard-filters";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addMonths, currentMonth, monthLabel, parseMonth, type AppSummary } from "@/lib/finance/calc";
import { decimal, money, pct } from "@/lib/finance/format";
import { getEntryMonthRange, getPeriodSummary } from "@/lib/finance/queries";
import { cn } from "@/lib/utils";
import { AppStatusBadge, EmptyState, isAdmin, monthOptions, Restricted, ShortcutLinks, Signed, StatTile } from "./_components/finance-ui";

export const metadata: Metadata = {
  title: "Resumo financeiro",
};

export default function FinanceSummaryPage({ searchParams }: PageProps<"/financeiro">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Resumo financeiro"
        description="Resultado de cada app e da empresa no período, a partir dos lançamentos de Vendas e Custos."
        actions={
          <>
            <Link href="/financeiro/vendas/nova" className={buttonVariants({ variant: "outline" })}>
              Lançar vendas
            </Link>
            <Link href="/financeiro/custos/novo" className={buttonVariants({ variant: "outline" })}>
              Lançar custo
            </Link>
          </>
        }
      />
      <Suspense fallback={<Skeleton className="h-128 w-full" />}>
        <Summary searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// Colunas da tabela por app (as da aba "Resumo por App").
const COLUMNS: { label: string; value: (row: AppSummary) => string; signed?: (row: AppSummary) => number }[] = [
  { label: "Vendas novas", value: (row) => row.newSales.toLocaleString("pt-BR") },
  { label: "Faturamento bruto", value: (row) => money(row.grossRevenue) },
  { label: "Comissão líquida", value: (row) => money(row.netRevenue) },
  { label: "Receita da empresa", value: (row) => money(row.companyRevenue) },
  { label: "Custos do app", value: (row) => money(row.appCosts) },
  { label: "dos quais tráfego", value: (row) => money(row.trafficCosts) },
  { label: "dos quais IA no app", value: (row) => money(row.aiAppCosts) },
  { label: "Acerto a receber do influenciador", value: (row) => money(row.partnerSettlement) },
  { label: "Lucro do app", value: (row) => money(row.profit), signed: (row) => row.profit },
  { label: "Margem (lucro ÷ receita)", value: (row) => pct(row.margin) },
  { label: "Assinantes ativos (mês final)", value: (row) => row.activeSubscribers.toLocaleString("pt-BR") },
  { label: "IA por assinante (mês final)", value: (row) => (row.aiPerSubscriber === null ? "—" : money(row.aiPerSubscriber)) },
  { label: "CPA do tráfego", value: (row) => (row.cpa === null ? "—" : money(row.cpa)) },
  { label: "ROAS (faturamento ÷ tráfego)", value: (row) => decimal(row.roas) },
  { label: "Participação na receita", value: (row) => pct(row.revenueShare) },
];

async function Summary({ searchParams }: Pick<PageProps<"/financeiro">, "searchParams">) {
  if (!(await isAdmin())) return <Restricted />;
  const params = await searchParams;
  const now = currentMonth();
  let from = parseMonth(params.de) ?? now;
  let to = parseMonth(params.ate) ?? now;
  if (from > to) [from, to] = [to, from];

  const [summary, range] = await Promise.all([getPeriodSummary({ from, to }), getEntryMonthRange()]);
  const options = monthOptions(range);
  const query = (start: string, end: string) => {
    const search = new URLSearchParams();
    if (start !== now) search.set("de", start.slice(0, 7));
    if (end !== now) search.set("ate", end.slice(0, 7));
    return `/financeiro${search.size ? `?${search}` : ""}`;
  };
  const yearStart = `${now.slice(0, 4)}-01-01`;
  const periodLabel = from === to ? monthLabel(from) : `${monthLabel(from)} a ${monthLabel(to)}`;
  const { company, total } = summary;
  // App encerrado só aparece se tiver lançamento no período.
  const rows = summary.rows.filter((row) => row.status !== "closed" || row.grossRevenue || row.appCosts || row.newSales);

  return (
    <DashboardFilters
      filters={[
        { param: "de", label: "Mês inicial", options, defaultValue: now.slice(0, 7) },
        { param: "ate", label: "Mês final", options, defaultValue: now.slice(0, 7) },
      ]}
    >
      <div className="flex flex-col gap-6">
        <ShortcutLinks
          label="Atalhos de período"
          links={[
            { href: query(now, now), label: "Mês atual", active: from === now && to === now },
            { href: query(addMonths(now, -2), now), label: "Últimos 3 meses", active: from === addMonths(now, -2) && to === now },
            { href: query(yearStart, now), label: "Ano atual", active: from === yearStart && to === now && from !== now },
          ]}
        />

        <section aria-label="Resultado da empresa" className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))]">
          <Card className="lap-heroi">
            <CardContent className="relative z-10 flex flex-col gap-2">
              <p className="lap-rotulo">Resultado da empresa · {periodLabel}</p>
              <p className={cn("lap-numero text-5xl md:text-6xl", company.result < 0 && "text-destructive")} data-testid="company-result">
                {money(company.result)}
              </p>
              <p className="text-xs text-muted-foreground">Lucro de todos os apps − custos gerais (inclui impostos).</p>
            </CardContent>
          </Card>
          <StatTile label="Lucro de todos os apps" value={money(company.appsProfit)} testId="apps-profit" />
          <StatTile label="Custos gerais (empresa)" value={money(company.generalCosts)} testId="general-costs" />
        </section>
        <section aria-label="Indicadores" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Receita da empresa" value={money(total.companyRevenue)} testId="company-revenue" />
          <StatTile label="Gasto total com IA" value={money(company.aiTotal)} detail="IA no app + IA de desenvolvimento" testId="ai-total" />
          <StatTile label="Margem dos apps" value={pct(total.margin)} testId="apps-margin" />
          <StatTile label="Concentração" value={pct(company.concentration)} detail="Maior app ÷ receita total" testId="concentration" />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Resultado por app</CardTitle>
            <CardDescription>
              Lucro do app = receita da empresa − custos do app + acerto a receber do influenciador. Assinantes e IA por
              assinante usam o mês final ({monthLabel(to)}).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!rows.length ? (
              <EmptyState>
                Nenhum app cadastrado. Comece em{" "}
                <Link href="/financeiro/apps/novo" className="text-foreground underline underline-offset-4">
                  Apps → Novo app
                </Link>
                .
              </EmptyState>
            ) : (
              <div data-allow-scroll>
                <Table aria-label="Resultado por app">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 z-10 bg-card">App</TableHead>
                      {COLUMNS.map((column) => (
                        <TableHead key={column.label} className="max-w-32 text-right whitespace-normal">
                          {column.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="sticky left-0 z-10 bg-card">
                          <Link href={`/financeiro/apps/${row.id}`} className="font-medium hover:underline">
                            {row.name}
                          </Link>
                          <div className="mt-1">
                            <AppStatusBadge status={row.status} />
                          </div>
                        </TableCell>
                        {COLUMNS.map((column) => (
                          <TableCell key={column.label} className="text-right tabular-nums">
                            {column.signed ? <Signed value={column.signed(row)}>{column.value(row)}</Signed> : column.value(row)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow data-testid="summary-total">
                      <TableCell className="sticky left-0 z-10 bg-muted font-semibold">Total</TableCell>
                      {COLUMNS.map((column) => (
                        <TableCell key={column.label} className="text-right font-semibold tabular-nums">
                          {column.signed ? <Signed value={column.signed(total)}>{column.value(total)}</Signed> : column.value(total)}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardFilters>
  );
}
