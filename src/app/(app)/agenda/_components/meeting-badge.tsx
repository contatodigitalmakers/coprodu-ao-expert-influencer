import type { MeetingStatus } from "@/db/schema/enums";
import { Badge } from "@/components/ui/badge";
import { MEETING_STATUS_LABELS } from "@/lib/labels";

export function MeetingBadge({ status }: { status: MeetingStatus }) {
  const variant = status === "scheduled" ? "secondary" : status === "done" ? "default" : "outline";
  return <Badge variant={variant}>{MEETING_STATUS_LABELS[status]}</Badge>;
}
