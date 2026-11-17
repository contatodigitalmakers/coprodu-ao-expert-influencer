import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { appStatus, type AppStatus } from "@/db/schema/enums";
import { money } from "@/lib/finance/format";
import { APP_STATUS_LABELS } from "@/lib/finance/labels";
import { listApps } from "@/lib/finance/queries";
import { formatDate } from "@/lib/format";
import { AppStatusBadge, EmptyState, isAdmin, Restricted, ShortcutLinks } from "../_components/finance-ui";

export const metadata: Metadata = {
  title: "Apps",
};

export default function AppsPage({ searchParams }: PageProps<"/financeiro/apps">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Apps"
        description="Os apps em coprodução: influenciador, divisão da receita e status."
        actions={
          <Link href="/financeiro/apps/novo" className={buttonVariants()}>
            Novo app
          </Link>
        }
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AppList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AppList({ searchParams }: Pick<PageProps<"/financeiro/apps">, "searchParams">) {
  if (!(await isAdmin())) return <Restricted />;
  const { status } = await searchParams;
  const filter = appStatus.enumValues.find((value) => value === status) ?? null;
  const all = await listApps();
  const rows = filter ? all.filter((app) => app.status === filter) : all;

  const counts = new Map<AppStatus, number>();
  for (const app of all) counts.set(app.status, (counts.get(app.status) ?? 0) + 1);

  if (!all.length) {
    return <EmptyState>Nenhum app cadastrado. Cadastre o primeiro em “Novo app”.</EmptyState>;
  }

  return (
    <div className="flex flex-col gap-4">
      <ShortcutLinks
        label="Apps por status"
        links={[
          { href: "/financeiro/apps", label: `Todos (${all.length})`, active: !filter },
          ...appStatus.enumValues
            .filter((value) => counts.has(value))
            .map((value) => ({
              href: `/financeiro/apps?status=${value}`,
              label: `${APP_STATUS_LABELS[value]} (${counts.get(value)})`,
              active: filter === value,
            })),
        ]}
      />
      <div className="rounded-lg border" data-allow-scroll>
        <Table aria-label="Apps">
          <TableHeader>
            <TableRow>
              <TableHead>App</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">% empresa</TableHead>
              <TableHead className="text-right max-md:hidden">Ticket mensal</TableHead>
              <TableHead className="max-md:hidden">Plataforma</TableHead>
              <TableHead className="max-md:hidden">Contrato</TableHead>
              <TableHead className="max-md:hidden">Lançamento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((app) => (
              <TableRow key={app.id}>
                <TableCell>
                  <Link href={`/financeiro/apps/${app.id}`} className="font-medium hover:underline">
                    {app.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {app.partnerName}
                    {app.partnerHandle && ` · @${app.partnerHandle}`}
                    {app.niche && ` · ${app.niche}`}
                  </div>
                </TableCell>
                <TableCell>
                  <AppStatusBadge status={app.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {app.companyShare}%<div className="text-xs text-muted-foreground">influenciador {100 - app.companyShare}%</div>
                </TableCell>
                <TableCell className="text-right tabular-nums max-md:hidden">{app.monthlyPrice === null ? "—" : money(app.monthlyPrice)}</TableCell>
                <TableCell className="text-muted-foreground max-md:hidden">{app.salesPlatform ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground max-md:hidden">{app.contractDate ? formatDate(app.contractDate) : "—"}</TableCell>
                <TableCell className="text-muted-foreground max-md:hidden">{app.launchDate ? formatDate(app.launchDate) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
