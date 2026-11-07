import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { saveTemplate } from "../actions";
import { TemplateForm } from "../_components/template-form";

export const metadata: Metadata = {
  title: "Novo template",
};

export default function NewTemplatePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Novo template" />
      <Suspense fallback={<Skeleton className="h-96 max-w-5xl" />}>
        <NewTemplateForm />
      </Suspense>
    </div>
  );
}

async function NewTemplateForm() {
  const user = await getCurrentUser();
  return (
    <TemplateForm
      action={saveTemplate.bind(null, null)}
      defaults={{ name: "", channel: "", stage: "", body: "" }}
      sdrName={user.name}
      isNew
    />
  );
}
