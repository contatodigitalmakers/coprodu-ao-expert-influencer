import { and, asc, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { experts, meetings, plans, templates, users } from "@/db/schema";
import { queryAsUser } from "@/lib/auth";
import { isUuid } from "@/lib/experts/normalize";

const meetingFields = {
  id: meetings.id,
  scheduledAt: meetings.scheduledAt,
  link: meetings.link,
  status: meetings.status,
  closerId: meetings.userId,
  closerName: users.name,
  expertId: experts.id,
  expertName: experts.name,
  expertHandle: experts.handle,
};

// Agenda: reuniões a partir de 30 dias atrás. "isUpcoming" = agendada e ainda
// não passou (com 1 hora de tolerância para a reunião em andamento).
export async function listMeetings(onlyUserId: string | null) {
  return queryAsUser((tx) =>
    tx
      .select({
        ...meetingFields,
        isUpcoming: sql<boolean>`${meetings.status} = 'scheduled' and ${meetings.scheduledAt} >= now() - interval '1 hour'`,
      })
      .from(meetings)
      .innerJoin(experts, eq(experts.id, meetings.expertId))
      .innerJoin(users, eq(users.id, meetings.userId))
      .where(
        and(
          isNull(experts.deletedAt),
          gte(meetings.scheduledAt, sql`now() - interval '30 days'`),
          onlyUserId ? eq(meetings.userId, onlyUserId) : undefined,
        ),
      )
      .orderBy(asc(meetings.scheduledAt)),
  );
}

export type MeetingListItem = Awaited<ReturnType<typeof listMeetings>>[number];

export async function getMeeting(id: string) {
  if (!isUuid(id)) return null;
  return queryAsUser(async (tx) => {
    const [meeting] = await tx
      .select({ ...meetingFields, diagnosis: meetings.diagnosis })
      .from(meetings)
      .innerJoin(experts, eq(experts.id, meetings.expertId))
      .innerJoin(users, eq(users.id, meetings.userId))
      .where(and(eq(meetings.id, id), isNull(experts.deletedAt)));
    if (!meeting) return null;
    const [planRows, scripts] = await Promise.all([
      tx.select({ id: plans.id, name: plans.name }).from(plans).where(eq(plans.active, true)).orderBy(asc(plans.setupValue)),
      tx
        .select({ id: templates.id, name: templates.name, body: templates.body })
        .from(templates)
        .where(and(eq(templates.stage, "script"), isNull(templates.deletedAt)))
        .orderBy(desc(sql`${templates.name} ilike '%diagnóstico%'`), asc(templates.name)),
    ]);
    return { ...meeting, plans: planRows, scripts };
  });
}

export type MeetingDetail = NonNullable<Awaited<ReturnType<typeof getMeeting>>>;

export async function getExpertMeetings(expertId: string) {
  if (!isUuid(expertId)) return [];
  return queryAsUser((tx) =>
    tx
      .select(meetingFields)
      .from(meetings)
      .innerJoin(experts, eq(experts.id, meetings.expertId))
      .innerJoin(users, eq(users.id, meetings.userId))
      .where(eq(meetings.expertId, expertId))
      .orderBy(desc(meetings.scheduledAt)),
  );
}
