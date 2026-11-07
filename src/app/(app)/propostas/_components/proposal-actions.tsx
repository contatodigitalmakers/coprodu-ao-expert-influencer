"use client";

import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import type { ProposalStatus } from "@/db/schema/enums";
import { Button, buttonVariants } from "@/components/ui/button";
import { markAnsweredAction, markSentAction } from "../actions";

// Ações da proposta conforme o status (rascunho → enviada → aceita/recusada).
export function ProposalActions({
  proposalId,
  status,
  publicToken,
  expertId,
}: {
  proposalId: string;
  status: ProposalStatus;
  publicToken: string;
  expertId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const publicPath = `/p/${publicToken}`;

  const run = (action: () => Promise<{ error?: string }>) =>
    startTransition(async () => setError((await action()).error ?? null));

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}${publicPath}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {status === "draft" && (
          <>
            <Link href={`/propostas/${proposalId}/editar`} className={buttonVariants({ variant: "outline" })}>
              Editar
            </Link>
            <Button type="button" disabled={isPending} onClick={() => run(() => markSentAction(proposalId))}>
              Marcar como enviada
            </Button>
          </>
        )}
        {status !== "draft" && (
          <>
            <Button type="button" variant="outline" onClick={copyLink}>
              {copied ? <CheckIcon /> : <CopyIcon />} {copied ? "Link copiado!" : "Copiar link público"}
            </Button>
            <a href={publicPath} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "ghost" })}>
              <ExternalLinkIcon /> Abrir página pública
            </a>
          </>
        )}
        {(status === "sent" || status === "viewed") && (
          <>
            <Button type="button" disabled={isPending} onClick={() => run(() => markAnsweredAction(proposalId, true))}>
              Registrar aceite
            </Button>
            <Button type="button" variant="outline" disabled={isPending} onClick={() => run(() => markAnsweredAction(proposalId, false))}>
              Registrar recusa
            </Button>
          </>
        )}
        {status === "accepted" && (
          <Link href={`/experts/${expertId}`} className={buttonVariants({ variant: "outline" })}>
            Ir para a ficha (marcar Ganho)
          </Link>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
