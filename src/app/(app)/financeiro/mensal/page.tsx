import type { Metadata } from "next";
import { Suspense } from "react";
import { DashboardFilters } from "@/app/(app)/dashboard/_components/dashboard-filters";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { currentMonth, monthLabel, niceMax, type MonthSummary } from "@/lib/finance/calc";
import { money, pct } from "@/lib/finance/format";
import { getEntryMonthRange, getMonthlySummary } from "@/lib/finance/queries";
import { isAdmin, Restricted, Signed } from "../_components/finance-ui";
import { MonthColumns } from "../_components/month-columns";

export const metadata: Metadata = {
  title: "Mês a mês",
};

export default function MonthlyPage({ searchParams }: PageProps<"/financeiro/mensal">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mês a mês"
        description="Evolução da empresa: receita, custos, resultado, resultado acumulado e gasto com IA."
      />
      <Suspense fallback={<Skeleton className="h-128 w-full" />}>
        <Monthly searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type Total = Omit<MonthSummary, "month">;

// Colunas da aba "Resumo Mensal".
const COLUMNS: { label: string; value: (row: Total) => string; signed?: (row: Total) => number }[] = [
  { label: "Faturamento bruto", value: (row) => money(row.grossRevenue) },
  { label: "Receita da empresa", value: (row) => money(row.companyRevenue) },
  { label: "Custos dos apps", value: (row) => money(row.appCosts) },
  { label: "Acerto a receber", value: (row) => money(row.partnerSettlement) },
  { label: "Lucro dos apps", value: (row) => money(row.appsProfit), signed: (row) => row.appsProfit },
  { label: "Custos gerais", value: (row) => money(row.generalCosts) },
  { label: "Resultado da empresa", value: (row) => money(row.result), signed: (row) => row.result },
  { label: "Resultado acumulado", value: (row) => money(row.cumulative), signed: (row) => row.cumulative },
  { label: "IA no app", value: (row) => money(row.aiApp) },
  { label: "IA de desenvolvimento", value: (row) => money(row.aiDevelopment) },
  { label: "IA total", value: (row) => money(row.aiTotal) },
  { label: "IA ÷ receita da empresa", value: (row) => pct(row.aiShare) },
  { label: "Assinantes ativos (todos os apps)", value: (row) => (row.activeSubscribers === null ? "—" : row.activeSubscribers.toLocaleString("pt-BR")) },
];

async function Monthly({ searchParams }: Pick<PageProps<"/financeiro/mensal">, "searchParams">) {
  if (!(await isAdmin())) return <Restricted />;
  const { ano } = await searchParams;
  const thisYear = Number(currentMonth().slice(0, 4));
  const year = typeof ano === "string" && /^\d{4}$/.test(ano) ? Number(ano) : thisYear;

  const [{ rows, total }, range] = await Promise.all([getMonthlySummary(year), getEntryMonthRange()]);
  const firstYear = Math.min(thisYear, Number(range.first?.slice(0, 4) ?? thisYear), year);
  const lastYear = Math.max(thisYear, Number(range.last?.slice(0, 4) ?? thisYear), year);
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => String(lastYear - index));

  // Mesma escala nos dois gráficos.
  const values = rows.flatMap((row) => [row.companyRevenue, row.result]);
  const top = niceMax(Math.max(0, ...values)) || 1;
  const bottom = -niceMax(Math.max(0, ...values.map((value) => -value)));
  const series = (pick: (row: MonthSummary) => number) => rows.map((row) => ({ month: row.month, label: monthLabel(row.month), value: pick(row) }));
  const hasEntries = rows.some((row) => row.companyRevenue || row.appCosts || row.generalCosts);

  return (
    <DashboardFilters filters={[{ param: "ano", label: "Ano", options: years.map((value) => ({ value, label: value })), defaultValue: String(thisYear) }]}>
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Receita da empresa x Resultado · {year}</CardTitle>
            <CardDescription>
              Receita da empresa = a parte dela na comissão líquida. Resultado = lucro dos apps − custos gerais. Os dois
              gráficos usam a mesma escala.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasEntries ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <MonthColumns title="Receita da empresa" months={series((row) => row.companyRevenue)} top={top} bottom={bottom} />
                <MonthColumns title="Resultado da empresa" months={series((row) => row.result)} top={top} bottom={bottom} />
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Sem lançamentos em {year}.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resultado mês a mês</CardTitle>
            <CardDescription>
              O acumulado soma o resultado desde o primeiro mês com lançamento
              {range.first ? ` (${monthLabel(range.first)})` : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div data-allow-scroll>
              <Table aria-label="Resultado mês a mês">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 bg-card">Mês</TableHead>
                    {COLUMNS.map((column) => (
                      <TableHead key={column.label} className="max-w-32 text-right whitespace-normal">
                        {column.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.month} data-testid={`month-${row.month.slice(0, 7)}`}>
                      <TableCell className="sticky left-0 z-10 bg-card font-medium">{monthLabel(row.month)}</TableCell>
                      {COLUMNS.map((column) => (
                        <TableCell key={column.label} className="text-right tabular-nums">
                          {column.signed ? <Signed value={column.signed(row)}>{column.value(row)}</Signed> : column.value(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow data-testid="year-total">
                    <TableCell className="sticky left-0 z-10 bg-muted font-semibold">Total {year}</TableCell>
                    {COLUMNS.map((column) => (
                      <TableCell key={column.label} className="text-right font-semibold tabular-nums">
                        {column.signed ? <Signed value={column.signed(total)}>{column.value(total)}</Signed> : column.value(total)}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardFilters>
  );
}
