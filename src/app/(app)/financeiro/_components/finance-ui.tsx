import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AppStatus } from "@/db/schema/enums";
import { getCurrentUser } from "@/lib/auth";
import { addMonths, currentMonth, monthLabel } from "@/lib/finance/calc";
import { APP_STATUS_LABELS } from "@/lib/finance/labels";
import { cn } from "@/lib/utils";

// Peças comuns das telas da Central Financeira (componentes de servidor).

export async function isAdmin() {
  return (await getCurrentUser()).role === "admin";
}

export function Restricted() {
  return <p className="text-sm text-muted-foreground">Acesso restrito ao Admin.</p>;
}

export function StatTile({ label, value, detail, testId }: { label: string; value: ReactNode; detail?: string; testId?: string }) {
  return (
    <Card size="sm" role="group" aria-label={label}>
      <CardContent className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="lap-numero text-2xl md:text-3xl" data-testid={testId}>
          {value}
        </p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">{children}</p>;
}

const STATUS_TONE: Partial<Record<AppStatus, "default" | "secondary" | "outline" | "destructive">> = {
  operating: "default",
  launching: "default",
  paused: "destructive",
  closed: "outline",
};

export function AppStatusBadge({ status }: { status: AppStatus }) {
  return <Badge variant={STATUS_TONE[status] ?? "secondary"}>{APP_STATUS_LABELS[status]}</Badge>;
}

// Valor em vermelho quando negativo.
export function Signed({ value, children }: { value: number; children: ReactNode }) {
  return <span className={cn(value < 0 && "text-destructive")}>{children}</span>;
}

// Links de atalho (ex.: períodos), com o atual destacado.
export function ShortcutLinks({ label, links }: { label: string; links: { href: string; label: string; active: boolean }[] }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1.5">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={link.active ? "page" : undefined}
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            link.active ? "border-primary/60 bg-primary/10 text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

// Opções de mês para os filtros: os meses com lançamento e os últimos 12,
// do mais novo para o mais antigo. Valor "2026-11", texto "nov/2026".
export function monthOptions(range: { first: string | null; last: string | null }) {
  const now = currentMonth();
  const start = [range.first, addMonths(now, -11)].filter(Boolean).sort()[0] as string;
  const end = [range.last, now].filter(Boolean).sort().at(-1) as string;
  const options: { value: string; label: string }[] = [];
  for (let month = end; month >= start; month = addMonths(month, -1)) {
    options.push({ value: month.slice(0, 7), label: monthLabel(month) });
  }
  return options;
}
