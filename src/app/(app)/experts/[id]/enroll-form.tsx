"use client";

import { useState, useTransition } from "react";
import { SimpleSelect } from "@/components/simple-select";
import { Button } from "@/components/ui/button";

export function EnrollForm({
  action,
  options,
}: {
  action: (cadenceId: string | null) => Promise<{ error?: string }>;
  options: { id: string; name: string }[];
}) {
  const [cadenceId, setCadenceId] = useState<string | null>(options[0]?.id ?? null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!options.length) return <p className="text-muted-foreground">Nenhuma cadência ativa. Crie uma em Cadências.</p>;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SimpleSelect
          aria-label="Cadência"
          className="w-60"
          options={options.map((option) => ({ value: option.id, label: option.name }))}
          value={cadenceId}
          onValueChange={setCadenceId}
        />
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await action(cadenceId);
              setError(result.error ?? null);
            })
          }
        >
          {isPending ? "Inscrevendo…" : "Inscrever na cadência"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
