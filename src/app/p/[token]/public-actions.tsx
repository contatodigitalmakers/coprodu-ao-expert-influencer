"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { respondAction } from "./actions";

// Aceitar / recusar e baixar PDF (impressão do navegador).
export function PublicActions({ token, canRespond }: { token: string; canRespond: boolean }) {
  const [confirmReject, setConfirmReject] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const respond = (accept: boolean) =>
    startTransition(async () => setError((await respondAction(token, accept)).error ?? null));

  return (
    <div className="flex flex-col gap-2 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        {canRespond && !confirmReject && (
          <>
            <Button type="button" size="lg" disabled={isPending} onClick={() => respond(true)}>
              Aceitar proposta
            </Button>
            <Button type="button" size="lg" variant="outline" disabled={isPending} onClick={() => setConfirmReject(true)}>
              Recusar
            </Button>
          </>
        )}
        {canRespond && confirmReject && (
          <>
            <span className="text-sm">Recusar a proposta?</span>
            <Button type="button" variant="destructive" disabled={isPending} onClick={() => respond(false)}>
              Sim, recusar
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirmReject(false)}>
              Voltar
            </Button>
          </>
        )}
        <Button type="button" variant="ghost" onClick={() => window.print()}>
          Baixar PDF
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
