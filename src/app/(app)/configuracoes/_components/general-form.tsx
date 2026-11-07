"use client";

import { useState, useTransition } from "react";
import { SimpleSelect } from "@/components/simple-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SettingsFormState } from "../actions";

export function GeneralForm({
  stages,
  defaults,
  action,
}: {
  stages: { id: string; name: string }[];
  defaults: { acceptedProposalStageId: string; reactivationDays: number };
  action: (values: { acceptedProposalStageId: string; reactivationDays: string }) => Promise<SettingsFormState>;
}) {
  const [stageId, setStageId] = useState<string | null>(defaults.acceptedProposalStageId);
  const [days, setDays] = useState(String(defaults.reactivationDays));
  const [state, setState] = useState<SettingsFormState>({});
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Parâmetros gerais</CardTitle>
        <CardDescription>
          Para onde o lead vai quando aceita a proposta, e em quantos dias um lead perdido por falta de resposta
          volta para a fila de reativação.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="accepted-stage">Proposta aceita leva para</Label>
            <SimpleSelect
              id="accepted-stage"
              options={stages.map((stage) => ({ value: stage.id, label: stage.name }))}
              value={stageId}
              onValueChange={setStageId}
            />
            <p className="text-xs text-muted-foreground">Ganho é marcado no pipeline (exige contrato e pagamento).</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="reactivation-days">Dias até a reativação</Label>
            <Input id="reactivation-days" inputMode="numeric" value={days} onChange={(event) => setDays(event.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(async () => setState(await action({ acceptedProposalStageId: stageId ?? "", reactivationDays: days })))}
          >
            {isPending ? "Salvando…" : "Salvar parâmetros"}
          </Button>
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          {state.message && !state.error && <p className="text-sm text-muted-foreground">{state.message}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
