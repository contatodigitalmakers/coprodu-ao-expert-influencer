"use client";

import { TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";
import { SimpleSelect } from "@/components/simple-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CHANNEL_OPTIONS, TEMPLATE_STAGE_OPTIONS } from "@/lib/labels";
import { renderTemplate, SAMPLE_TEMPLATE_DATA, TEMPLATE_VARIABLES, unknownVariables } from "@/lib/templates/render";
import type { TemplateFormState } from "../actions";

type TemplateDefaults = { name: string; channel: string; stage: string; body: string };

export function TemplateForm({
  action,
  defaults,
  sdrName,
  isNew,
}: {
  action: (prev: TemplateFormState, formData: FormData) => Promise<TemplateFormState>;
  defaults: TemplateDefaults;
  sdrName: string;
  isNew: boolean;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  const [body, setBody] = useState(defaults.body);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Insere a variável onde está o cursor.
  function insert(token: string) {
    const textarea = bodyRef.current;
    const start = textarea?.selectionStart ?? body.length;
    const end = textarea?.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + token + body.slice(end));
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const preview = renderTemplate(body, { ...SAMPLE_TEMPLATE_DATA, sdrName });
  const unknown = unknownVariables(body);

  return (
    <form onSubmit={onSubmit} className="grid max-w-5xl gap-6 lg:grid-cols-2" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Mensagem</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" name="name" defaultValue={defaults.name} aria-invalid={!!errors.name || undefined} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="channel">Canal *</Label>
              <SimpleSelect id="channel" name="channel" options={CHANNEL_OPTIONS} defaultValue={defaults.channel || null} placeholder="Escolha" />
              {errors.channel && <p className="text-xs text-destructive">{errors.channel}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="stage">Categoria *</Label>
              <SimpleSelect id="stage" name="stage" options={TEMPLATE_STAGE_OPTIONS} defaultValue={defaults.stage || null} placeholder="Escolha" />
              {errors.stage && <p className="text-xs text-destructive">{errors.stage}</p>}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="body">Texto *</Label>
            <div className="flex flex-wrap gap-1.5" aria-label="Inserir variável">
              {TEMPLATE_VARIABLES.map((variable) => (
                <Button
                  key={variable.token}
                  type="button"
                  variant="outline"
                  size="xs"
                  title={variable.label}
                  onClick={() => insert(variable.token)}
                >
                  {variable.token}
                </Button>
              ))}
            </div>
            <Textarea
              id="body"
              name="body"
              ref={bodyRef}
              rows={10}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              aria-invalid={!!errors.body || undefined}
            />
            {errors.body && <p className="text-xs text-destructive">{errors.body}</p>}
            {!errors.body && unknown.length > 0 && (
              <p className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                <TriangleAlertIcon className="size-3.5" /> Variável desconhecida: {unknown.join(", ")}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando…" : isNew ? "Criar template" : "Salvar alterações"}
            </Button>
            <Link href="/templates" className={buttonVariants({ variant: "ghost" })}>
              Cancelar
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="self-start">
        <CardHeader>
          <CardTitle>Prévia</CardTitle>
          <p className="text-xs text-muted-foreground">
            Com dados de exemplo: {SAMPLE_TEMPLATE_DATA.name}, {SAMPLE_TEMPLATE_DATA.niche}, @{SAMPLE_TEMPLATE_DATA.handle}.
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap" data-testid="template-preview">
            {preview.text || <span className="text-muted-foreground">A prévia aparece aqui.</span>}
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
