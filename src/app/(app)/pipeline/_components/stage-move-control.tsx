"use client";

import { SimpleSelect } from "@/components/simple-select";
import type { LossReasonOption, StageOption } from "@/lib/pipeline/queries";
import { useStageMover } from "./stage-mover";

// "Mover etapa" na ficha do expert (inclui reativar um lead perdido).
export function StageMoveControl({
  expert,
  currentStageId,
  stages,
  lossReasons,
}: {
  expert: { id: string; name: string };
  currentStageId: string;
  stages: StageOption[];
  lossReasons: LossReasonOption[];
}) {
  const mover = useStageMover({ lossReasons });
  const isLost = stages.find((stage) => stage.id === currentStageId)?.isLost;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SimpleSelect
        aria-label="Mover etapa"
        placeholder={isLost ? "Reativar para…" : "Mover etapa…"}
        className="w-48"
        options={stages.filter((stage) => stage.id !== currentStageId).map((stage) => ({ value: stage.id, label: stage.name }))}
        value={null}
        onValueChange={(stageId) => {
          const stage = stages.find((item) => item.id === stageId);
          if (stage) mover.requestMove(expert, stage);
        }}
      />
      {mover.isPending && <span className="text-sm text-muted-foreground">Movendo…</span>}
      {mover.error && (
        <p role="alert" className="text-sm text-destructive">
          {mover.error}
        </p>
      )}
      {mover.dialogs}
    </div>
  );
}
