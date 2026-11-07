"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import type { Channel } from "@/db/schema/enums";
import { SimpleSelect } from "@/components/simple-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CHANNEL_OPTIONS } from "@/lib/labels";
import type { CadenceInput } from "../actions";

type StepRow = { uid: string; id: string | null; dayOffset: string; channel: Channel | null; templateId: string | null };
type TemplateOption = { id: string; name: string; channel: Channel };

export function CadenceForm({
  action,
  defaults,
  templates,
  isNew,
}: {
  action: (input: CadenceInput) => Promise<{ error?: string } | void>;
  defaults: { name: string; active: boolean; steps: { id: string; dayOffset: number; channel: Channel; templateId: string | null }[] };
  templates: TemplateOption[];
  isNew: boolean;
}) {
  const [name, setName] = useState(defaults.name);
  const [active, setActive] = useState(defaults.active);
  const [steps, setSteps] = useState<StepRow[]>(() =>
    defaults.steps.map((step) => ({ ...step, uid: step.id, dayOffset: String(step.dayOffset) })),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const update = (uid: string, changes: Partial<StepRow>) =>
    setSteps((current) => current.map((step) => (step.uid === uid ? { ...step, ...changes } : step)));
  const addStep = () =>
    setSteps((current) => {
      const lastDay = Number(current.at(-1)?.dayOffset ?? -1);
      const dayOffset = String(Number.isFinite(lastDay) ? lastDay + 1 : 0);
      return [...current, { uid: crypto.randomUUID(), id: null, dayOffset, channel: null, templateId: null }];
    });

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await action({
        name,
        active,
        steps: steps.map((step) => ({
          id: step.id,
          dayOffset: step.dayOffset,
          channel: step.channel as Channel,
          templateId: step.templateId,
        })),
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>{isNew ? "Nova cadência" : "Cadência"}</CardTitle>
        <CardDescription>
          Cada passo é um dia (D0 = dia da inscrição), um canal e, opcionalmente, um template. Ao inscrever
          um lead, o sistema cria uma tarefa por passo na data certa.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="cadence-name">Nome *</Label>
            <Input id="cadence-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <label className="flex items-center gap-2 pb-1.5 text-sm">
            <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="size-4" />
            Ativa (aparece para inscrição)
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[5rem_10rem_1fr_auto] gap-2 text-xs text-muted-foreground">
            <span>Dia</span>
            <span>Canal</span>
            <span>Template</span>
            <span className="w-8" />
          </div>
          {steps.map((step, index) => {
            const options = templates
              .filter((template) => template.channel === step.channel)
              .map((template) => ({ value: template.id, label: template.name }));
            return (
              <div key={step.uid} className="grid grid-cols-[5rem_10rem_1fr_auto] items-center gap-2">
                <Input
                  aria-label={`Dia do passo ${index + 1}`}
                  inputMode="numeric"
                  value={step.dayOffset}
                  onChange={(event) => update(step.uid, { dayOffset: event.target.value })}
                />
                <SimpleSelect
                  aria-label={`Canal do passo ${index + 1}`}
                  placeholder="Canal"
                  options={CHANNEL_OPTIONS}
                  value={step.channel}
                  onValueChange={(value) => update(step.uid, { channel: value as Channel | null, templateId: null })}
                />
                <SimpleSelect
                  aria-label={`Template do passo ${index + 1}`}
                  emptyLabel="Sem mensagem"
                  options={options}
                  value={step.templateId}
                  onValueChange={(value) => update(step.uid, { templateId: value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remover passo ${index + 1}`}
                  onClick={() => setSteps((current) => current.filter((item) => item.uid !== step.uid))}
                >
                  <Trash2Icon />
                </Button>
              </div>
            );
          })}
          <Button type="button" variant="outline" className="self-start" onClick={addStep}>
            <PlusIcon /> Adicionar passo
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={save} disabled={isPending}>
            {isPending ? "Salvando…" : isNew ? "Criar cadência" : "Salvar cadência"}
          </Button>
          <Link href="/cadencias" className={buttonVariants({ variant: "ghost" })}>
            Cancelar
          </Link>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
