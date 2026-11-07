import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ProposalView } from "@/components/proposal-view";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { getProposal } from "@/lib/proposals/queries";
import { ProposalActions } from "../_components/proposal-actions";
import { ProposalBadge } from "../_components/proposal-badge";

export const metadata: Metadata = {
  title: "Proposta",
};

export default function ProposalPage({ params }: PageProps<"/propostas/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 max-w-3xl" />}>
      <Proposal params={params} />
    </Suspense>
  );
}

async function Proposal({ params }: Pick<PageProps<"/propostas/[id]">, "params">) {
  const { id } = await params;
  const proposal = await getProposal(id);
  if (!proposal) notFound();

  const dates = [
    ["Criada", proposal.createdAt],
    ["Enviada", proposal.sentAt],
    ["Visualizada pelo expert", proposal.viewedAt],
    ["Aceita", proposal.acceptedAt],
  ] as const;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title={
          <>
            Proposta ·{" "}
            <Link href={`/experts/${proposal.expertId}`} className="hover:underline">
              {proposal.expertName}
            </Link>
          </>
        }
        actions={<ProposalBadge status={proposal.status} />}
      />
      <ProposalActions
        proposalId={proposal.id}
        status={proposal.status}
        publicToken={proposal.publicToken}
        expertId={proposal.expertId}
      />
      <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground" aria-label="Histórico da proposta">
        {dates.map(([label, date]) =>
          date ? (
            <li key={label}>
              {label}: {formatDateTime(date)}
            </li>
          ) : null,
        )}
      </ul>
      <Card>
        <CardContent>
          <ProposalView proposal={proposal} />
        </CardContent>
      </Card>
    </div>
  );
}
