"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import type { ScoreWeights } from "@/db/schema/catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ENGAGEMENT_FOR_FULL_POINTS, SCORE_CRITERIA } from "@/lib/score";
import { cn } from "@/lib/utils";
import type { SettingsFormState } from "../actions";

export function ScoreWeightsForm({
  weights,
  action,
}: {
  weights: ScoreWeights;
  action: (prev: SettingsFormState, formData: FormData) => Promise<SettingsFormState>;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(SCORE_CRITERIA.map(({ key }) => [key, String(weights[key])])),
  );
  const total = Object.values(values).reduce((sum, value) => sum + (Number(value) || 0), 0);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Score de qualificação (ICP)</CardTitle>
        <CardDescription>
          Nota de 0 a 100: cada critério atendido soma o seu peso. Classificação: A (70 ou mais), B (40 a
          69) e C (abaixo de 40). O engajamento vale proporcionalmente até {ENGAGEMENT_FOR_FULL_POINTS}% e,
          a partir daí, ganha o peso cheio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {SCORE_CRITERIA.map(({ key, label }) => (
              <div key={key} className="grid gap-1.5">
                <Label htmlFor={`weight-${key}`}>{label}</Label>
                <Input
                  id={`weight-${key}`}
                  name={key}
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={values[key]}
                  onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
                />
              </div>
            ))}
          </div>
          <p className={cn("text-sm", total === 100 ? "text-muted-foreground" : "text-destructive")}>
            Soma dos pesos: {total} {total !== 100 && "(precisa ser 100)"}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando…" : "Salvar pesos"}
            </Button>
            {state.error && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            )}
            {state.message && !state.error && <p className="text-sm text-muted-foreground">{state.message}</p>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
