import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getTemplateOptions } from "@/lib/templates/queries";
import { saveCadenceAction } from "../actions";
import { CadenceForm } from "../_components/cadence-form";

export const metadata: Metadata = {
  title: "Nova cadência",
};

export default function NewCadencePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Nova cadência" />
      <Suspense fallback={<Skeleton className="h-96 max-w-3xl" />}>
        <NewCadenceForm />
      </Suspense>
    </div>
  );
}

async function NewCadenceForm() {
  const templates = await getTemplateOptions();
  return (
    <CadenceForm
      action={saveCadenceAction.bind(null, null)}
      defaults={{ name: "", active: true, steps: [] }}
      templates={templates}
      isNew
    />
  );
}
