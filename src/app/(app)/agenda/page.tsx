import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { listMeetings, type MeetingListItem } from "@/lib/meetings/queries";
import { cn } from "@/lib/utils";
import { MeetingBadge } from "./_components/meeting-badge";

export const metadata: Metadata = {
  title: "Agenda",
};

export default function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader title="Agenda" description="Reuniões de diagnóstico. Agende pela ficha do expert." />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Agenda searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Agenda({ searchParams }: Pick<PageProps<"/agenda">, "searchParams">) {
  const params = await searchParams;
  const onlyMine = params.todas !== "1";
  const user = await getCurrentUser();
  const rows = await listMeetings(onlyMine ? user.id : null);
  const upcoming = rows.filter((row) => row.isUpcoming);
  const past = rows.filter((row) => !row.isUpcoming).reverse();
  const chip = (active: boolean) => cn(buttonVariants({ variant: active ? "secondary" : "ghost", size: "sm" }));

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex gap-1" aria-label="Responsável">
        <Link href="/agenda" className={chip(onlyMine)}>
          Minhas reuniões
        </Link>
        <Link href="/agenda?todas=1" className={chip(!onlyMine)}>
          Todas
        </Link>
      </nav>
      <MeetingSection title="Próximas" rows={upcoming} empty="Nenhuma reunião agendada." />
      <MeetingSection title="Anteriores (últimos 30 dias)" rows={past} empty="Nenhuma reunião recente." />
    </div>
  );
}

function MeetingSection({ title, rows, empty }: { title: string; rows: MeetingListItem[]; empty: string }) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h2 className="font-heading text-base font-medium">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {rows.map((meeting) => (
            <li key={meeting.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <Link href={`/agenda/${meeting.id}`} className="font-medium hover:underline">
                  {formatDateTime(meeting.scheduledAt)} · {meeting.expertName}
                </Link>
                <p className="text-xs text-muted-foreground">
                  @{meeting.expertHandle} · com {meeting.closerName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {meeting.link && meeting.status === "scheduled" && (
                  <a href={meeting.link} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
                    Entrar na chamada
                  </a>
                )}
                <MeetingBadge status={meeting.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
