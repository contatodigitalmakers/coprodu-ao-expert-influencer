"use client";

import { useState, useTransition } from "react";
import type { DiagnosisForm as Diagnosis } from "@/db/schema/deals";
import { SimpleSelect } from "@/components/simple-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const FIELDS = [
  { key: "audience", label: "Audiência", hint: "Quem é o público, em quais redes, quanto engaja" },
  { key: "currentProducts", label: "Produtos atuais", hint: "Cursos, mentorias, consultorias…" },
  { key: "approxRevenue", label: "Faturamento aproximado", hint: "Ex.: R$ 30 mil/mês com o digital" },
  { key: "appIdea", label: "Ideia de app", hint: "Que problema do público o app resolve" },
  { key: "objections", label: "Objeções", hint: "O que impede de começar agora" },
] as const;

type Values = Required<Omit<Diagnosis, "planInterestId">> & { planInterestId: string | null };

// Formulário de diagnóstico preenchido durante a reunião (seção 3.7).
export function DiagnosisForm({
  action,
  defaults,
  plans,
}: {
  action: (values: Values) => Promise<{ error?: string; message?: string }>;
  defaults: Diagnosis | null;
  plans: { id: string; name: string }[];
}) {
  const [values, setValues] = useState<Values>({
    audience: defaults?.audience ?? "",
    currentProducts: defaults?.currentProducts ?? "",
    approxRevenue: defaults?.approxRevenue ?? "",
    appIdea: defaults?.appIdea ?? "",
    objections: defaults?.objections ?? "",
    planInterestId: defaults?.planInterestId ?? null,
  });
  const [result, setResult] = useState<{ error?: string; message?: string }>({});
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => setResult(await action(values)));
      }}
    >
      {FIELDS.map((field) => (
        <div key={field.key} className="grid gap-1.5">
          <Label htmlFor={`diagnosis-${field.key}`}>{field.label}</Label>
          <Textarea
            id={`diagnosis-${field.key}`}
            rows={2}
            placeholder={field.hint}
            value={values[field.key]}
            onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
          />
        </div>
      ))}
      <div className="grid gap-1.5">
        <Label htmlFor="diagnosis-plan">Plano de interesse</Label>
        <SimpleSelect
          id="diagnosis-plan"
          emptyLabel="Ainda não definido"
          options={plans.map((plan) => ({ value: plan.id, label: plan.name }))}
          value={values.planInterestId}
          onValueChange={(planInterestId) => setValues((current) => ({ ...current, planInterestId }))}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando…" : "Salvar diagnóstico"}
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
