import type { ProposalStatus } from "@/db/schema/enums";
import { Badge } from "@/components/ui/badge";
import { PROPOSAL_STATUS_LABELS } from "@/lib/labels";

export function ProposalBadge({ status }: { status: ProposalStatus }) {
  const variant = status === "accepted" ? "default" : status === "rejected" ? "destructive" : status === "draft" ? "outline" : "secondary";
  return <Badge variant={variant}>{PROPOSAL_STATUS_LABELS[status]}</Badge>;
}
