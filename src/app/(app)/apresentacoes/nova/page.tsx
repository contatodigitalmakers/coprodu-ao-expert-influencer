import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { parseFilters } from "@/lib/experts/filters";
import { listExperts } from "@/lib/experts/queries";
import { formatFollowers } from "@/lib/format";
import { PLATFORM_LABELS } from "@/lib/labels";
import { getPresentationDefaults } from "@/lib/presentations/queries";
import { createPresentationAction } from "../actions";
import { PresentationForm } from "../_components/presentation-form";
import { SearchForm } from "../_components/search-form";

export const metadata: Metadata = {
  title: "Nova apresentação",
};

export default function NewPresentationPage({ searchParams }: PageProps<"/apresentacoes/nova">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Nova apresentação" />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <NewPresentation searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function NewPresentation({ searchParams }: Pick<PageProps<"/apresentacoes/nova">, "searchParams">) {
  const params = await searchParams;
  if (typeof params.lead !== "string") return <LeadPicker params={params} />;

  const user = await getCurrentUser();
  const defaults = await getPresentationDefaults(params.lead, user);
  if (!defaults) notFound();
  return (
    <PresentationForm
      expertName={defaults.expert.name}
      initial={defaults.data}
      action={createPresentationAction.bind(null, defaults.expert.id)}
      cancelHref={`/experts/${defaults.expert.id}`}
      submitLabel="Salvar e gerar link"
    />
  );
}

// Sem lead escolhido: busca o lead para quem é a apresentação.
async function LeadPicker({ params }: { params: Record<string, string | string[] | undefined> }) {
  const user = await getCurrentUser();
  const filters = parseFilters({ busca: params.busca });
  const { rows } = await listExperts(filters, user.id);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <p className="text-sm text-muted-foreground">Para quem é a apresentação? Busque o lead.</p>
      <SearchForm action="/apresentacoes/nova" defaultValue={filters.search ?? ""} label="Buscar lead" />
      {!rows.length ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Nenhum lead encontrado.</p>
      ) : (
        <ul className="divide-y rounded-lg border" aria-label="Leads">
          {rows.map((lead) => (
            <li key={lead.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <div className="truncate font-medium">{lead.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  @{lead.handle} · {PLATFORM_LABELS[lead.platform]} · {formatFollowers(lead.followers)} · {lead.stageName}
                </div>
              </div>
              <Link href={`/apresentacoes/nova?lead=${lead.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Criar apresentação
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
