import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DashboardFilters } from "@/app/(app)/dashboard/_components/dashboard-filters";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { isUuid } from "@/lib/experts/normalize";
import { monthLabel, parseMonth } from "@/lib/finance/calc";
import { money } from "@/lib/finance/format";
import { getAppOptions, getEntryMonthRange, listSales } from "@/lib/finance/queries";
import { EmptyState, isAdmin, monthOptions, Restricted, Signed } from "../_components/finance-ui";

export const metadata: Metadata = {
  title: "Vendas",
};

export default function SalesPage({ searchParams }: PageProps<"/financeiro/vendas">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Vendas"
        description="Uma linha por app por mês, com os números do relatório da plataforma de vendas."
        actions={
          <Link href="/financeiro/vendas/nova" className={buttonVariants()}>
            Lançar vendas do mês
          </Link>
        }
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <SalesList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SalesList({ searchParams }: Pick<PageProps<"/financeiro/vendas">, "searchParams">) {
  if (!(await isAdmin())) return <Restricted />;
  const { mes, app } = await searchParams;
  const filters = { month: parseMonth(mes), appId: isUuid(app) ? app : null };
  const [rows, apps, range] = await Promise.all([listSales(filters), getAppOptions(), getEntryMonthRange()]);

  const sum = (pick: (row: (typeof rows)[number]) => number) => rows.reduce((total, row) => total + pick(row), 0);

  return (
    <DashboardFilters
      filters={[
        { param: "mes", label: "Mês", options: monthOptions(range), emptyLabel: "Todos os meses" },
        { param: "app", label: "App", options: apps.map((item) => ({ value: item.id, label: item.name })), emptyLabel: "Todos os apps" },
      ]}
    >
      {!rows.length ? (
        <EmptyState>
          {apps.length ? "Nenhum lançamento de vendas com esses filtros." : "Cadastre um app em Apps antes de lançar as vendas."}
        </EmptyState>
      ) : (
        <div className="rounded-lg border" data-allow-scroll>
          <Table aria-label="Lançamentos de vendas">
            <TableHeader>
              <TableRow>
                <TableHead>Mês · App</TableHead>
                <TableHead className="text-right">Vendas novas</TableHead>
                <TableHead className="text-right">Assinantes</TableHead>
                <TableHead className="text-right">Cancelamentos</TableHead>
                <TableHead className="text-right">Faturamento bruto</TableHead>
                <TableHead className="text-right">Taxas</TableHead>
                <TableHead className="text-right">Reembolsos</TableHead>
                <TableHead className="text-right">Comissão líquida</TableHead>
                <TableHead className="text-right">% empresa</TableHead>
                <TableHead className="text-right">Receita da empresa</TableHead>
                <TableHead className="text-right">Receita do influenciador</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{monthLabel(row.month)}</div>
                    <Link href={`/financeiro/apps/${row.appId}`} className="text-xs text-muted-foreground hover:underline">
                      {row.appName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.newSales.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.activeSubscribers.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.cancellations.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(row.grossRevenue)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(row.platformFees)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(row.refunds)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Signed value={row.net}>{money(row.net)}</Signed>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.companyShare}%</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{money(row.company)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(row.partner)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/financeiro/vendas/${row.id}/editar`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      Editar
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Total ({rows.length})</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{sum((row) => row.newSales).toLocaleString("pt-BR")}</TableCell>
                <TableCell />
                <TableCell className="text-right font-semibold tabular-nums">{sum((row) => row.cancellations).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{money(sum((row) => row.grossRevenue))}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{money(sum((row) => row.platformFees))}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{money(sum((row) => row.refunds))}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{money(sum((row) => row.net))}</TableCell>
                <TableCell />
                <TableCell className="text-right font-semibold tabular-nums" data-testid="sales-company-total">
                  {money(sum((row) => row.company))}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{money(sum((row) => row.partner))}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </DashboardFilters>
  );
}
