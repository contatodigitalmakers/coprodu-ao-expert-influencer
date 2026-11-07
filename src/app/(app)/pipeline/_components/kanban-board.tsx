"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useOptimistic, useState } from "react";
import type { LossReasonOption, PipelineCard, StageOption } from "@/lib/pipeline/queries";
import { cn } from "@/lib/utils";
import { PipelineCardView } from "./pipeline-card";
import { useStageMover } from "./stage-mover";

// Quantos cards cada coluna mostra (o total aparece no topo da coluna).
const CARDS_PER_COLUMN = 100;

type MoveAction = { expertId: string; stageId: string };

export function KanbanBoard({
  stages,
  cards,
  lossReasons,
}: {
  stages: StageOption[];
  cards: PipelineCard[];
  lossReasons: LossReasonOption[];
}) {
  // O card muda de coluna na hora; se o servidor recusar, volta sozinho.
  const [optimisticCards, applyMove] = useOptimistic(cards, (state, move: MoveAction) =>
    state.map((card) =>
      card.id === move.expertId ? { ...card, stageId: move.stageId, daysInStage: 0, isOverdue: false } : card,
    ),
  );
  const mover = useStageMover({
    lossReasons,
    onOptimisticMove: (expertId, stageId) => applyMove({ expertId, stageId }),
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const byStage = new Map<string, PipelineCard[]>();
  for (const card of optimisticCards) byStage.set(card.stageId, [...(byStage.get(card.stageId) ?? []), card]);
  const activeCard = optimisticCards.find((card) => card.id === activeId);
  const maxDaysOf = (stageId: string) => stages.find((stage) => stage.id === stageId)?.maxDays ?? null;

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    const card = optimisticCards.find((item) => item.id === active.id);
    const stage = stages.find((item) => item.id === over?.id);
    if (card && stage && card.stageId !== stage.id) mover.requestMove(card, stage);
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {mover.error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {mover.error}
        </p>
      )}
      <DndContext
        id="pipeline-board"
        sensors={sensors}
        onDragStart={({ active }) => setActiveId(String(active.id))}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <Column key={stage.id} stage={stage} cards={byStage.get(stage.id) ?? []} />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? (
            <PipelineCardView card={activeCard} maxDays={maxDaysOf(activeCard.stageId)} className="w-64 rotate-2 shadow-lg" />
          ) : null}
        </DragOverlay>
      </DndContext>
      {mover.dialogs}
    </div>
  );
}

function Column({ stage, cards }: { stage: StageOption; cards: PipelineCard[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const overdue = cards.filter((card) => card.isOverdue).length;

  return (
    <section
      ref={setNodeRef}
      aria-label={`Etapa ${stage.name}`}
      className={cn(
        "flex w-64 shrink-0 flex-col gap-2 rounded-xl bg-muted/50 p-2 transition-colors",
        isOver && "bg-muted ring-2 ring-ring/40",
      )}
    >
      <header className="flex items-baseline justify-between gap-2 px-1 pt-1">
        <h2 className="truncate text-sm font-medium">{stage.name}</h2>
        <span className="text-xs text-muted-foreground tabular-nums" data-testid="stage-count">
          {cards.length}
          {overdue > 0 && <span className="ml-1 text-destructive">· {overdue} parado(s)</span>}
        </span>
      </header>
      <div className="flex max-h-[calc(100vh-15rem)] min-h-24 flex-col gap-2 overflow-y-auto">
        {cards.slice(0, CARDS_PER_COLUMN).map((card) => (
          <DraggableCard key={card.id} card={card} maxDays={stage.maxDays} />
        ))}
        {cards.length > CARDS_PER_COLUMN && (
          <p className="px-1 text-xs text-muted-foreground">
            + {cards.length - CARDS_PER_COLUMN} na lista de experts
          </p>
        )}
      </div>
    </section>
  );
}

function DraggableCard({ card, maxDays }: { card: PipelineCard; maxDays: number | null }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label={`Lead ${card.name}`}
      className={cn("cursor-grab touch-none active:cursor-grabbing", isDragging && "opacity-40")}
    >
      <PipelineCardView card={card} maxDays={maxDays} />
    </div>
  );
}
