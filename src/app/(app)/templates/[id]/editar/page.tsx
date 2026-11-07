import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { getTemplate, replyRate } from "@/lib/templates/queries";
import { deleteTemplate, saveTemplate } from "../../actions";
import { TemplateForm } from "../../_components/template-form";

export const metadata: Metadata = {
  title: "Editar template",
};

export default function EditTemplatePage({ params }: PageProps<"/templates/[id]/editar">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 max-w-5xl" />}>
      <EditTemplate params={params} />
    </Suspense>
  );
}

async function EditTemplate({ params }: Pick<PageProps<"/templates/[id]/editar">, "params">) {
  const { id } = await params;
  const [template, user] = await Promise.all([getTemplate(id), getCurrentUser()]);
  if (!template) notFound();
  const rate = replyRate(template);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Editar ${template.name}`}
        description={`Usado ${template.timesUsed} ${template.timesUsed === 1 ? "vez" : "vezes"} · ${rate === null ? "sem dados de resposta" : `${rate}% de resposta`}`}
        actions={
          <ConfirmDeleteButton
            title={`Excluir “${template.name}”?`}
            description="O template sai da biblioteca. Passos de cadência que o usavam ficam sem mensagem."
            action={deleteTemplate.bind(null, template.id)}
          />
        }
      />
      <TemplateForm
        action={saveTemplate.bind(null, template.id)}
        defaults={{ name: template.name, channel: template.channel, stage: template.stage, body: template.body }}
        sdrName={user.name}
        isNew={false}
      />
    </div>
  );
}
