import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { Channel, TemplateStage } from "@/db/schema/enums";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CHANNEL_LABELS, TEMPLATE_STAGE_LABELS } from "@/lib/labels";
import { listTemplates, replyRate } from "@/lib/templates/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Templates",
};

export default function TemplatesPage({ searchParams }: PageProps<"/templates">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Templates e scripts"
        description="Mensagens por canal e categoria. Variáveis como {nome} são preenchidas com os dados do lead."
        actions={
          <Link href="/templates/novo" className={buttonVariants()}>
            Novo template
          </Link>
        }
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <TemplateLibrary searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function TemplateLibrary({ searchParams }: Pick<PageProps<"/templates">, "searchParams">) {
  const params = await searchParams;
  const channel = typeof params.canal === "string" && params.canal in CHANNEL_LABELS ? (params.canal as Channel) : null;
  const rows = await listTemplates(channel);
  const chip = (active: boolean) => cn(buttonVariants({ variant: active ? "secondary" : "ghost", size: "sm" }));

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex flex-wrap gap-1" aria-label="Canal">
        <Link href="/templates" className={chip(!channel)}>
          Todos os canais
        </Link>
        {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
          <Link key={value} href={`/templates?canal=${value}`} className={chip(channel === value)}>
            {label}
          </Link>
        ))}
      </nav>

      {!rows.length && (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhum template{channel ? " neste canal" : ""}.
        </p>
      )}

      {(Object.keys(TEMPLATE_STAGE_LABELS) as TemplateStage[]).map((stage) => {
        const group = rows.filter((row) => row.stage === stage);
        if (!group.length) return null;
        return (
          <section key={stage} className="flex flex-col gap-3" aria-label={TEMPLATE_STAGE_LABELS[stage]}>
            <h2 className="font-heading text-base font-medium">{TEMPLATE_STAGE_LABELS[stage]}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {group.map((template) => {
                const rate = replyRate(template);
                return (
                  <Card key={template.id} size="sm">
                    <CardHeader>
                      <CardTitle>
                        <Link href={`/templates/${template.id}/editar`} className="hover:underline">
                          {template.name}
                        </Link>
                      </CardTitle>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary">{CHANNEL_LABELS[template.channel]}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <p className="line-clamp-4 text-sm whitespace-pre-wrap text-muted-foreground">{template.body}</p>
                      <p className="text-xs text-muted-foreground">
                        Usado {template.timesUsed} {template.timesUsed === 1 ? "vez" : "vezes"} ·{" "}
                        {rate === null ? "sem dados de resposta" : `${rate}% de resposta`}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
