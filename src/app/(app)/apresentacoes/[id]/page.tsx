import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, plural } from "@/lib/format";
import { encodeDeckData } from "@/lib/presentations/encode";
import { getPresentation } from "@/lib/presentations/queries";
import { deletePresentationAction } from "../actions";
import { PresentationLink } from "../_components/presentation-link";

export const metadata: Metadata = {
  title: "Apresentação",
};

export default function PresentationPage({ params }: PageProps<"/apresentacoes/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 max-w-4xl" />}>
      <Presentation params={params} />
    </Suspense>
  );
}

async function Presentation({ params }: Pick<PageProps<"/apresentacoes/[id]">, "params">) {
  const { id } = await params;
  const presentation = await getPresentation(id);
  if (!presentation) notFound();

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader
        title={`Apresentação para ${presentation.expertName}`}
        description={
          <span>
            Criada em {formatDateTime(presentation.createdAt)}
            {presentation.createdByName && ` por ${presentation.createdByName}`} ·{" "}
            <Link href={`/experts/${presentation.expertId}`} className="text-foreground underline-offset-4 hover:underline">
              Ver ficha do lead
            </Link>
          </span>
        }
        actions={
          <>
            <Link href={`/apresentacoes/${presentation.id}/editar`} className={buttonVariants({ variant: "outline" })}>
              Editar
            </Link>
            <ConfirmDeleteButton
              title="Excluir esta apresentação?"
              description="O link curto deixa de abrir para quem o recebeu. O registro continua na linha do tempo do lead."
              action={deletePresentationAction.bind(null, presentation.id)}
            />
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Link para o cliente</CardTitle>
          <CardDescription>
            Editar a apresentação não muda o link: quem já recebeu vê a versão nova. Na call, abra o link e aperte F
            para tela cheia e P para a janela do apresentador.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <PresentationLink code={presentation.code} whatsapp={presentation.expertWhatsapp} />
          <p className="text-sm text-muted-foreground" data-testid="views">
            {presentation.views
              ? `Aberta ${plural(presentation.views, "vez", "vezes")}${presentation.lastViewedAt ? ` · última em ${formatDateTime(presentation.lastViewedAt)}` : ""}.`
              : "Ainda não foi aberta."}{" "}
            A janela do apresentador não conta.
          </p>
        </CardContent>
      </Card>

      <div className="relative aspect-video overflow-hidden rounded-lg border bg-[#050706]">
        <iframe
          src={`/apresentacoes/previa?d=${encodeDeckData(presentation.data)}&modo=previa`}
          title="Prévia da apresentação"
          className="absolute inset-0 size-full border-0"
        />
      </div>
    </div>
  );
}
