"use client";

import { SearchIcon, XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { SimpleSelect } from "@/components/simple-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FILTER_PARAMS, FOLLOWER_RANGES, OWNER_ME, OWNER_NONE } from "@/lib/experts/filters";
import type { FormOptions } from "@/lib/experts/queries";
import { cn } from "@/lib/utils";

const toOptions = (rows: { id: string; name: string }[]) =>
  rows.map((row) => ({ value: row.id, label: row.name }));

const FOLLOWER_OPTIONS = Object.entries(FOLLOWER_RANGES).map(([value, { label }]) => ({ value, label }));
const TIER_OPTIONS = ["A", "B", "C"].map((tier) => ({ value: tier, label: `Score ${tier}` }));

export function ExpertsFilters({ options }: { options: FormOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Última URL pedida. Enquanto a navegação anterior não termina,
  // useSearchParams ainda tem os filtros antigos; sem isso, dois filtros
  // trocados em seguida desfariam um ao outro.
  const pendingQuery = useRef<string | null>(null);
  useEffect(() => {
    if (searchParams.toString() === pendingQuery.current) pendingQuery.current = null;
  }, [searchParams]);

  function navigate(query: string) {
    pendingQuery.current = query;
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname));
  }

  function update(changes: Record<string, string | null>) {
    const params = new URLSearchParams(pendingQuery.current ?? searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete(FILTER_PARAMS.page); // filtro novo volta para a página 1
    navigate(params.toString());
  }

  // Busca com pequena espera para não recarregar a cada tecla.
  const [search, setSearch] = useState(searchParams.get(FILTER_PARAMS.search) ?? "");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  function onSearchChange(value: string) {
    setSearch(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => update({ [FILTER_PARAMS.search]: value.trim() || null }), 350);
  }

  const selects = [
    { param: FILTER_PARAMS.nicheId, label: "Nicho", empty: "Todos os nichos", options: toOptions(options.niches) },
    { param: FILTER_PARAMS.stageId, label: "Etapa", empty: "Todas as etapas", options: toOptions(options.stages) },
    {
      param: FILTER_PARAMS.owner,
      label: "Responsável",
      empty: "Todos os responsáveis",
      options: [
        { value: OWNER_ME, label: "Meus leads" },
        { value: OWNER_NONE, label: "Não atribuídos" },
        ...toOptions(options.users),
      ],
    },
    { param: FILTER_PARAMS.tagId, label: "Tag", empty: "Todas as tags", options: toOptions(options.tags) },
    { param: FILTER_PARAMS.tier, label: "Score", empty: "Todos os scores", options: TIER_OPTIONS },
    { param: FILTER_PARAMS.followers, label: "Seguidores", empty: "Qualquer nº de seguidores", options: FOLLOWER_OPTIONS },
  ];

  const hasFilters = Object.values(FILTER_PARAMS).some(
    (param) => param !== FILTER_PARAMS.page && searchParams.has(param),
  );

  return (
    <div className={cn("flex flex-col gap-2 transition-opacity", isPending && "opacity-60")}>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nome ou @"
          aria-label="Buscar por nome ou @"
          className="pl-8"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {selects.map((filter) => (
          <SimpleSelect
            key={filter.param}
            aria-label={filter.label}
            emptyLabel={filter.empty}
            options={filter.options}
            value={searchParams.get(filter.param)}
            onValueChange={(value) => update({ [filter.param]: value })}
          />
        ))}
      </div>
      {hasFilters && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              navigate("");
            }}
          >
            <XIcon /> Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
