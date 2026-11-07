"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SettingsFormState } from "../actions";

export function DailyGoalsForm({
  users,
  defaultGoal,
  action,
}: {
  users: { id: string; name: string; dailyGoal: number | null }[];
  defaultGoal: number;
  action: (rows: { id: string; dailyGoal: string }[]) => Promise<SettingsFormState>;
}) {
  const [goals, setGoals] = useState<Record<string, string>>(
    Object.fromEntries(users.map((user) => [user.id, user.dailyGoal?.toString() ?? ""])),
  );
  const [state, setState] = useState<SettingsFormState>({});
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Meta diária</CardTitle>
        <CardDescription>
          Toques por dia de cada usuário (contatos registrados na fila do dia ou na ficha). Em branco = {defaultGoal}.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {users.map((user) => (
          <div key={user.id} className="grid grid-cols-[1fr_8rem] items-center gap-3">
            <label htmlFor={`goal-${user.id}`} className="text-sm">
              {user.name}
            </label>
            <Input
              id={`goal-${user.id}`}
              inputMode="numeric"
              placeholder={String(defaultGoal)}
              value={goals[user.id]}
              onChange={(event) => setGoals((current) => ({ ...current, [user.id]: event.target.value }))}
            />
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                setState(await action(users.map((user) => ({ id: user.id, dailyGoal: goals[user.id] }))));
              })
            }
          >
            {isPending ? "Salvando…" : "Salvar metas"}
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
