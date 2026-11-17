import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { monthLabel } from "@/lib/finance/calc";
import { money, pct } from "@/lib/finance/format";
import { getApp, getAppResults } from "@/lib/finance/queries";
import { formatDate } from "@/lib/format";
import { deleteAppAction } from "../../actions";
import { AppStatusBadge, isAdmin, Restricted, Signed, StatTile } from "../../_components/finance-ui";

export const metadata: Metadata = {
  title: "App",
};

export default function AppPage({ params }: PageProps<"/financeiro/apps/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 max-w-6xl" />}>
      <AppDetail params={params} />
    </Suspense>
  );
}

async function AppDetail({ params }: Pick<PageProps<"/financeiro/apps/[id]">, "params">) {
  if (!(await isAdmin())) return <Restricted />;
  const { id } = await params;
  const app = await getApp(id);
  if (!app) notFound();
  const results = await getAppResults(app);
  const { allTime } = results;

  const details: [string, string][] = [
    ["Influenciador", `${app.partnerName}${app.partnerHandle ? ` · @${app.partnerHandle}` : ""}`],
    ["Nicho", app.niche ?? "—"],
    ["Plataforma de venda", app.salesPlatform ?? "—"],
    ["Ticket mensal", app.monthlyPrice === null ? "—" : money(app.monthlyPrice)],
    ["Divisão", `${app.companyShare}% empresa / ${100 - app.companyShare}% influenciador`],
    ["Contrato", app.contractDate ? formatDate(app.contractDate) : "—"],
    ["Lançamento", app.launchDate ? formatDate(app.launchDate) : "—"],
  ];

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <PageHeader
        title={app.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <AppStatusBadge status={app.status} />
            {app.expertId && (
              <Link href={`/experts/${app.expertId}`} className="text-foreground underline-offset-4 hover:underline">
                Ver lead no CRM{app.expertName ? ` (${app.expertName})` : ""}
              </Link>
            )}
          </span>
        }
        actions={
          <>
            <Link href={`/financeiro/vendas/nova?app=${app.id}`} className={buttonVariants()}>
              Lançar vendas do mês
            </Link>
            <Link href={`/financeiro/custos/novo?app=${app.id}`} className={buttonVariants({ variant: "outline" })}>
              Lançar custo
            </Link>
            <Link href={`/financeiro/apps/${app.id}/editar`} className={buttonVariants({ variant: "outline" })}>
              Editar
            </Link>
            {!results.hasEntries && (
              <ConfirmDeleteButton
                title="Excluir este app?"
                description="O app sai da lista e dos resumos. Ele não tem lançamentos de vendas nem de custos."
                action={deleteAppAction.bind(null, app.id)}
              />
            )}
          </>
        }
      />

      <section aria-label="Desde o início" className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile label="Receita da empresa" value={money(allTime.companyRevenue)} detail={results.hasEntries ? `${monthLabel(results.first)} a ${monthLabel(results.last)}` : "sem lançamentos"} testId="app-revenue" />
        <StatTile label="Lucro do app" value={<Signed value={allTime.profit}>{money(allTime.profit)}</Signed>} testId="app-profit" />
        <StatTile label="Margem" value={pct(allTime.margin)} />
        <StatTile label="Acerto a receber" value={money(allTime.partnerSettlement)} detail="Parte do influenciador nos custos rateados" />
        <StatTile label="Assinantes ativos" value={allTime.activeSubscribers.toLocaleString("pt-BR")} detail={results.hasEntries ? monthLabel(results.last) : undefined} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Dados do app</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
            {details.map(([label, value]) => (
              <div key={label} className="flex min-w-0 flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="break-words">{value}</dd>
              </div>
            ))}
            {app.notes && (
              <div className="col-span-full flex flex-col gap-0.5">
                <dt className="text-xs text-muted-foreground">Observações</dt>
                <dd className="whitespace-pre-wrap">{app.notes}</dd>
              </div>
            )}
          </dl>
          {results.hasEntries && (
            <p className="text-xs text-muted-foreground">
              Este app tem lançamentos e não pode ser excluído. Para tirá-lo dos resumos, mude o status para Encerrado.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimos 12 meses</CardTitle>
          <CardDescription>
            <Link href={`/financeiro/vendas?app=${app.id}`} className="underline-offset-4 hover:underline">
              Ver vendas
            </Link>{" "}
            ·{" "}
            <Link href={`/financeiro/custos?app=${app.id}`} className="underline-offset-4 hover:underline">
              Ver custos
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!results.recent.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum lançamento ainda.</p>
          ) : (
            <div data-allow-scroll>
              <Table aria-label="Últimos 12 meses">
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-right">Vendas</TableHead>
                    <TableHead className="text-right">Assinantes</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">Receita da empresa</TableHead>
                    <TableHead className="text-right">Custos</TableHead>
                    <TableHead className="text-right">Acerto</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.recent.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">{monthLabel(row.month)}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.newSales.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.activeSubscribers.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(row.grossRevenue)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(row.companyRevenue)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(row.appCosts)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(row.partnerSettlement)}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        <Signed value={row.profit}>{money(row.profit)}</Signed>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
