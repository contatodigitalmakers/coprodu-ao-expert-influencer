"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

const ACTIONS = [
  { status: "done", label: "Marcar como realizada", variant: "default" },
  { status: "no_show", label: "Não compareceu", variant: "outline" },
  { status: "canceled", label: "Cancelar reunião", variant: "ghost" },
] as const;

export function StatusButtons({ action }: { action: (status: string) => Promise<{ error?: string }> }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ACTIONS.map((item) => (
        <Button
          key={item.status}
          type="button"
          size="sm"
          variant={item.variant}
          disabled={isPending}
          onClick={() => startTransition(async () => setError((await action(item.status)).error ?? null))}
        >
          {item.label}
        </Button>
      ))}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
