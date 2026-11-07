import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth";
import { FILTER_PARAMS, hasActiveFilters, parseFilters } from "@/lib/experts/filters";
import { getFormOptions, listExperts, PAGE_SIZE } from "@/lib/experts/queries";
import { formatFollowers } from "@/lib/format";
import { PLATFORM_LABELS } from "@/lib/labels";
import { ScoreBadge, TagBadge } from "./_components/badges";
import { ExpertsFilters } from "./_components/experts-filters";

export const metadata: Metadata = {
  title: "Experts",
};

export default function ExpertsPage({ searchParams }: PageProps<"/experts">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Experts"
        description="Todos os experts prospectados."
        actions={
          <>
            <Link href="/experts/importar" className={buttonVariants({ variant: "outline" })}>
              Importar CSV
            </Link>
            <Link href="/experts/novo" className={buttonVariants()}>
              Novo expert
            </Link>
          </>
        }
      />
      <Suspense fallback={<Skeleton className="h-[4.5rem] w-full" />}>
        <FiltersLoader />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ExpertsTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function FiltersLoader() {
  const options = await getFormOptions();
  return <ExpertsFilters options={options} />;
}

async function ExpertsTable({ searchParams }: Pick<PageProps<"/experts">, "searchParams">) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const user = await getCurrentUser();
  const { rows, total, page, pageCount } = await listExperts(filters, user.id);

  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        {hasActiveFilters(filters)
          ? "Nenhum expert encontrado com esses filtros."
          : "Nenhum expert cadastrado ainda. Cadastre o primeiro ou importe uma planilha."}
      </div>
    );
  }

  const pageHref = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string" && key !== FILTER_PARAMS.page) query.set(key, value);
    }
    if (target > 1) query.set(FILTER_PARAMS.page, String(target));
    const text = query.toString();
    return text ? `/experts?${text}` : "/experts";
  };
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = first + rows.length - 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Expert</TableHead>
              <TableHead>Nicho</TableHead>
              <TableHead className="text-right">Seguidores</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Link href={`/experts/${row.id}`} className="font-medium hover:underline">
                    {row.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    @{row.handle} · {PLATFORM_LABELS[row.platform]}
                  </div>
                </TableCell>
                <TableCell>{row.nicheName ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{formatFollowers(row.followers)}</TableCell>
                <TableCell>{row.stageName}</TableCell>
                <TableCell>
                  {row.ownerName ?? <span className="text-muted-foreground">Não atribuído</span>}
                </TableCell>
                <TableCell>
                  <ScoreBadge score={row.score} tier={row.scoreTier} />
                </TableCell>
                <TableCell>
                  <div className="flex max-w-56 flex-wrap gap-1">
                    {row.tags.map((tag) => (
                      <TagBadge key={tag.id} tag={tag} />
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {first}–{last} de {total} experts
        </span>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Anterior
              </Link>
            )}
            <span>
              Página {page} de {pageCount}
            </span>
            {page < pageCount && (
              <Link href={pageHref(page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Próxima
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
