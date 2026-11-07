import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getActiveCadenceOptions } from "@/lib/cadences/queries";
import { getDashboard, parseDashboardFilters, PERIODS } from "@/lib/dashboard/queries";
import { getFormOptions } from "@/lib/experts/queries";
import { formatCurrency, todayInSaoPaulo } from "@/lib/format";
import { addDays } from "@/lib/cadences/mutations";
import { BarList, ColumnChart } from "./_components/charts";
import { DashboardFilters } from "./_components/dashboard-filters";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <div className="flex max-w-6xl flex-col gap-6">
      <PageHeader title="Dashboard" description="Funil, atividade e resultados. Os filtros valem para todos os números." />
      <Suspense fallback={<Skeleton className="h-[40rem] w-full" />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function DashboardContent({ searchParams }: Pick<PageProps<"/dashboard">, "searchParams">) {
  const filters = parseDashboardFilters(await searchParams);
  const [data, options, cadences] = await Promise.all([getDashboard(filters), getFormOptions(), getActiveCadenceOptions()]);

  // Um ponto por dia do período, inclusive os dias sem toque.
  const byDay = new Map(data.touchesByDay.map((row) => [row.day, row.total]));
  const days: { day: string; value: number }[] = [];
  for (let day = data.startDate, today = todayInSaoPaulo(); day <= today; day = addDays(day, 1)) {
    days.push({ day, value: byDay.get(day) ?? 0 });
  }

  const funnel = data.funnel.map((stage, index) => {
    const previous = data.funnel[index - 1];
    const rate = previous && previous.reached > 0 ? Math.round((stage.reached / previous.reached) * 100) : null;
    return { label: stage.name, value: stage.reached, note: rate === null ? undefined : `${rate}% da anterior` };
  });
  const toOptions = (rows: { id: string; name: string }[]) => rows.map((row) => ({ value: row.id, label: row.name }));

  return (
    <DashboardFilters
      filters={[
        {
          param: "periodo",
          label: "Período",
          options: Object.entries(PERIODS).map(([value, period]) => ({ value, label: period.label })),
          defaultValue: "30d",
        },
        { param: "responsavel", label: "SDR", options: toOptions(options.users), emptyLabel: "Todos os SDRs" },
        { param: "nicho", label: "Nicho", options: toOptions(options.niches), emptyLabel: "Todos os nichos" },
        { param: "cadencia", label: "Cadência", options: toOptions(cadences), emptyLabel: "Todas as cadências" },
      ]}
    >
      <div className="flex flex-col gap-6">
        <section aria-label="Resultado" className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))]">
          <Card>
            <CardContent className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">Valor de setup fechado</p>
              <p className="font-sans text-5xl font-semibold" data-testid="setup-closed">
                {formatCurrency(data.setupClosed)}
              </p>
            </CardContent>
          </Card>
          <StatTile label="Contratos ganhos" value={data.contractsWon} />
          <StatTile label="Plano mais vendido" value={data.topPlan ?? "—"} />
        </section>

        <section aria-label="Atividade" className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Leads novos" value={data.newLeads} />
          <StatTile label="Toques" value={data.touches} />
          <StatTile
            label="Taxa de resposta"
            value={data.replyRate === null ? "—" : `${data.replyRate}%`}
            detail={data.contactedCount ? `${data.repliedCount} de ${data.contactedCount} contatos` : "sem contatos no período"}
          />
          <StatTile label="Reuniões agendadas" value={data.meetingsScheduled} />
          <StatTile label="Reuniões realizadas" value={data.meetingsDone} />
          <StatTile label="Propostas enviadas" value={data.proposalsSent} />
        </section>

        <div className="grid items-start gap-4 lg:grid-cols-2">
          <ChartCard title="Funil" description="Dos leads que entraram no período, quantos chegaram a cada etapa.">
            {data.newLeads === 0 ? <Empty /> : <BarList items={funnel} label="Etapa" noteHeader="Conversão" />}
          </ChartCard>
          <div className="flex flex-col gap-4">
            <ChartCard title="Toques por dia" description="Contatos registrados na fila do dia ou na ficha.">
              {data.touches === 0 ? <Empty /> : <ColumnChart days={days} label="Toques por dia" unit="toques" />}
            </ChartCard>
            <ChartCard title="Motivos de perda" description="Leads que foram para Perdido no período.">
              {data.lossReasons.length === 0 ? (
                <Empty />
              ) : (
                <BarList items={data.lossReasons.map((row) => ({ label: row.name, value: row.total }))} label="Motivo" />
              )}
            </ChartCard>
          </div>
        </div>
      </div>
    </DashboardFilters>
  );
}

function StatTile({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <Card size="sm" role="group" aria-label={label}>
      <CardContent className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold" data-slot="stat-value">
          {value}
        </p>
        {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Empty() {
  return <p className="py-6 text-center text-sm text-muted-foreground">Sem dados no período e filtros escolhidos.</p>;
}
