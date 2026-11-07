"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { plural } from "@/lib/format";
import { reactivateExpert } from "../fila-actions";

type Lead = { id: string; name: string; handle: string; daysLost: number };

// Leads perdidos por "Sem resposta" há mais de N dias: voltam para "Novo lead".
export function ReactivationList({ leads }: { leads: Lead[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y rounded-lg border">
        {leads.map((lead) => (
          <li key={lead.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
            <div className="min-w-0">
              <Link href={`/experts/${lead.id}`} className="font-medium hover:underline">
                {lead.name}
              </Link>
              <span className="text-muted-foreground">
                {" "}
                · @{lead.handle} · perdido há {plural(lead.daysLost, "dia", "dias")}
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label={`Reativar ${lead.name}`}
              disabled={pendingId === lead.id}
              onClick={() => {
                setPendingId(lead.id);
                startTransition(async () => {
                  const result = await reactivateExpert(lead.id);
                  setError(result.error ?? null);
                  setPendingId(null);
                });
              }}
            >
              {pendingId === lead.id ? "Reativando…" : "Reativar"}
            </Button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
