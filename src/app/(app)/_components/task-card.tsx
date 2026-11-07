"use client";

import { CheckIcon, CopyIcon, ExternalLinkIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import type { TaskOutcome } from "@/db/schema/enums";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { plural } from "@/lib/format";
import { CHANNEL_LABELS } from "@/lib/labels";
import type { QueueTask } from "@/lib/queue/queries";
import { registerTaskOutcome, skipQueueTask } from "../fila-actions";

const OPEN_LABELS = {
  interaction: "Abrir perfil",
  dm: "Abrir perfil",
  whatsapp: "Abrir WhatsApp",
  email: "Abrir e-mail",
  call: "Ligar",
} as const;

const MISSING_CONTACT = {
  interaction: "Sem link do perfil",
  dm: "Sem link do perfil",
  whatsapp: "Sem WhatsApp cadastrado",
  email: "Sem e-mail cadastrado",
  call: "Sem telefone cadastrado",
} as const;

// Resultados possíveis por canal (seção 3.4).
function outcomesFor(channel: QueueTask["channel"]): [TaskOutcome, string][] {
  if (channel === "interaction") return [["sent", "Feito"]];
  const common: [TaskOutcome, string][] = [
    ["sent", "Enviado"],
    ["replied", "Respondeu"],
    ["no_response", "Sem resposta"],
  ];
  return channel === "whatsapp" || channel === "call" ? [...common, ["invalid_number", "Número inválido"]] : common;
}

// Uma tarefa da fila: ver a mensagem, copiar, abrir o canal e registrar o resultado.
export function TaskCard({ task }: { task: QueueTask }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  async function copy() {
    if (!task.message) return;
    await navigator.clipboard.writeText(task.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <article
      aria-label={`Tarefa ${task.expert.name}`}
      className="flex flex-col gap-3 rounded-lg border bg-card p-4 text-sm"
      data-pending={isPending || undefined}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/experts/${task.expert.id}`} className="font-medium hover:underline">
            {task.expert.name}
          </Link>
          <p className="text-xs text-muted-foreground">
            @{task.expert.handle}
            {task.expert.nicheName && ` · ${task.expert.nicheName}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {task.daysLate > 0 && (
            <Badge variant="destructive">Atrasada há {plural(task.daysLate, "dia", "dias")}</Badge>
          )}
          <Badge variant="outline" className="font-normal">
            {task.step ? `${task.step} · ` : ""}
            {task.templateName ?? CHANNEL_LABELS[task.channel]}
          </Badge>
        </div>
      </header>

      {task.message ? (
        <div className="flex flex-col gap-1.5">
          <p className="rounded-md bg-muted/60 p-3 whitespace-pre-wrap" data-testid="task-message">
            {task.message}
          </p>
          {task.missing.length > 0 && (
            <p className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
              <TriangleAlertIcon className="size-3.5" />
              Faltam dados do lead: {task.missing.join(", ")}. Revise antes de enviar.
            </p>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground">
          {task.channel === "interaction"
            ? "Siga o perfil e interaja com 2 ou 3 publicações recentes."
            : "Passo sem mensagem pronta: escreva a sua."}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {task.message && (
          <Button type="button" variant="outline" size="sm" onClick={copy}>
            {copied ? <CheckIcon /> : <CopyIcon />} {copied ? "Copiado!" : "Copiar mensagem"}
          </Button>
        )}
        {task.link ? (
          <a href={task.link} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ExternalLinkIcon /> {OPEN_LABELS[task.channel]}
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">{MISSING_CONTACT[task.channel]}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <span className="text-xs text-muted-foreground">Resultado:</span>
        {outcomesFor(task.channel).map(([outcome, label]) => (
          <Button
            key={outcome}
            type="button"
            size="sm"
            variant={outcome === "sent" ? "default" : "secondary"}
            disabled={isPending}
            onClick={() => run(() => registerTaskOutcome(task.id, outcome))}
          >
            {label}
          </Button>
        ))}
        <Button type="button" size="sm" variant="ghost" disabled={isPending} onClick={() => run(() => skipQueueTask(task.id))}>
          Pular
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}
