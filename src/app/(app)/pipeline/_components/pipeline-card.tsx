import { TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { formatFollowers, plural } from "@/lib/format";
import type { PipelineCard } from "@/lib/pipeline/queries";
import { cn } from "@/lib/utils";
import { ScoreBadge } from "../../experts/_components/badges";

// Conteúdo do card do Kanban: nome, @, nicho, seguidores, score,
// responsável e dias parado na etapa (com alerta acima do limite).
export function PipelineCardView({
  card,
  maxDays,
  className,
}: {
  card: PipelineCard;
  maxDays: number | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border bg-card p-3 text-sm shadow-xs",
        card.isOverdue && "border-destructive/60 bg-destructive/5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/experts/${card.id}`} draggable={false} className="block truncate font-medium hover:underline">
            {card.name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">@{card.handle}</p>
        </div>
        <ScoreBadge score={card.score} tier={card.scoreTier} />
      </div>
      <p className="truncate text-xs text-muted-foreground">
        {card.nicheName ?? "Sem nicho"} · {formatFollowers(card.followers)} seguidores
      </p>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-muted-foreground">{card.ownerName ?? "Não atribuído"}</span>
        <span
          className={cn("flex shrink-0 items-center gap-1", card.isOverdue ? "font-medium text-destructive" : "text-muted-foreground")}
          title={maxDays !== null ? `Limite da etapa: ${plural(maxDays, "dia", "dias")}` : undefined}
        >
          {card.isOverdue && <TriangleAlertIcon className="size-3.5" />}
          {plural(card.daysInStage, "dia", "dias")}
        </span>
      </div>
    </div>
  );
}
