import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { OWNER_ME, OWNER_NONE } from "@/lib/experts/filters";
import { getPipelineCards, getStageOptions } from "@/lib/pipeline/queries";
import { cn } from "@/lib/utils";
import { KanbanBoard } from "./_components/kanban-board";
import { PipelineList } from "./_components/pipeline-list";

export const metadata: Metadata = {
  title: "Pipeline",
};

export default function PipelinePage({ searchParams }: PageProps<"/pipeline">) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PageHeader title="Pipeline" description="Arraste os cards para mudar a etapa. Cards em vermelho passaram do limite de dias da etapa." />
      <Suspense fallback={<Skeleton className="h-[28rem] w-full" />}>
        <Pipeline searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Pipeline({ searchParams }: Pick<PageProps<"/pipeline">, "searchParams">) {
  const params = await searchParams;
  const view = params.visao === "lista" ? "lista" : "kanban";
  const owner = typeof params.responsavel === "string" ? params.responsavel : null;
  const user = await getCurrentUser();
  const [{ stages, lossReasons }, cards] = await Promise.all([getStageOptions(), getPipelineCards(owner, user.id)]);

  const href = (changes: Record<string, string | null>) => {
    const query = new URLSearchParams();
    const merged = { visao: view === "lista" ? "lista" : null, responsavel: owner, ...changes };
    for (const [key, value] of Object.entries(merged)) if (value) query.set(key, value);
    const text = query.toString();
    return text ? `/pipeline?${text}` : "/pipeline";
  };
  const tab = (active: boolean) => cn(buttonVariants({ variant: active ? "secondary" : "ghost", size: "sm" }));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav className="flex gap-1" aria-label="Visão">
          <Link href={href({ visao: null })} className={tab(view === "kanban")}>
            Kanban
          </Link>
          <Link href={href({ visao: "lista" })} className={tab(view === "lista")}>
            Lista
          </Link>
        </nav>
        <nav className="flex gap-1" aria-label="Responsável">
          <Link href={href({ responsavel: null })} className={tab(!owner)}>
            Todos
          </Link>
          <Link href={href({ responsavel: OWNER_ME })} className={tab(owner === OWNER_ME)}>
            Meus leads
          </Link>
          <Link href={href({ responsavel: OWNER_NONE })} className={tab(owner === OWNER_NONE)}>
            Não atribuídos
          </Link>
        </nav>
      </div>
      {view === "lista" ? (
        <PipelineList stages={stages} cards={cards} lossReasons={lossReasons} />
      ) : (
        <KanbanBoard stages={stages} cards={cards} lossReasons={lossReasons} />
      )}
    </div>
  );
}
