import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { getFormOptions } from "@/lib/experts/queries";
import { saveExpert } from "../actions";
import { ExpertForm } from "../_components/expert-form";
import { toFormDefaults } from "../_components/form-defaults";

export const metadata: Metadata = {
  title: "Novo expert",
};

export default function NewExpertPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Novo expert" description="O lead entra na etapa “Novo lead”." />
      <Suspense fallback={<Skeleton className="h-[40rem] max-w-4xl" />}>
        <NewExpertForm />
      </Suspense>
    </div>
  );
}

async function NewExpertForm() {
  const [options, user] = await Promise.all([getFormOptions(), getCurrentUser()]);
  return (
    <ExpertForm
      action={saveExpert.bind(null, null)}
      options={options}
      defaults={toFormDefaults(null, user.id)}
      expertId={null}
      cancelHref="/experts"
    />
  );
}
