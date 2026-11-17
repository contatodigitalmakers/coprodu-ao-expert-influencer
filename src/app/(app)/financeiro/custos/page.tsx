import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DashboardFilters } from "@/app/(app)/dashboard/_components/dashboard-filters";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { costCategory } from "@/db/schema/enums";
import { isUuid } from "@/lib/experts/normalize";
import { parseMonth } from "@/lib/finance/calc";
import { money } from "@/lib/finance/format";
import { COST_CATEGORIES, COST_GROUP_LABELS, GENERAL_COSTS } from "@/lib/finance/labels";
import { getAppOptions, getEntryMonthRange, listCosts } from "@/lib/finance/queries";
import { formatDate } from "@/lib/format";
import { EmptyState, isAdmin, monthOptions, Restricted } from "../_components/finance-ui";

export const metadata: Metadata = {
  title: "Custos",
};

export default function CostsPage({ searchParams }: PageProps<"/financeiro/custos">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Custos"
        description="Uma linha por despesa: do app, quando é dele, ou Geral, quando é da empresa (inclui impostos)."
        actions={
          <Link href="/financeiro/custos/novo" className={buttonVariants()}>
            Lançar custo
          </Link>
        }
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <CostList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CostList({ searchParams }: Pick<PageProps<"/financeiro/custos">, "searchParams">) {
  if (!(await isAdmin())) return <Restricted />;
  const { mes, app, categoria } = await searchParams;
  const filters = {
    month: parseMonth(mes),
    appId: app === GENERAL_COSTS ? GENERAL_COSTS : isUuid(app) ? app : null,
    category: costCategory.enumValues.find((value) => value === categoria) ?? null,
  };
  const [rows, apps, range] = await Promise.all([listCosts(filters), getAppOptions(), getEntryMonthRange()]);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const partnerTotal = rows.reduce((sum, row) => sum + row.partnerAmount, 0);

  return (
    <DashboardFilters
      filters={[
        { param: "mes", label: "Mês", options: monthOptions(range), emptyLabel: "Todos os meses" },
        {
          param: "app",
          label: "App",
          options: [{ value: GENERAL_COSTS, label: "Geral (empresa)" }, ...apps.map((item) => ({ value: item.id, label: item.name }))],
          emptyLabel: "Todos os apps e Geral",
        },
        {
          param: "categoria",
          label: "Categoria",
          options: Object.entries(COST_CATEGORIES).map(([value, { label }]) => ({ value, label })),
          emptyLabel: "Todas as categorias",
        },
      ]}
    >
      {!rows.length ? (
        <EmptyState>Nenhum custo com esses filtros.</EmptyState>
      ) : (
        <div className="rounded-lg border" data-allow-scroll>
          <Table aria-label="Lançamentos de custos">
            <TableHeader>
              <TableRow>
                <TableHead>Data · App</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="max-md:hidden">Fornecedor · Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Rateado</TableHead>
                <TableHead className="text-right">A receber do influenciador</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const category = COST_CATEGORIES[row.category];
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{formatDate(row.spentOn)}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.appId ? (
                          <Link href={`/financeiro/apps/${row.appId}`} className="hover:underline">
                            {row.appName}
                          </Link>
                        ) : (
                          "Geral (empresa)"
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {category.label}
                      <div className="text-xs text-muted-foreground">{COST_GROUP_LABELS[category.group]}</div>
                    </TableCell>
                    <TableCell className="max-w-64 text-muted-foreground max-md:hidden">
                      <div className="truncate">{row.supplier ?? "—"}</div>
                      {row.description && <div className="truncate text-xs">{row.description}</div>}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{money(row.amount)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{row.shared ? `Sim · ${row.partnerShare}%` : "Não"}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.shared ? money(row.partnerAmount) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/financeiro/custos/${row.id}/editar`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                        Editar
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">Total ({rows.length})</TableCell>
                <TableCell />
                <TableCell className="max-md:hidden" />
                <TableCell className="text-right font-semibold tabular-nums" data-testid="costs-total">
                  {money(total)}
                </TableCell>
                <TableCell />
                <TableCell className="text-right font-semibold tabular-nums" data-testid="costs-partner-total">
                  {money(partnerTotal)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </DashboardFilters>
  );
}
