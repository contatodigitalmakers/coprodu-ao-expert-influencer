"use client";

import { useState, useTransition } from "react";
import { SimpleSelect } from "@/components/simple-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CostCategory } from "@/db/schema/enums";
import { costPartnerAmount } from "@/lib/finance/calc";
import { money } from "@/lib/finance/format";
import { COST_CATEGORY_OPTIONS } from "@/lib/finance/labels";
import type { AppOption } from "@/lib/finance/queries";
import type { CostInput } from "@/lib/finance/validation";
import { parseMoney } from "@/lib/proposals/calc";
import { CalcRow, Field, FormActions } from "./form-parts";

type TextKey = "spentOn" | "supplier" | "description" | "amount" | "partnerShare";
// Sem categoria escolhida ainda = "" (o servidor recusa).
export type CostFormValues = Omit<CostInput, "category"> & { category: CostCategory | "" };

// Uma despesa (aba "Custos" da planilha). Sem app = custo geral da empresa.
// Rateado: o influenciador devolve a parte dele, pelo % do app.
export function CostForm({
  apps,
  initial,
  action,
  submitLabel,
  cancelHref,
}: {
  apps: AppOption[];
  initial: CostFormValues;
  action: (input: CostInput) => Promise<{ error?: string }>;
  submitLabel: string;
  cancelHref: string;
}) {
  const [values, setValues] = useState<CostFormValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const input = (key: TextKey) => ({
    id: `cost-${key}`,
    value: values[key],
    onChange: (event: { target: { value: string } }) => setValues((current) => ({ ...current, [key]: event.target.value })),
  });

  const app = apps.find((item) => item.id === values.appId);

  function chooseApp(appId: string | null) {
    const chosen = apps.find((item) => item.id === appId);
    setValues((current) => ({
      ...current,
      appId: appId ?? "",
      shared: chosen ? current.shared : false,
      partnerShare: chosen ? String(100 - chosen.companyShare) : "",
    }));
  }

  const amount = parseMoney(values.amount);
  const partnerShare = Number(values.partnerShare.replace(/[%\s]/g, ""));
  const partnerAmount = costPartnerAmount({
    amount: Number.isFinite(amount) ? amount : 0,
    shared: values.shared,
    partnerShare: Number.isFinite(partnerShare) ? partnerShare : 0,
  });

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await action(values as CostInput);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Custo</CardTitle>
        <CardDescription>
          Lance no app quando o custo é dele, ou em Geral quando é da empresa. &quot;IA no app (API)&quot; vai no app
          que consumiu (use uma chave de API por app); &quot;IA de desenvolvimento&quot; vai em Geral.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="cost-spentOn" label="Data *">
            <Input {...input("spentOn")} type="date" />
          </Field>
          <Field id="cost-app" label="App *">
            <SimpleSelect
              id="cost-app"
              aria-label="App"
              emptyLabel="Geral (custo da empresa)"
              options={apps.map((item) => ({ value: item.id, label: item.name }))}
              value={values.appId || null}
              onValueChange={chooseApp}
            />
          </Field>
          <Field id="cost-category" label="Categoria *">
            <SimpleSelect
              id="cost-category"
              aria-label="Categoria"
              placeholder="Escolha a categoria"
              options={COST_CATEGORY_OPTIONS}
              value={values.category || null}
              onValueChange={(value) => setValues((current) => ({ ...current, category: (value ?? "") as CostCategory | "" }))}
            />
          </Field>
          <Field id="cost-amount" label="Valor (R$) *">
            <Input {...input("amount")} inputMode="decimal" placeholder="0,00" />
          </Field>
          <Field id="cost-supplier" label="Fornecedor">
            <Input {...input("supplier")} placeholder="Ex.: Meta Ads" />
          </Field>
          <Field id="cost-description" label="Descrição">
            <Input {...input("description")} />
          </Field>
        </div>

        {app && (
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={values.shared}
                onChange={(event) => setValues((current) => ({ ...current, shared: event.target.checked }))}
              />
              Rateado com o influenciador?
            </label>
            <p className="text-xs text-muted-foreground">
              Marque nos custos que o contrato manda dividir (ex.: tráfego). A empresa paga e o influenciador devolve a
              parte dele.
            </p>
            {values.shared && (
              <div className="grid items-end gap-4 md:grid-cols-2">
                <Field id="cost-partnerShare" label="% do influenciador" hint={`Pelo app: ${100 - app.companyShare}%.`}>
                  <Input {...input("partnerShare")} inputMode="numeric" />
                </Field>
                <CalcRow label="O influenciador devolve" value={money(partnerAmount)} strong testId="cost-partner" />
              </div>
            )}
          </div>
        )}

        <FormActions pending={isPending} submitLabel={submitLabel} cancelHref={cancelHref} error={error} onSubmit={save} />
      </CardContent>
    </Card>
  );
}
