import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { getExpert, getFormOptions } from "@/lib/experts/queries";
import { saveExpert } from "../../actions";
import { ExpertForm } from "../../_components/expert-form";
import { toFormDefaults } from "../../_components/form-defaults";

export const metadata: Metadata = {
  title: "Editar expert",
};

export default function EditExpertPage({ params }: PageProps<"/experts/[id]/editar">) {
  return (
    <Suspense fallback={<Skeleton className="h-[40rem] max-w-4xl" />}>
      <EditExpert params={params} />
    </Suspense>
  );
}

async function EditExpert({ params }: Pick<PageProps<"/experts/[id]/editar">, "params">) {
  const { id } = await params;
  const [expert, options, user] = await Promise.all([getExpert(id), getFormOptions(), getCurrentUser()]);
  if (!expert) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Editar ${expert.name}`} description="A etapa do lead é alterada no Pipeline." />
      <ExpertForm
        action={saveExpert.bind(null, expert.id)}
        options={options}
        defaults={toFormDefaults(expert, user.id)}
        expertId={expert.id}
        cancelHref={`/experts/${expert.id}`}
      />
    </div>
  );
}
