import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getPresentation } from "@/lib/presentations/queries";
import { updatePresentationAction } from "../../actions";
import { PresentationForm } from "../../_components/presentation-form";

export const metadata: Metadata = {
  title: "Editar apresentação",
};

export default function EditPresentationPage({ params }: PageProps<"/apresentacoes/[id]/editar">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Editar apresentação" description="O link curto continua o mesmo." />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <EditPresentation params={params} />
      </Suspense>
    </div>
  );
}

async function EditPresentation({ params }: Pick<PageProps<"/apresentacoes/[id]/editar">, "params">) {
  const { id } = await params;
  const presentation = await getPresentation(id);
  if (!presentation) notFound();
  return (
    <PresentationForm
      expertName={presentation.expertName}
      initial={presentation.data}
      action={updatePresentationAction.bind(null, presentation.id)}
      cancelHref={`/apresentacoes/${presentation.id}`}
      submitLabel="Salvar alterações"
    />
  );
}
