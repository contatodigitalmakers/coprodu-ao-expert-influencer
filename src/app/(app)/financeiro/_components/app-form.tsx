"use client";

import { useState, useTransition } from "react";
import { SimpleSelect } from "@/components/simple-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { APP_STATUS_OPTIONS, SALES_PLATFORM_SUGGESTIONS } from "@/lib/finance/labels";
import type { AppLeadOption } from "@/lib/finance/queries";
import type { AppInput } from "@/lib/finance/validation";
import { Field, FormActions } from "./form-parts";

// Cadastro do app (aba "Apps" da planilha). Escolher um lead do CRM preenche
// o influenciador, o @, o nicho, o % da proposta aceita e a data do contrato.
export function AppForm({
  leads,
  initial,
  action,
  submitLabel,
  cancelHref,
}: {
  leads: AppLeadOption[];
  initial: AppInput;
  action: (input: AppInput) => Promise<{ error?: string }>;
  submitLabel: string;
  cancelHref: string;
}) {
  const [values, setValues] = useState<AppInput>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const set = (key: keyof AppInput) => (value: string) => setValues((current) => ({ ...current, [key]: value }));
  const input = (key: keyof AppInput) => ({
    id: `app-${key}`,
    value: values[key],
    onChange: (event: { target: { value: string } }) => set(key)(event.target.value),
  });

  const share = Number(values.companyShare.replace(/[%\s]/g, ""));
  const partnerShare = Number.isInteger(share) && share >= 0 && share <= 100 ? `${100 - share}%` : "—";

  function chooseLead(expertId: string | null) {
    const lead = leads.find((item) => item.id === expertId);
    setValues((current) => ({
      ...current,
      expertId: expertId ?? "",
      ...(lead && {
        partnerName: lead.name.startsWith("@") ? current.partnerName : lead.name,
        partnerHandle: lead.handle,
        niche: lead.niche ?? current.niche,
        companyShare: lead.ourShare === null ? current.companyShare : String(lead.ourShare),
        contractDate: lead.contractDate ?? current.contractDate,
      }),
    }));
  }

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
        <CardTitle>Dados do app</CardTitle>
        <CardDescription>
          O % da empresa é copiado para cada lançamento de vendas. Mudar aqui vale para os próximos lançamentos; os
          antigos ficam como foram lançados.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="app-name" label="Nome do app *" className="md:col-span-2">
            <Input {...input("name")} placeholder="Ex.: App Treino da Julia" />
          </Field>
          <Field
            id="app-expert"
            label="Lead do CRM (opcional)"
            className="md:col-span-2"
            hint={leads.length ? "Leads em Negociação ou Ganho. Escolher um preenche os campos abaixo." : "Nenhum lead em Negociação ou Ganho no momento."}
          >
            <SimpleSelect
              id="app-expert"
              aria-label="Lead do CRM"
              emptyLabel="Sem vínculo com lead"
              options={leads.map((lead) => ({ value: lead.id, label: `${lead.name} · @${lead.handle}` }))}
              value={values.expertId || null}
              onValueChange={chooseLead}
            />
          </Field>
          <Field id="app-partnerName" label="Influenciador *">
            <Input {...input("partnerName")} />
          </Field>
          <Field id="app-partnerHandle" label="@ Instagram">
            <Input {...input("partnerHandle")} placeholder="@perfil" />
          </Field>
          <Field id="app-niche" label="Nicho">
            <Input {...input("niche")} />
          </Field>
          <Field id="app-salesPlatform" label="Plataforma de venda">
            <Input {...input("salesPlatform")} list="sales-platforms" placeholder="Ex.: Hotmart" />
            <datalist id="sales-platforms">
              {SALES_PLATFORM_SUGGESTIONS.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </Field>
          <Field id="app-monthlyPrice" label="Ticket mensal (R$)">
            <Input {...input("monthlyPrice")} inputMode="decimal" placeholder="0,00" />
          </Field>
          <Field id="app-companyShare" label="% da empresa *" hint={`Influenciador fica com ${partnerShare}.`}>
            <Input {...input("companyShare")} inputMode="numeric" />
          </Field>
          <Field id="app-status" label="Status *">
            <SimpleSelect
              id="app-status"
              aria-label="Status"
              options={APP_STATUS_OPTIONS}
              value={values.status}
              onValueChange={(value) => set("status")(value ?? "")}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field id="app-contractDate" label="Data do contrato">
              <Input {...input("contractDate")} type="date" />
            </Field>
            <Field id="app-launchDate" label="Lançamento">
              <Input {...input("launchDate")} type="date" />
            </Field>
          </div>
          <Field id="app-notes" label="Observações" className="md:col-span-2">
            <Textarea {...input("notes")} rows={3} />
          </Field>
        </div>
        <FormActions pending={isPending} submitLabel={submitLabel} cancelHref={cancelHref} error={error} onSubmit={save} />
      </CardContent>
    </Card>
  );
}
