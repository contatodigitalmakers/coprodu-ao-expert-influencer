import {
  ArrowRightLeftIcon,
  CalendarIcon,
  ExternalLinkIcon,
  FileTextIcon,
  HeartIcon,
  MailIcon,
  MessageCircleIcon,
  PhoneIcon,
  StickyNoteIcon,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import type { ActivityType } from "@/db/schema/enums";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { profileLink, whatsappLink } from "@/lib/experts/links";
import { getExpert, getTimeline, type ExpertDetail, type TimelineItem } from "@/lib/experts/queries";
import { formatDateTime, formatFollowers, formatPercent, formatWhatsapp } from "@/lib/format";
import { ACTIVITY_TYPE_LABELS, PLATFORM_LABELS } from "@/lib/labels";
import { addActivity, deleteExpert } from "../actions";
import { ScoreBadge, TagBadge } from "../_components/badges";
import { ActivityForm } from "./activity-form";
import { DeleteExpertButton } from "./delete-expert-button";

export const metadata: Metadata = {
  title: "Ficha do expert",
};

export default function ExpertPage({ params }: PageProps<"/experts/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[36rem] w-full" />}>
      <ExpertProfile params={params} />
    </Suspense>
  );
}

async function ExpertProfile({ params }: Pick<PageProps<"/experts/[id]">, "params">) {
  const { id } = await params;
  const [expert, timeline, user] = await Promise.all([getExpert(id), getTimeline(id), getCurrentUser()]);
  if (!expert) notFound();

  const profileUrl = profileLink(expert.platform, expert.handle, expert.profileUrl);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={expert.name}
        description={
          <span className="flex flex-wrap items-center gap-x-2">
            @{expert.handle} · {PLATFORM_LABELS[expert.platform]}
            {profileUrl && (
              <a
                href={profileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
              >
                Ver perfil <ExternalLinkIcon className="size-3.5" />
              </a>
            )}
          </span>
        }
        actions={
          <>
            <Link href={`/experts/${expert.id}/editar`} className={buttonVariants({ variant: "outline" })}>
              Editar
            </Link>
            {user.role === "admin" && (
              <DeleteExpertButton name={expert.name} action={deleteExpert.bind(null, expert.id)} />
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="secondary">{expert.stageName}</Badge>
        <ScoreBadge score={expert.score} tier={expert.scoreTier} />
        <span className="text-muted-foreground">
          Responsável: {expert.ownerName ?? "não atribuído"}
        </span>
        {expert.tags.map((tag) => (
          <TagBadge key={tag.id} tag={tag} />
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-6">
          <ExpertInfo expert={expert} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Linha do tempo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <ActivityForm action={addActivity.bind(null, expert.id)} />
            <Timeline items={timeline} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ExpertInfo({ expert }: { expert: ExpertDetail }) {
  const yesNo = (value: boolean | null) => (value === null ? "Não informado" : value ? "Sim" : "Não");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Dados</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoList>
            <Info label="Nicho">{expert.nicheName ?? "—"}</Info>
            <Info label="Seguidores">{formatFollowers(expert.followers)}</Info>
            <Info label="Engajamento">{formatPercent(expert.engagementRate)}</Info>
            <Info label="Cidade">{expert.city ?? "—"}</Info>
            <Info label="Origem">{expert.source ?? "—"}</Info>
            <Info label="Cadastrado em">{formatDateTime(expert.createdAt)}</Info>
            {expert.lossReasonName && (
              <Info label="Motivo da perda">
                {expert.lossReasonName}
                {expert.lossNote && ` — ${expert.lossNote}`}
              </Info>
            )}
          </InfoList>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoList>
            <Info label="WhatsApp">
              {expert.whatsapp ? (
                <a href={whatsappLink(expert.whatsapp)} target="_blank" rel="noreferrer" className="hover:underline">
                  {formatWhatsapp(expert.whatsapp)}
                </a>
              ) : (
                "—"
              )}
            </Info>
            <Info label="E-mail">
              {expert.email ? (
                <a href={`mailto:${expert.email}`} className="hover:underline">
                  {expert.email}
                </a>
              ) : (
                "—"
              )}
            </Info>
          </InfoList>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Qualificação</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoList>
            <Info label="Já vende produto digital?">
              {yesNo(expert.sellsProduct)}
              {expert.productDescription && ` — ${expert.productDescription}`}
            </Info>
            <Info label="Tem método estruturado?">{yesNo(expert.hasMethod)}</Info>
            <Info label="Problema é recorrente?">{yesNo(expert.recurringProblem)}</Info>
            <Info label="Produz conteúdo com frequência?">{yesNo(expert.contentFrequency)}</Info>
          </InfoList>
        </CardContent>
      </Card>

      {expert.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{expert.notes}</p>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function InfoList({ children }: { children: ReactNode }) {
  return <dl className="grid gap-3 text-sm">{children}</dl>;
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

const ACTIVITY_ICONS: Record<ActivityType, LucideIcon> = {
  note: StickyNoteIcon,
  stage_change: ArrowRightLeftIcon,
  interaction: HeartIcon,
  call: PhoneIcon,
  dm: MessageCircleIcon,
  whatsapp: MessageCircleIcon,
  email: MailIcon,
  meeting: CalendarIcon,
  proposal: FileTextIcon,
};

function Timeline({ items }: { items: TimelineItem[] }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>;
  }
  return (
    <ol className="flex flex-col gap-4">
      {items.map((item) => {
        const Icon = ACTIVITY_ICONS[item.type];
        return (
          <li key={item.id} className="flex gap-3">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <Icon className="size-3.5 text-muted-foreground" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-sm whitespace-pre-wrap">
                <span className="font-medium">{ACTIVITY_TYPE_LABELS[item.type]}</span>
                {item.description && ` · ${item.description}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.userName ?? "Sistema"} · {formatDateTime(item.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
