import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import type { Channel } from "@/db/schema/enums";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth";
import { CHANNEL_LABELS } from "@/lib/labels";
import {
  DEFAULT_DAILY_GOAL,
  getQueue,
  getReactivationQueue,
  getTouchesToday,
  getUnassignedCount,
} from "@/lib/queue/queries";
import { ReactivationList } from "./_components/reactivation-list";
import { TaskCard } from "./_components/task-card";

export const metadata: Metadata = {
  title: "Fila do dia",
};

const CHANNEL_ORDER: Channel[] = ["interaction", "dm", "whatsapp", "email", "call"];

export default function QueuePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-4xl" />}>
      <Queue />
    </Suspense>
  );
}

async function Queue() {
  const user = await getCurrentUser();
  const [queue, touches, reactivation, unassigned] = await Promise.all([
    getQueue(user),
    getTouchesToday(user.id),
    getReactivationQueue(user.id),
    user.role === "admin" ? getUnassignedCount() : Promise.resolve(0),
  ]);
  const goal = user.dailyGoal ?? DEFAULT_DAILY_GOAL;
  const progress = Math.min(100, Math.round((touches / goal) * 100));
  const firstName = user.name.split(" ")[0];

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader
        title={`Olá, ${firstName}!`}
        description="Fila do dia: tarefas de hoje e atrasadas, agrupadas por canal."
      />

      <section aria-label="Meta diária" className="flex flex-col gap-2 rounded-lg border p-4">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-medium">Meta diária</span>
          <span className="tabular-nums" data-testid="daily-goal">
            {touches} de {goal} toques
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={touches} aria-valuemax={goal}>
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </section>

      {unassigned > 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {unassigned} lead(s) sem responsável.{" "}
          <Link href="/experts?responsavel=sem" className="font-medium underline">
            Distribuir
          </Link>
        </p>
      )}

      {queue.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Fila zerada! Nenhuma tarefa para hoje.
        </p>
      ) : (
        CHANNEL_ORDER.map((channel) => {
          const group = queue.filter((task) => task.channel === channel);
          if (!group.length) return null;
          return (
            <section key={channel} aria-label={CHANNEL_LABELS[channel]} className="flex flex-col gap-3">
              <h2 className="font-heading text-base font-medium">
                {CHANNEL_LABELS[channel]} <span className="text-sm font-normal text-muted-foreground">({group.length})</span>
              </h2>
              {group.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </section>
          );
        })
      )}

      {reactivation.length > 0 && (
        <section aria-label="Fila de reativação" className="flex flex-col gap-3">
          <h2 className="font-heading text-base font-medium">
            Fila de reativação <span className="text-sm font-normal text-muted-foreground">({reactivation.length})</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Leads perdidos por falta de resposta há algum tempo. Reativar volta o lead para “Novo lead”.
          </p>
          <ReactivationList leads={reactivation} />
        </section>
      )}
    </div>
  );
}
