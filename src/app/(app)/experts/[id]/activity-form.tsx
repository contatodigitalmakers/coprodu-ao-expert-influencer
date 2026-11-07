"use client";

import { useActionState, useEffect, useRef } from "react";
import { SimpleSelect } from "@/components/simple-select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ACTIVITY_TYPE_LABELS, MANUAL_ACTIVITY_TYPES } from "@/lib/labels";
import type { ActivityFormState } from "../actions";

const TYPE_OPTIONS = MANUAL_ACTIVITY_TYPES.map((type) => ({
  value: type,
  label: ACTIVITY_TYPE_LABELS[type],
}));

// Registro manual de interação na linha do tempo.
export function ActivityForm({
  action,
}: {
  action: (prev: ActivityFormState, formData: FormData) => Promise<ActivityFormState>;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  // Depois de salvar, limpa o texto.
  useEffect(() => {
    if (state.savedAt) formRef.current?.reset();
  }, [state.savedAt]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <Textarea name="description" placeholder="O que aconteceu? Ex.: respondeu a DM pedindo mais detalhes." rows={2} />
      <div className="flex flex-wrap items-center gap-2">
        <SimpleSelect name="type" options={TYPE_OPTIONS} defaultValue="note" className="w-40" aria-label="Tipo" />
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Registrando…" : "Registrar interação"}
        </Button>
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
