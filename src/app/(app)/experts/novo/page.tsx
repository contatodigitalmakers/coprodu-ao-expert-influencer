import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser, queryAsUser } from "@/lib/auth";
import { getFormOptions } from "@/lib/experts/queries";
import { getPendingSummary } from "@/lib/research/analysis";
import { saveExpert } from "../actions";
import { ExpertForm } from "../_components/expert-form";
import { toFormDefaults } from "../_components/form-defaults";
import { LinkForm } from "./link-form";

export const metadata: Metadata = {
  title: "Novo expert",
};

export default function NewExpertPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Novo expert" description="O lead entra na etapa “Novo lead”." />
      <Suspense fallback={<Skeleton className="h-40 max-w-4xl" />}>
        <LinkSection />
      </Suspense>
      <div className="flex max-w-4xl items-center gap-3 text-sm text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou preencha à mão
        <span className="h-px flex-1 bg-border" />
      </div>
      <Suspense fallback={<Skeleton className="h-[40rem] max-w-4xl" />}>
        <NewExpertForm />
      </Suspense>
    </div>
  );
}

async function LinkSection() {
  await getCurrentUser();
  const pending = await queryAsUser((tx) => getPendingSummary(tx));
  return (
    <LinkForm
      pendingCount={pending.count}
      pendingHref={pending.tagId ? `/experts?tag=${pending.tagId}` : null}
    />
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
