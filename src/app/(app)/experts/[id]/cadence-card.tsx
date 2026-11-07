import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExpertCadence } from "@/lib/cadences/queries";
import { formatDate } from "@/lib/format";
import { CHANNEL_LABELS, ENROLLMENT_STATUS_LABELS, TASK_OUTCOME_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { endCadence, enrollInCadence } from "../actions";
import { EnrollForm } from "./enroll-form";

// Cadência do lead na ficha: inscrição, tarefas e encerramento.
export function CadenceCard({
  expertId,
  cadence,
  options,
}: {
  expertId: string;
  cadence: ExpertCadence | null;
  options: { id: string; name: string }[];
}) {
  const isActive = cadence?.status === "active";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadência</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {cadence && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{cadence.cadenceName}</span>
              <Badge variant={isActive ? "secondary" : "outline"}>{ENROLLMENT_STATUS_LABELS[cadence.status]}</Badge>
            </div>
            <ol className="flex flex-col gap-1.5" aria-label="Tarefas da cadência">
              {cadence.tasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-2">
                  <span className={cn(task.status === "skipped" && "text-muted-foreground line-through")}>
                    {task.dayOffset !== null && `D${task.dayOffset} · `}
                    {CHANNEL_LABELS[task.channel]}
                    <span className="text-muted-foreground"> · {formatDate(task.dueDate)}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {task.status === "done" && task.outcome
                      ? TASK_OUTCOME_LABELS[task.outcome]
                      : task.status === "skipped"
                        ? "Pulada"
                        : "Pendente"}
                  </span>
                </li>
              ))}
            </ol>
            {isActive && (
              <form action={endCadence.bind(null, expertId)}>
                <Button type="submit" variant="outline" size="sm">
                  Encerrar cadência
                </Button>
              </form>
            )}
          </div>
        )}
        {!isActive && <EnrollForm action={enrollInCadence.bind(null, expertId)} options={options} />}
      </CardContent>
    </Card>
  );
}
