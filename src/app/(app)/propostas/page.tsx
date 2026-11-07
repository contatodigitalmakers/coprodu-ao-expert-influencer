import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { ProposalStatus } from "@/db/schema/enums";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { PROPOSAL_STATUS_LABELS } from "@/lib/labels";
import { listProposals } from "@/lib/proposals/queries";
import { cn } from "@/lib/utils";
import { ProposalBadge } from "./_components/proposal-badge";

export const metadata: Metadata = {
  title: "Propostas",
};

export default function ProposalsPage({ searchParams }: PageProps<"/propostas">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Propostas" description="Crie uma proposta pela ficha do expert." />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <ProposalList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ProposalList({ searchParams }: Pick<PageProps<"/propostas">, "searchParams">) {
  const params = await searchParams;
  const status = typeof params.status === "string" && params.status in PROPOSAL_STATUS_LABELS ? (params.status as ProposalStatus) : null;
  const rows = await listProposals(status);
  const chip = (active: boolean) => cn(buttonVariants({ variant: active ? "secondary" : "ghost", size: "sm" }));

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex flex-wrap gap-1" aria-label="Status">
        <Link href="/propostas" className={chip(!status)}>
          Todas
        </Link>
        {Object.entries(PROPOSAL_STATUS_LABELS).map(([value, label]) => (
          <Link key={value} href={`/propostas?status=${value}`} className={chip(status === value)}>
            {label}
          </Link>
        ))}
      </nav>
      {!rows.length ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Nenhuma proposta.</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Expert</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criada em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((proposal) => (
                <TableRow key={proposal.id}>
                  <TableCell>
                    <Link href={`/propostas/${proposal.id}`} className="font-medium hover:underline">
                      {proposal.expertName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {proposal.planName} · {proposal.expertShare}/{proposal.ourShare}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(proposal.total)}</TableCell>
                  <TableCell>
                    <ProposalBadge status={proposal.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(proposal.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
