import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { getMeeting } from "@/lib/meetings/queries";
import { getFormOptions } from "@/lib/experts/queries";
import { rescheduleMeetingAction, saveDiagnosisAction, setMeetingStatusAction } from "../actions";
import { DiagnosisForm } from "../_components/diagnosis-form";
import { MeetingBadge } from "../_components/meeting-badge";
import { MeetingForm } from "../_components/meeting-form";
import { StatusButtons } from "../_components/status-buttons";

export const metadata: Metadata = {
  title: "Reunião de diagnóstico",
};

export default function MeetingPage({ params }: PageProps<"/agenda/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-5xl" />}>
      <Meeting params={params} />
    </Suspense>
  );
}

// Data e hora da reunião no horário de Brasília, para o formulário de reagendar.
function toFormDateTime(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

async function Meeting({ params }: Pick<PageProps<"/agenda/[id]">, "params">) {
  const { id } = await params;
  const [meeting, options] = await Promise.all([getMeeting(id), getFormOptions()]);
  if (!meeting) notFound();

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader
        title={
          <>
            Diagnóstico ·{" "}
            <Link href={`/experts/${meeting.expertId}`} className="hover:underline">
              {meeting.expertName}
            </Link>
          </>
        }
        description={`${formatDateTime(meeting.scheduledAt)} · com ${meeting.closerName}`}
        actions={
          <>
            <MeetingBadge status={meeting.status} />
            {meeting.link && (
              <a href={meeting.link} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
                Entrar na chamada
              </a>
            )}
          </>
        }
      />

      {meeting.status === "scheduled" && <StatusButtons action={setMeetingStatusAction.bind(null, meeting.id)} />}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Formulário de diagnóstico</CardTitle>
          </CardHeader>
          <CardContent>
            <DiagnosisForm action={saveDiagnosisAction.bind(null, meeting.id)} defaults={meeting.diagnosis} plans={meeting.plans} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          {meeting.scripts.map((script, index) => (
            <Card key={script.id}>
              <CardHeader>
                <CardTitle>{script.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {index === 0 ? (
                  <p className="text-sm whitespace-pre-wrap">{script.body}</p>
                ) : (
                  <details>
                    <summary className="cursor-pointer text-sm text-muted-foreground">Ver roteiro</summary>
                    <p className="mt-2 text-sm whitespace-pre-wrap">{script.body}</p>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardHeader>
              <CardTitle>Reagendar</CardTitle>
            </CardHeader>
            <CardContent>
              <MeetingForm
                action={rescheduleMeetingAction.bind(null, meeting.id)}
                users={options.users}
                defaults={{ ...toFormDateTime(meeting.scheduledAt), link: meeting.link ?? "", closerId: meeting.closerId }}
                submitLabel="Reagendar"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
