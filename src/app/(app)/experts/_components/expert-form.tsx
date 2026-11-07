"use client";

import { TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent, type ReactNode } from "react";
import { SimpleSelect } from "@/components/simple-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { FormOptions } from "@/lib/experts/queries";
import { PLATFORM_OPTIONS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { checkDuplicate, type ExpertFormState } from "../actions";
import type { ExpertFormDefaults } from "./form-defaults";
import { TagPicker } from "./tag-picker";

type ExpertFormProps = {
  action: (prev: ExpertFormState, formData: FormData) => Promise<ExpertFormState>;
  options: FormOptions;
  defaults: ExpertFormDefaults;
  expertId: string | null; // null = cadastro novo
  cancelHref: string;
};

const toOptions = (rows: { id: string; name: string }[]) =>
  rows.map((row) => ({ value: row.id, label: row.name }));

export function ExpertForm({ action, options, defaults, expertId, cancelHref }: ExpertFormProps) {
  const [state, formAction, isPending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  // Envia sem limpar o formulário (assim nada se perde se houver erro).
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  // Aviso de duplicidade: confere o @ + plataforma ao sair do campo.
  const [handle, setHandle] = useState(defaults.handle);
  const [platform, setPlatform] = useState(defaults.platform);
  const [duplicate, setDuplicate] = useState<{ id: string; name: string } | null>(null);
  async function verifyDuplicate(nextHandle: string, nextPlatform: string) {
    setDuplicate(nextHandle.trim() ? await checkDuplicate(nextHandle, nextPlatform, expertId) : null);
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-4xl flex-col gap-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Dados do expert</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Nome *" htmlFor="name" error={errors.name}>
            <Input id="name" name="name" defaultValue={defaults.name} aria-invalid={!!errors.name || undefined} />
          </Field>
          <Field label="Plataforma *" htmlFor="platform" error={errors.platform}>
            <SimpleSelect
              id="platform"
              name="platform"
              options={PLATFORM_OPTIONS}
              value={platform}
              onValueChange={(value) => {
                setPlatform(value ?? "instagram");
                verifyDuplicate(handle, value ?? "instagram");
              }}
            />
          </Field>
          <Field
            label="@ principal *"
            htmlFor="handle"
            error={errors.handle}
            hint="Sem o @. Também aceita o link do perfil."
          >
            <Input
              id="handle"
              name="handle"
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              onBlur={() => verifyDuplicate(handle, platform)}
              aria-invalid={!!errors.handle || undefined}
            />
            {duplicate && (
              <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                <TriangleAlertIcon className="mt-px size-3.5 shrink-0" />
                <span>
                  Já existe um lead com esse @ nesta plataforma:{" "}
                  <Link href={`/experts/${duplicate.id}`} className="font-medium underline" target="_blank">
                    {duplicate.name}
                  </Link>
                </span>
              </p>
            )}
          </Field>
          <Field label="Link do perfil" htmlFor="profileUrl" error={errors.profileUrl}>
            <Input id="profileUrl" name="profileUrl" defaultValue={defaults.profileUrl} placeholder="https://" />
          </Field>
          <Field label="Nicho" htmlFor="nicheId" error={errors.nicheId}>
            <SimpleSelect
              id="nicheId"
              name="nicheId"
              emptyLabel="Sem nicho"
              options={toOptions(options.niches)}
              defaultValue={defaults.nicheId}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Seguidores" htmlFor="followers" error={errors.followers} hint="Ex.: 12500 ou 12,5 mil">
              <Input
                id="followers"
                name="followers"
                defaultValue={defaults.followers}
                inputMode="decimal"
                aria-invalid={!!errors.followers || undefined}
              />
            </Field>
            <Field label="Engajamento (%)" htmlFor="engagementRate" error={errors.engagementRate} hint="Ex.: 3,5">
              <Input
                id="engagementRate"
                name="engagementRate"
                defaultValue={defaults.engagementRate}
                inputMode="decimal"
                aria-invalid={!!errors.engagementRate || undefined}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contato e prospecção</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="WhatsApp" htmlFor="whatsapp" error={errors.whatsapp} hint="Com DDD. Ex.: (11) 99999-8888">
            <Input
              id="whatsapp"
              name="whatsapp"
              defaultValue={defaults.whatsapp}
              inputMode="tel"
              aria-invalid={!!errors.whatsapp || undefined}
            />
          </Field>
          <Field label="E-mail" htmlFor="email" error={errors.email}>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={defaults.email}
              aria-invalid={!!errors.email || undefined}
            />
          </Field>
          <Field label="Cidade" htmlFor="city" error={errors.city}>
            <Input id="city" name="city" defaultValue={defaults.city} />
          </Field>
          <Field label="Origem do lead" htmlFor="source" error={errors.source} hint="Ex.: indicação, busca no Instagram">
            <Input id="source" name="source" defaultValue={defaults.source} />
          </Field>
          <Field label="Responsável" htmlFor="ownerId" error={errors.ownerId}>
            <SimpleSelect
              id="ownerId"
              name="ownerId"
              emptyLabel="Sem responsável"
              options={toOptions(options.users)}
              defaultValue={defaults.ownerId}
            />
          </Field>
          <Field label="Tags" error={errors.tags}>
            <TagPicker name="tags" options={options.tags} defaultValue={defaults.tags} />
          </Field>
          <Field label="Observações" htmlFor="notes" error={errors.notes} className="md:col-span-2">
            <Textarea id="notes" name="notes" defaultValue={defaults.notes} rows={3} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Qualificação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <YesNoField
            name="sellsProduct"
            label="Já vende produto digital?"
            defaultValue={defaults.sellsProduct}
            error={errors.sellsProduct}
          />
          <Field label="Qual produto" htmlFor="productDescription" error={errors.productDescription}>
            <Input id="productDescription" name="productDescription" defaultValue={defaults.productDescription} />
          </Field>
          <YesNoField
            name="hasMethod"
            label="Tem método estruturado?"
            defaultValue={defaults.hasMethod}
            error={errors.hasMethod}
          />
          <YesNoField
            name="recurringProblem"
            label="O problema que resolve é recorrente?"
            defaultValue={defaults.recurringProblem}
            error={errors.recurringProblem}
          />
          <YesNoField
            name="contentFrequency"
            label="Produz conteúdo com frequência?"
            defaultValue={defaults.contentFrequency}
            error={errors.contentFrequency}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando…" : expertId ? "Salvar alterações" : "Cadastrar expert"}
        </Button>
        <Link href={cancelHref} className={buttonVariants({ variant: "ghost" })}>
          Cancelar
        </Link>
        {Object.keys(errors).length > 0 && (
          <p role="alert" className="text-sm text-destructive">
            Corrija os campos destacados.
          </p>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

const YES_NO_OPTIONS = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
  { value: "nao_informado", label: "Não informado" },
];

function YesNoField({
  name,
  label,
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  defaultValue: string;
  error?: string;
}) {
  return (
    <div className="grid content-start gap-2">
      <span className="text-sm font-medium">{label}</span>
      <RadioGroup name={name} defaultValue={defaultValue} className="flex flex-wrap gap-4" aria-label={label}>
        {YES_NO_OPTIONS.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
            <RadioGroupItem value={option.value} />
            {option.label}
          </label>
        ))}
      </RadioGroup>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
