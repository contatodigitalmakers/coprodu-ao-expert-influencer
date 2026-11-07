import { sql, type SQL } from "drizzle-orm";
import { queryAsUser } from "@/lib/auth";
import { isUuid } from "@/lib/experts/normalize";
import { TOUCH_TYPES } from "@/lib/queue/queries";

// Dashboard (seção 3.9). Todos os números respeitam os mesmos filtros:
// período, SDR (responsável pelo lead; nos toques e tarefas, quem executou),
// nicho e cadência (leads que já foram inscritos nela).

export const PERIODS = {
  "7d": { label: "Últimos 7 dias", days: 7 },
  "30d": { label: "Últimos 30 dias", days: 30 },
  "90d": { label: "Últimos 90 dias", days: 90 },
  mes: { label: "Mês atual", days: null },
} as const;

export type Period = keyof typeof PERIODS;

export type DashboardFilters = {
  period: Period;
  ownerId: string | null;
  nicheId: string | null;
  cadenceId: string | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

export function parseDashboardFilters(params: SearchParams): DashboardFilters {
  const get = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const period = get("periodo");
  const uuid = (key: string) => {
    const value = get(key);
    return isUuid(value) ? value : null;
  };
  return {
    period: period && period in PERIODS ? (period as Period) : "30d",
    ownerId: uuid("responsavel"),
    nicheId: uuid("nicho"),
    cadenceId: uuid("cadencia"),
  };
}

const TZ = sql.raw("'America/Sao_Paulo'");

// Início do período no fuso de São Paulo (dias inteiros).
function periodStart(period: Period) {
  const days = PERIODS[period].days;
  return days === null
    ? sql`(date_trunc('month', now() at time zone ${TZ}) at time zone ${TZ})`
    : sql`((date_trunc('day', now() at time zone ${TZ}) - make_interval(days => ${days - 1})) at time zone ${TZ})`;
}

// Filtro de leads (alias "e" para experts).
function expertScope(filters: DashboardFilters) {
  const parts: SQL[] = [sql`e.deleted_at is null`];
  if (filters.ownerId) parts.push(sql`e.owner_id = ${filters.ownerId}`);
  if (filters.nicheId) parts.push(sql`e.niche_id = ${filters.nicheId}`);
  if (filters.cadenceId) {
    parts.push(sql`exists (select 1 from cadence_enrollments ce where ce.expert_id = e.id and ce.cadence_id = ${filters.cadenceId})`);
  }
  return sql.join(parts, sql` and `);
}

type Row = Record<string, unknown>;

export async function getDashboard(filters: DashboardFilters) {
  const start = periodStart(filters.period);
  const scope = expertScope(filters);
  const actorIs = (column: SQL) => (filters.ownerId ? sql`${column} = ${filters.ownerId}` : sql`true`);
  const touchTypes = sql.join(TOUCH_TYPES.map((type) => sql`${type}::activity_type`), sql`, `);

  return queryAsUser(async (tx) => {
    const rows = async <T extends Row>(query: SQL) => (await tx.execute(query)) as unknown as T[];

    // Funil: dos leads que entraram no período, quantos chegaram a cada etapa
    // (a etapa mais adiantada que cada um já alcançou; Perdido fica de fora).
    const funnel = await rows<{ id: string; name: string; reached: number }>(sql`
      with cohort as (
        select e.id, e.stage_id from experts e where ${scope} and e.created_at >= ${start}
      ),
      furthest as (
        select c.id, max(s."order") as max_order
        from cohort c
        join lateral (
          select (a.metadata->>'toStageId')::uuid as stage_id
          from activities a where a.expert_id = c.id and a.type = 'stage_change'
          union all select c.stage_id
        ) visited on true
        join stages s on s.id = visited.stage_id and not s.is_lost
        group by c.id
      )
      select s.id, s.name, (select count(*)::int from furthest f where f.max_order >= s."order") as reached
      from stages s where not s.is_lost order by s."order"`);

    const lossReasons = await rows<{ name: string; total: number }>(sql`
      select coalesce(lr.name, 'Sem motivo') as name, count(*)::int as total
      from experts e
      join stages s on s.id = e.stage_id and s.is_lost
      left join loss_reasons lr on lr.id = e.loss_reason_id
      where ${scope} and e.stage_entered_at >= ${start}
      group by 1 order by 2 desc, 1`);

    const touchesByDay = await rows<{ day: string; total: number }>(sql`
      select to_char(a.created_at at time zone ${TZ}, 'YYYY-MM-DD') as day, count(*)::int as total
      from activities a join experts e on e.id = a.expert_id
      where ${scope} and ${actorIs(sql`a.user_id`)} and a.type in (${touchTypes}) and a.created_at >= ${start}
      group by 1 order by 1`);

    const [tasks] = await rows<{ replied: number; contacted: number }>(sql`
      select count(*) filter (where t.outcome = 'replied')::int as replied,
             count(*) filter (where t.outcome in ('sent', 'replied', 'no_response'))::int as contacted
      from tasks t join experts e on e.id = t.expert_id
      where ${scope} and ${actorIs(sql`t.user_id`)} and t.status = 'done' and t.updated_at >= ${start}`);

    const [meetings] = await rows<{ scheduled: number; done: number }>(sql`
      select count(*) filter (where m.created_at >= ${start})::int as scheduled,
             count(*) filter (where m.status = 'done' and m.scheduled_at >= ${start})::int as done
      from meetings m join experts e on e.id = m.expert_id
      where ${scope}`);

    const [results] = await rows<{ newLeads: number; proposalsSent: number }>(sql`
      select (select count(*)::int from experts e where ${scope} and e.created_at >= ${start}) as "newLeads",
             (select count(*)::int from proposals p join experts e on e.id = p.expert_id
               where ${scope} and p.sent_at >= ${start}) as "proposalsSent"`);

    const won = await rows<{ planName: string; total: number; setup: number }>(sql`
      select pl.name as "planName", count(*)::int as total, sum(p.setup_value)::float as setup
      from projects pr
      join proposals p on p.id = pr.proposal_id
      join plans pl on pl.id = p.plan_id
      join experts e on e.id = pr.expert_id
      where ${scope} and pr.created_at >= ${start}
      group by pl.name order by total desc, setup desc`);

    const [{ startDate }] = await rows<{ startDate: string }>(sql`
      select to_char(${start} at time zone ${TZ}, 'YYYY-MM-DD') as "startDate"`);

    return {
      startDate,
      funnel,
      lossReasons,
      touchesByDay,
      touches: touchesByDay.reduce((sum, day) => sum + day.total, 0),
      replyRate: tasks.contacted ? Math.round((tasks.replied / tasks.contacted) * 100) : null,
      repliedCount: tasks.replied,
      contactedCount: tasks.contacted,
      meetingsScheduled: meetings.scheduled,
      meetingsDone: meetings.done,
      newLeads: results.newLeads,
      proposalsSent: results.proposalsSent,
      contractsWon: won.reduce((sum, plan) => sum + plan.total, 0),
      setupClosed: won.reduce((sum, plan) => sum + plan.setup, 0),
      topPlan: won[0]?.planName ?? null,
    };
  });
}

export type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
