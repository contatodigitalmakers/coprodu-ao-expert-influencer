import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProposalView } from "@/components/proposal-view";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { getPublicProposal } from "@/lib/proposals/queries";
import { PublicActions } from "./public-actions";

export const metadata: Metadata = {
  title: "Proposta de co-produção",
  robots: { index: false, follow: false },
};

// Página pública da proposta (link único, sem login). Abrir registra a visualização.
export default function PublicProposalPage({ params }: PageProps<"/p/[token]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <PublicProposal params={params} />
      </Suspense>
    </main>
  );
}

async function PublicProposal({ params }: Pick<PageProps<"/p/[token]">, "params">) {
  const { token } = await params;
  const proposal = await getPublicProposal(token);
  if (!proposal) notFound();
  const canRespond = proposal.status === "sent" || proposal.status === "viewed";

  return (
    <>
      {proposal.status === "accepted" && (
        <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          Proposta aceita{proposal.acceptedAt ? ` em ${formatDateTime(new Date(proposal.acceptedAt))}` : ""}. Obrigado! Em
          breve entraremos em contato com os próximos passos.
        </p>
      )}
      {proposal.status === "rejected" && (
        <p role="status" className="rounded-lg bg-muted px-4 py-3 text-sm">
          Proposta recusada. Se mudar de ideia, fale com a gente.
        </p>
      )}
      <ProposalView proposal={proposal} />
      <PublicActions token={token} canRespond={canRespond} />
    </>
  );
}
