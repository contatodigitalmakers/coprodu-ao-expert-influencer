import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { ProposalRow } from "@/lib/proposals/queries";
import { ProposalBadge } from "../../propostas/_components/proposal-badge";

export function ProposalsCard({ expertId, proposals }: { expertId: string; proposals: ProposalRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Propostas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {proposals.length > 0 && (
          <ul className="flex flex-col gap-1.5" aria-label="Propostas do lead">
            {proposals.map((proposal) => (
              <li key={proposal.id} className="flex items-center justify-between gap-2">
                <Link href={`/propostas/${proposal.id}`} className="hover:underline">
                  {proposal.planName} · {formatCurrency(proposal.total)}
                </Link>
                <ProposalBadge status={proposal.status} />
              </li>
            ))}
          </ul>
        )}
        <Link href={`/propostas/nova?lead=${expertId}`} className={buttonVariants({ variant: "outline", size: "sm", className: "self-start" })}>
          Nova proposta
        </Link>
      </CardContent>
    </Card>
  );
}
