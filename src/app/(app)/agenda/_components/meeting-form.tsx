"use client";

import { useState, useTransition } from "react";
import { SimpleSelect } from "@/components/simple-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MeetingFormValues } from "../actions";

// Data, hora (horário de Brasília), link da chamada e responsável (Closer).
export function MeetingForm({
  action,
  users,
  defaults,
  submitLabel,
}: {
  action: (values: MeetingFormValues) => Promise<{ error?: string; message?: string }>;
  users: { id: string; name: string }[];
  defaults: MeetingFormValues;
  submitLabel: string;
}) {
  const [values, setValues] = useState(defaults);
  const [result, setResult] = useState<{ error?: string; message?: string }>({});
  const [isPending, startTransition] = useTransition();
  const set = (changes: Partial<MeetingFormValues>) => setValues((current) => ({ ...current, ...changes }));

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => setResult(await action(values)));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="meeting-date">Data</Label>
          <Input id="meeting-date" type="date" value={values.date} onChange={(event) => set({ date: event.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="meeting-time">Hora (Brasília)</Label>
          <Input id="meeting-time" type="time" value={values.time} onChange={(event) => set({ time: event.target.value })} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="meeting-link">Link da chamada</Label>
          <Input
            id="meeting-link"
            placeholder="https://meet.google.com/…"
            value={values.link ?? ""}
            onChange={(event) => set({ link: event.target.value })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="meeting-closer">Responsável (Closer)</Label>
          <SimpleSelect
            id="meeting-closer"
            options={users.map((user) => ({ value: user.id, label: user.name }))}
            value={values.closerId}
            onValueChange={(closerId) => set({ closerId: closerId ?? "" })}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Salvando…" : submitLabel}
        </Button>
        {result.error && (
          <p role="alert" className="text-sm text-destructive">
            {result.error}
          </p>
        )}
        {result.message && !result.error && <p className="text-sm text-muted-foreground">{result.message}</p>}
      </div>
    </form>
  );
}
