"use client";

import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { StageWithCount } from "@/lib/settings";
import type { SettingsFormState } from "../actions";

type Row = {
  uid: string; // chave da linha na tela
  id: string | null; // null = etapa nova
  key: string | null;
  name: string;
  maxDays: string;
  isWon: boolean;
  isLost: boolean;
  leadCount: number;
};

export function StagesForm({
  stages,
  action,
}: {
  stages: StageWithCount[];
  action: (rows: { id: string | null; name: string; maxDays: string }[]) => Promise<SettingsFormState>;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    stages.map((stage) => ({ ...stage, uid: stage.id, maxDays: stage.maxDays?.toString() ?? "" })),
  );
  const [state, setState] = useState<SettingsFormState>({});
  const [isPending, startTransition] = useTransition();

  const update = (uid: string, changes: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.uid === uid ? { ...row, ...changes } : row)));
  const move = (index: number, offset: number) =>
    setRows((current) => {
      const next = [...current];
      [next[index], next[index + offset]] = [next[index + offset], next[index]];
      return next;
    });
  // Etapa nova entra antes de Ganho/Perdido.
  const add = () =>
    setRows((current) => {
      const position = current.findIndex((row) => row.isWon || row.isLost);
      const index = position === -1 ? current.length : position;
      const row: Row = { uid: crypto.randomUUID(), id: null, key: null, name: "", maxDays: "", isWon: false, isLost: false, leadCount: 0 };
      return [...current.slice(0, index), row, ...current.slice(index)];
    });

  function save() {
    startTransition(async () => {
      setState(await action(rows.map(({ id, name, maxDays }) => ({ id, name, maxDays }))));
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Etapas do pipeline</CardTitle>
        <CardDescription>
          Nome, ordem e limite de dias parado antes do alerta. Etapas do sistema (usadas pelas
          automações) e etapas com leads não podem ser removidas.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-[1fr_6rem_auto] gap-2 text-xs text-muted-foreground">
          <span>Etapa</span>
          <span>Limite (dias)</span>
          <span className="w-28" />
        </div>
        {rows.map((row, index) => (
          <div key={row.uid} className="grid grid-cols-[1fr_6rem_auto] items-center gap-2">
            <div className="flex items-center gap-2">
              <Input
                aria-label={`Nome da etapa ${index + 1}`}
                value={row.name}
                onChange={(event) => update(row.uid, { name: event.target.value })}
              />
              {row.leadCount > 0 && (
                <Badge variant="outline" className="shrink-0 font-normal">
                  {row.leadCount} lead(s)
                </Badge>
              )}
            </div>
            <Input
              aria-label={`Limite de dias da etapa ${row.name || index + 1}`}
              inputMode="numeric"
              placeholder="—"
              value={row.maxDays}
              onChange={(event) => update(row.uid, { maxDays: event.target.value })}
            />
            <div className="flex w-28 items-center justify-end gap-0.5">
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Subir" disabled={index === 0} onClick={() => move(index, -1)}>
                <ArrowUpIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Descer"
                disabled={index === rows.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDownIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remover etapa ${row.name}`}
                title={row.key ? "Etapa do sistema" : row.leadCount > 0 ? "Etapa com leads" : "Remover"}
                disabled={Boolean(row.key) || row.leadCount > 0}
                onClick={() => setRows((current) => current.filter((item) => item.uid !== row.uid))}
              >
                <Trash2Icon />
              </Button>
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button type="button" variant="outline" onClick={add}>
            <PlusIcon /> Adicionar etapa
          </Button>
          <Button type="button" onClick={save} disabled={isPending}>
            {isPending ? "Salvando…" : "Salvar etapas"}
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
