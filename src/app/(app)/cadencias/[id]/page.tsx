import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCadence } from "@/lib/cadences/queries";
import { getTemplateOptions } from "@/lib/templates/queries";
import { saveCadenceAction } from "../actions";
import { CadenceForm } from "../_components/cadence-form";

export const metadata: Metadata = {
  title: "Editar cadência",
};

export default function EditCadencePage({ params }: PageProps<"/cadencias/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 max-w-3xl" />}>
      <EditCadence params={params} />
    </Suspense>
  );
}

async function EditCadence({ params }: Pick<PageProps<"/cadencias/[id]">, "params">) {
  const { id } = await params;
  const [cadence, templates] = await Promise.all([getCadence(id), getTemplateOptions()]);
  if (!cadence) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={cadence.name}
        description="Mudanças valem para novas inscrições; tarefas já criadas não mudam."
      />
      <CadenceForm
        action={saveCadenceAction.bind(null, cadence.id)}
        defaults={{
          name: cadence.name,
          active: cadence.active,
          steps: cadence.steps.map((step) => ({ id: step.id, dayOffset: step.dayOffset, channel: step.channel, templateId: step.templateId })),
        }}
        templates={templates}
        isNew={false}
      />
    </div>
  );
}
