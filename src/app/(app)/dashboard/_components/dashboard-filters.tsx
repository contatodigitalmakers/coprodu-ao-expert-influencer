"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useTransition, type ReactNode } from "react";
import { SimpleSelect, type SelectOption } from "@/components/simple-select";
import { cn } from "@/lib/utils";

type Filter = { param: string; label: string; options: SelectOption[]; emptyLabel?: string; defaultValue?: string };

// Uma linha de filtros acima de tudo que eles afetam (guia de dataviz).
// Ao trocar, o conteúdo anterior fica com opacidade reduzida até atualizar.
export function DashboardFilters({ filters, children }: { filters: Filter[]; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Última URL pedida (dois filtros trocados em seguida não se desfazem).
  const pendingQuery = useRef<string | null>(null);
  useEffect(() => {
    if (searchParams.toString() === pendingQuery.current) pendingQuery.current = null;
  }, [searchParams]);

  function update(param: string, value: string | null) {
    const params = new URLSearchParams(pendingQuery.current ?? searchParams.toString());
    if (value) params.set(param, value);
    else params.delete(param);
    const query = params.toString();
    pendingQuery.current = query;
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtros">
        {filters.map((filter) => (
          <SimpleSelect
            key={filter.param}
            aria-label={filter.label}
            className="w-52"
            emptyLabel={filter.emptyLabel}
            options={filter.options}
            value={searchParams.get(filter.param) ?? filter.defaultValue ?? null}
            onValueChange={(value) => update(filter.param, value === filter.defaultValue ? null : value)}
          />
        ))}
      </div>
      <div className={cn("transition-opacity", isPending && "opacity-50")}>{children}</div>
    </div>
  );
}
