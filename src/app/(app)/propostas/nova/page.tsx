import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getExpert } from "@/lib/experts/queries";
import { getActivePlans } from "@/lib/proposals/queries";
import { createProposalAction } from "../actions";
import { ProposalForm } from "../_components/proposal-form";

export const metadata: Metadata = {
  title: "Nova proposta",
};

export default function NewProposalPage({ searchParams }: PageProps<"/propostas/nova">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Nova proposta" />
      <Suspense fallback={<Skeleton className="h-96 max-w-3xl" />}>
        <NewProposal searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewProposal({ searchParams }: Pick<PageProps<"/propostas/nova">, "searchParams">) {
  const { lead } = await searchParams;
  const [expert, plans] = await Promise.all([getExpert(typeof lead === "string" ? lead : ""), getActivePlans()]);
  if (!expert) notFound();
  return (
    <ProposalForm
      expertName={expert.name}
      plans={plans}
      defaults={{ planId: null, extras: [] }}
      action={createProposalAction.bind(null, expert.id)}
      cancelHref={`/experts/${expert.id}`}
      submitLabel="Criar proposta (rascunho)"
    />
  );
}
