import type { ScoreTier } from "@/db/schema/enums";
import { Badge } from "@/components/ui/badge";
import type { TagItem } from "@/lib/experts/queries";
import { cn } from "@/lib/utils";

const TIER_STYLES: Record<ScoreTier, string> = {
  A: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  B: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  C: "bg-muted text-muted-foreground",
};

// Selo do score (A, B ou C). Sem score calculado, mostra "—".
export function ScoreBadge({ score, tier }: { score: number | null; tier: ScoreTier | null }) {
  if (score === null || tier === null) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge className={cn("gap-1 border-transparent", TIER_STYLES[tier])}>
      {tier} <span className="font-normal opacity-80">{score}</span>
    </Badge>
  );
}

export function TagBadge({ tag }: { tag: Pick<TagItem, "name" | "color"> }) {
  return (
    <Badge variant="outline" className="gap-1.5 font-normal">
      <span className="size-2 rounded-full" style={{ backgroundColor: tag.color }} />
      {tag.name}
    </Badge>
  );
}
