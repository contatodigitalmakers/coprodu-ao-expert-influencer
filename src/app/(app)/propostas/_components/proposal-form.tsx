"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { SimpleSelect } from "@/components/simple-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { parseMoney, SUGGESTED_EXTRAS } from "@/lib/proposals/calc";
import type { ProposalInput } from "../actions";

type Plan = { id: string; name: string; setupValue: number; expertShare: number; ourShare: number };
type ExtraRow = { uid: string; name: string; value: string };

// Gerador de proposta: escolhe o plano e os serviços extras; o total é calculado.
export function ProposalForm({
  expertName,
  plans,
  defaults,
  action,
  cancelHref,
  submitLabel,
}: {
  expertName: string;
  plans: Plan[];
  defaults: { planId: string | null; extras: { name: string; value: number }[] };
  action: (input: ProposalInput) => Promise<{ error?: string }>;
  cancelHref: string;
  submitLabel: string;
}) {
  const [planId, setPlanId] = useState(defaults.planId);
  const [extras, setExtras] = useState<ExtraRow[]>(() =>
    defaults.extras.map((extra) => ({ uid: crypto.randomUUID(), name: extra.name, value: String(extra.value).replace(".", ",") })),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const plan = plans.find((item) => item.id === planId);
  const extrasTotal = extras.reduce((sum, extra) => sum + (Number.isFinite(parseMoney(extra.value)) ? parseMoney(extra.value) : 0), 0);
  const total = (plan?.setupValue ?? 0) + extrasTotal;
  const addExtra = (name = "") => setExtras((current) => [...current, { uid: crypto.randomUUID(), name, value: "" }]);
  const update = (uid: string, changes: Partial<ExtraRow>) =>
    setExtras((current) => current.map((extra) => (extra.uid === uid ? { ...extra, ...changes } : extra)));

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await action({ planId: planId ?? "", extras: extras.map(({ name, value }) => ({ name, value })) });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Proposta para {expertName}</CardTitle>
        <CardDescription>
          Os valores e a divisão vêm do plano e ficam gravados na proposta: mudar o plano depois não altera
          esta proposta.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-1.5">
          <Label htmlFor="proposal-plan">Plano *</Label>
          <SimpleSelect
            id="proposal-plan"
            placeholder="Escolha o plano"
            options={plans.map((item) => ({ value: item.id, label: `${item.name} · ${formatCurrency(item.setupValue)} · ${item.expertShare}/${item.ourShare}` }))}
            value={planId}
            onValueChange={setPlanId}
          />
          {plan && (
            <p className="text-xs text-muted-foreground">
              Setup de {formatCurrency(plan.setupValue)}; receita recorrente {plan.expertShare}% expert / {plan.ourShare}% nós,
              depois que o expert recuperar o setup.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label>Serviços extras de co-produção</Label>
          {extras.map((extra, index) => (
            <div key={extra.uid} className="grid grid-cols-[1fr_9rem_auto] items-center gap-2">
              <Input
                aria-label={`Serviço extra ${index + 1}`}
                placeholder="Ex.: Tráfego pago"
                value={extra.name}
                onChange={(event) => update(extra.uid, { name: event.target.value })}
              />
              <Input
                aria-label={`Valor do serviço extra ${index + 1}`}
                placeholder="R$ 0,00"
                inputMode="decimal"
                value={extra.value}
                onChange={(event) => update(extra.uid, { value: event.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remover serviço extra ${index + 1}`}
                onClick={() => setExtras((current) => current.filter((item) => item.uid !== extra.uid))}
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_EXTRAS.map((name) => (
              <Button key={name} type="button" variant="outline" size="xs" onClick={() => addExtra(name)}>
                <PlusIcon /> {name}
              </Button>
            ))}
            <Button type="button" variant="outline" size="xs" onClick={() => addExtra()}>
              <PlusIcon /> Outro serviço
            </Button>
          </div>
        </div>

        <div className="flex items-baseline justify-between border-t pt-4">
          <span className="font-medium">Investimento total</span>
          <span className="text-lg font-semibold tabular-nums" data-testid="form-total">
            {formatCurrency(total)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={save} disabled={isPending}>
            {isPending ? "Salvando…" : submitLabel}
          </Button>
          <Link href={cancelHref} className={buttonVariants({ variant: "ghost" })}>
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
