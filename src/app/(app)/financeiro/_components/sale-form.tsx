"use client";

import { useState, useTransition } from "react";
import { SimpleSelect } from "@/components/simple-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saleTotals } from "@/lib/finance/calc";
import { money } from "@/lib/finance/format";
import type { AppOption } from "@/lib/finance/queries";
import type { SaleInput } from "@/lib/finance/validation";
import { parseMoney } from "@/lib/proposals/calc";
import { CalcRow, Field, FormActions } from "./form-parts";

type TextKey = Exclude<keyof SaleInput, "appId">;

// Vendas do mês de um app (aba "Vendas" da planilha): os números do relatório
// da plataforma. A comissão e a parte de cada um aparecem enquanto se digita.
export function SaleForm({
  apps,
  initial,
  action,
  submitLabel,
  cancelHref,
}: {
  apps: AppOption[];
  initial: SaleInput;
  action: (input: SaleInput) => Promise<{ error?: string }>;
  submitLabel: string;
  cancelHref: string;
}) {
  const [values, setValues] = useState<SaleInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const input = (key: TextKey) => ({
    id: `sale-${key}`,
    value: values[key],
    onChange: (event: { target: { value: string } }) => setValues((current) => ({ ...current, [key]: event.target.value })),
  });

  // O % vem do app escolhido; dá para ajustar só neste lançamento.
  function chooseApp(appId: string | null) {
    const app = apps.find((item) => item.id === appId);
    setValues((current) => ({ ...current, appId: appId ?? "", companyShare: app ? String(app.companyShare) : current.companyShare }));
  }

  const number = (value: string) => (value.trim() && Number.isFinite(parseMoney(value)) ? parseMoney(value) : 0);
  const share = Number(values.companyShare.replace(/[%\s]/g, ""));
  const totals = saleTotals({
    grossRevenue: number(values.grossRevenue),
    platformFees: number(values.platformFees),
    refunds: number(values.refunds),
    companyShare: Number.isFinite(share) ? share : 0,
  });

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await action(values);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Vendas do mês</CardTitle>
        <CardDescription>
          Uma linha por app por mês, com os números do relatório da plataforma de vendas (Hotmart, Kiwify…).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="sale-app" label="App *">
            <SimpleSelect
              id="sale-app"
              aria-label="App"
              placeholder="Escolha o app"
              options={apps.map((app) => ({ value: app.id, label: app.name }))}
              value={values.appId || null}
              onValueChange={chooseApp}
            />
          </Field>
          <Field id="sale-month" label="Mês de referência *">
            <Input {...input("month")} type="month" placeholder="aaaa-mm" />
          </Field>
          <Field id="sale-newSales" label="Vendas novas">
            <Input {...input("newSales")} inputMode="numeric" placeholder="0" />
          </Field>
          <Field id="sale-activeSubscribers" label="Assinantes ativos (fim do mês)">
            <Input {...input("activeSubscribers")} inputMode="numeric" placeholder="0" />
          </Field>
          <Field id="sale-cancellations" label="Cancelamentos">
            <Input {...input("cancellations")} inputMode="numeric" placeholder="0" />
          </Field>
          <Field id="sale-grossRevenue" label="Faturamento bruto (R$)">
            <Input {...input("grossRevenue")} inputMode="decimal" placeholder="0,00" />
          </Field>
          <Field id="sale-platformFees" label="Taxas da plataforma (R$)">
            <Input {...input("platformFees")} inputMode="decimal" placeholder="0,00" />
          </Field>
          <Field id="sale-refunds" label="Reembolsos e chargebacks (R$)">
            <Input {...input("refunds")} inputMode="decimal" placeholder="0,00" />
          </Field>
          <Field id="sale-companyShare" label="% da empresa *" hint="Vem do app. Mudar aqui vale só para este lançamento.">
            <Input {...input("companyShare")} inputMode="numeric" />
          </Field>
          <Field id="sale-notes" label="Observações">
            <Input {...input("notes")} />
          </Field>
        </div>

        <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/30 p-4" aria-label="Cálculo do lançamento">
          <CalcRow label="Comissão líquida (bruto − taxas − reembolsos)" value={money(totals.net)} testId="sale-net" />
          <CalcRow label="Receita da empresa" value={money(totals.company)} strong testId="sale-company" />
          <CalcRow label="Receita do influenciador" value={money(totals.partner)} testId="sale-partner" />
        </div>

        <FormActions pending={isPending} submitLabel={submitLabel} cancelHref={cancelHref} error={error} onSubmit={save} />
      </CardContent>
    </Card>
  );
}
