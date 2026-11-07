"use client";

import { TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useOptimistic } from "react";
import { SimpleSelect } from "@/components/simple-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { plural } from "@/lib/format";
import type { LossReasonOption, PipelineCard, StageOption } from "@/lib/pipeline/queries";
import { cn } from "@/lib/utils";
import { ScoreBadge } from "../../experts/_components/badges";
import { useStageMover } from "./stage-mover";

// Visão em lista do pipeline: por etapa e, dentro dela, os mais parados primeiro.
export function PipelineList({
  stages,
  cards,
  lossReasons,
}: {
  stages: StageOption[];
  cards: PipelineCard[];
  lossReasons: LossReasonOption[];
}) {
  const [optimisticCards, applyMove] = useOptimistic(cards, (state, move: { expertId: string; stageId: string }) =>
    state.map((card) => (card.id === move.expertId ? { ...card, stageId: move.stageId, daysInStage: 0, isOverdue: false } : card)),
  );
  const mover = useStageMover({ lossReasons, onOptimisticMove: (expertId, stageId) => applyMove({ expertId, stageId }) });

  const order = new Map(stages.map((stage, index) => [stage.id, index]));
  const rows = [...optimisticCards].sort(
    (a, b) => (order.get(a.stageId) ?? 0) - (order.get(b.stageId) ?? 0) || b.daysInStage - a.daysInStage,
  );
  const stageName = (id: string) => stages.find((stage) => stage.id === id)?.name ?? "—";

  if (!rows.length) {
    return <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Nenhum lead no pipeline.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {mover.error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {mover.error}
        </p>
      )}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Expert</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Na etapa há</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Score</TableHead>
              <TableHead className="w-52">Mover para</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((card) => (
              <TableRow key={card.id}>
                <TableCell>
                  <Link href={`/experts/${card.id}`} className="font-medium hover:underline">
                    {card.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">@{card.handle}</div>
                </TableCell>
                <TableCell>{stageName(card.stageId)}</TableCell>
                <TableCell className={cn(card.isOverdue && "font-medium text-destructive")}>
                  <span className="flex items-center gap-1">
                    {card.isOverdue && <TriangleAlertIcon className="size-3.5" />}
                    {plural(card.daysInStage, "dia", "dias")}
                  </span>
                </TableCell>
                <TableCell>{card.ownerName ?? <span className="text-muted-foreground">Não atribuído</span>}</TableCell>
                <TableCell>
                  <ScoreBadge score={card.score} tier={card.scoreTier} />
                </TableCell>
                <TableCell>
                  <SimpleSelect
                    aria-label={`Mover ${card.name}`}
                    placeholder="Escolha a etapa"
                    options={stages
                      .filter((stage) => stage.id !== card.stageId)
                      .map((stage) => ({ value: stage.id, label: stage.name }))}
                    value={null}
                    onValueChange={(stageId) => {
                      const stage = stages.find((item) => item.id === stageId);
                      if (stage) mover.requestMove(card, stage);
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {mover.dialogs}
    </div>
  );
}
