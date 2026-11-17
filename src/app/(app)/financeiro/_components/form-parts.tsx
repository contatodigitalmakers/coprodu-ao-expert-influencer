"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Peças comuns dos formulários da Central Financeira.

export function Field({
  id,
  label,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function FormActions({
  pending,
  submitLabel,
  cancelHref,
  error,
  onSubmit,
}: {
  pending: boolean;
  submitLabel: string;
  cancelHref: string;
  error: string | null;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" onClick={onSubmit} disabled={pending}>
        {pending ? "Salvando…" : submitLabel}
      </Button>
      <Link href={cancelHref} className={buttonVariants({ variant: "ghost" })}>
        Cancelar
      </Link>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

// Linha "rótulo ... valor" do quadro de cálculo ao vivo.
export function CalcRow({ label, value, strong, testId }: { label: string; value: string; strong?: boolean; testId?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className={strong ? "font-medium" : "text-muted-foreground"}>{label}</span>
      <span className={cn("tabular-nums", strong && "font-semibold")} data-testid={testId}>
        {value}
      </span>
    </div>
  );
}
