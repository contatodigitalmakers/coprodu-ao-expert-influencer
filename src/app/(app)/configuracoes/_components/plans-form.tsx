"use client";

import { PlusIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SettingsFormState } from "../actions";

type Plan = { id: string | null; name: string; setupValue: number; expertShare: number; active: boolean };
type Row = { uid: string; id: string | null; name: string; setupValue: string; expertShare: string; active: boolean };

export function PlansForm({
  plans,
  action,
}: {
  plans: Plan[];
  action: (rows: { id: string | null; name: string; setupValue: string; expertShare: string; active: boolean }[]) => Promise<SettingsFormState>;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    plans.map((plan) => ({ ...plan, uid: plan.id ?? crypto.randomUUID(), setupValue: String(plan.setupValue), expertShare: String(plan.expertShare) })),
  );
  const [state, setState] = useState<SettingsFormState>({});
  const [isPending, startTransition] = useTransition();
  const update = (uid: string, changes: Partial<Row>) => setRows((current) => current.map((row) => (row.uid === uid ? { ...row, ...changes } : row)));

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Planos</CardTitle>
        <CardDescription>
          Setup e divisão da receita recorrente (expert / nós). Mudanças valem para novas propostas; as já criadas
          mantêm os valores.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-[1fr_7rem_6rem_4rem_auto] gap-2 text-xs text-muted-foreground">
          <span>Plano</span>
          <span>Setup (R$)</span>
          <span>% expert</span>
          <span>% nós</span>
          <span>Ativo</span>
        </div>
        {rows.map((row, index) => (
          <div key={row.uid} className="grid grid-cols-[1fr_7rem_6rem_4rem_auto] items-center gap-2">
            <Input aria-label={`Nome do plano ${index + 1}`} value={row.name} onChange={(event) => update(row.uid, { name: event.target.value })} />
            <Input
              aria-label={`Setup do plano ${row.name || index + 1}`}
              inputMode="decimal"
              value={row.setupValue}
              onChange={(event) => update(row.uid, { setupValue: event.target.value })}
            />
            <Input
              aria-label={`Percentual do expert no plano ${row.name || index + 1}`}
              inputMode="numeric"
              value={row.expertShare}
              onChange={(event) => update(row.uid, { expertShare: event.target.value })}
            />
            <span className="text-sm tabular-nums text-muted-foreground">
              {Number.isFinite(Number(row.expertShare)) ? 100 - Number(row.expertShare) : "—"}%
            </span>
            <input
              type="checkbox"
              aria-label={`Plano ${row.name || index + 1} ativo`}
              className="size-4"
              checked={row.active}
              onChange={(event) => update(row.uid, { active: event.target.checked })}
            />
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setRows((current) => [...current, { uid: crypto.randomUUID(), id: null, name: "", setupValue: "", expertShare: "", active: true }])}
          >
            <PlusIcon /> Adicionar plano
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(async () => setState(await action(rows.map(({ id, name, setupValue, expertShare, active }) => ({ id, name, setupValue, expertShare, active })))))}
          >
            {isPending ? "Salvando…" : "Salvar planos"}
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
