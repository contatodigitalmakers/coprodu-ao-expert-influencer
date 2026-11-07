import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getActivePlans, getProposal } from "@/lib/proposals/queries";
import { updateProposalAction } from "../../actions";
import { ProposalForm } from "../../_components/proposal-form";

export const metadata: Metadata = {
  title: "Editar proposta",
};

export default function EditProposalPage({ params }: PageProps<"/propostas/[id]/editar">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Editar proposta" description="Só rascunhos podem ser editados." />
      <Suspense fallback={<Skeleton className="h-96 max-w-3xl" />}>
        <EditProposal params={params} />
      </Suspense>
    </div>
  );
}

async function EditProposal({ params }: Pick<PageProps<"/propostas/[id]/editar">, "params">) {
  const { id } = await params;
  const [proposal, plans] = await Promise.all([getProposal(id), getActivePlans()]);
  if (!proposal) notFound();
  if (proposal.status !== "draft") redirect(`/propostas/${proposal.id}`);
  return (
    <ProposalForm
      expertName={proposal.expertName}
      plans={plans}
      defaults={{ planId: proposal.planId, extras: proposal.extras }}
      action={updateProposalAction.bind(null, proposal.id)}
      cancelHref={`/propostas/${proposal.id}`}
      submitLabel="Salvar rascunho"
    />
  );
}
