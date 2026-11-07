import { and, asc, count, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { activities, cadenceSteps, experts, lossReasons, niches, settings, stages, tasks, templates } from "@/db/schema";
import type { Channel } from "@/db/schema/enums";
import { queryAsUser } from "@/lib/auth";
import { profileLink, whatsappLink } from "@/lib/experts/links";
import { todayInSaoPaulo } from "@/lib/format";
import { daysSince } from "@/lib/pipeline/queries";
import { renderTemplate, splitEmailSubject } from "@/lib/templates/render";

// Fila do dia do SDR (seção 3.5).

export const DEFAULT_DAILY_GOAL = 40;

// Tipos de atividade que contam como "toque" (contato com o lead).
export const TOUCH_TYPES = ["interaction", "dm", "whatsapp", "email", "call"] as const;

// Início do dia de hoje em São Paulo (para contar os toques do dia).
const START_OF_TODAY = sql`(date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')`;

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

// Link direto do canal: perfil, wa.me com o texto, mailto ou telefone.
function channelLink(
  channel: Channel,
  expert: { platform: Parameters<typeof profileLink>[0]; handle: string; profileUrl: string | null; whatsapp: string | null; email: string | null },
  message: string,
) {
  switch (channel) {
    case "interaction":
    case "dm":
      return profileLink(expert.platform, expert.handle, expert.profileUrl);
    case "whatsapp":
      return expert.whatsapp ? `${whatsappLink(expert.whatsapp)}?text=${encodeURIComponent(message)}` : null;
    case "email": {
      if (!expert.email) return null;
      const { subject, body } = splitEmailSubject(message);
      return `mailto:${expert.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
    case "call":
      return expert.whatsapp ? `tel:+${expert.whatsapp}` : null;
  }
}

// Tarefas pendentes do usuário com vencimento até hoje, já com a mensagem pronta.
export async function getQueue(user: { id: string; name: string }) {
  const today = todayInSaoPaulo();
  const rows = await queryAsUser((tx) =>
    tx
      .select({
        id: tasks.id,
        dueDate: tasks.dueDate,
        channel: tasks.channel,
        dayOffset: cadenceSteps.dayOffset,
        templateName: templates.name,
        templateBody: templates.body,
        expertId: experts.id,
        expertName: experts.name,
        handle: experts.handle,
        platform: experts.platform,
        profileUrl: experts.profileUrl,
        whatsapp: experts.whatsapp,
        email: experts.email,
        followers: experts.followers,
        nicheName: niches.name,
      })
      .from(tasks)
      .innerJoin(experts, eq(experts.id, tasks.expertId))
      .leftJoin(niches, eq(niches.id, experts.nicheId))
      .leftJoin(cadenceSteps, eq(cadenceSteps.id, tasks.stepId))
      .leftJoin(templates, and(eq(templates.id, cadenceSteps.templateId), isNull(templates.deletedAt)))
      .where(and(eq(tasks.userId, user.id), eq(tasks.status, "pending"), lte(tasks.dueDate, today), isNull(experts.deletedAt)))
      .orderBy(asc(tasks.dueDate), asc(experts.name)),
  );

  return rows.map((row) => {
    const rendered = row.templateBody
      ? renderTemplate(row.templateBody, {
          name: firstName(row.expertName),
          niche: row.nicheName,
          handle: row.handle,
          followers: row.followers,
          sdrName: firstName(user.name),
        })
      : null;
    return {
      id: row.id,
      channel: row.channel,
      dueDate: row.dueDate,
      daysLate: daysSince(new Date(`${row.dueDate}T12:00:00-03:00`), new Date(`${today}T12:00:00-03:00`).getTime()),
      step: row.dayOffset === null ? null : `D${row.dayOffset}`,
      templateName: row.templateName,
      message: rendered?.text ?? null,
      missing: rendered?.missing ?? [],
      link: channelLink(row.channel, row, rendered?.text ?? ""),
      expert: { id: row.expertId, name: row.expertName, handle: row.handle, nicheName: row.nicheName },
    };
  });
}

export type QueueTask = Awaited<ReturnType<typeof getQueue>>[number];

// Toques do usuário hoje (contatos registrados na fila ou na ficha).
export async function getTouchesToday(userId: string) {
  const [row] = await queryAsUser((tx) =>
    tx
      .select({ total: count() })
      .from(activities)
      .where(and(eq(activities.userId, userId), inArray(activities.type, [...TOUCH_TYPES]), gte(activities.createdAt, START_OF_TODAY))),
  );
  return row.total;
}

// Fila de reativação: perdidos por "Sem resposta" há mais de N dias (configurações),
// do usuário ou sem responsável.
export async function getReactivationQueue(userId: string) {
  return queryAsUser(async (tx) => {
    const [config] = await tx.select({ days: settings.reactivationDays }).from(settings).limit(1);
    const rows = await tx
      .select({ id: experts.id, name: experts.name, handle: experts.handle, lostAt: experts.stageEnteredAt })
      .from(experts)
      .innerJoin(stages, eq(stages.id, experts.stageId))
      .innerJoin(lossReasons, eq(lossReasons.id, experts.lossReasonId))
      .where(
        and(
          isNull(experts.deletedAt),
          eq(stages.isLost, true),
          eq(lossReasons.key, "no_reply"),
          or(eq(experts.ownerId, userId), isNull(experts.ownerId)),
          lte(experts.stageEnteredAt, sql`now() - make_interval(days => ${config?.days ?? 60})`),
        ),
      )
      .orderBy(asc(experts.stageEnteredAt))
      .limit(50);
    return rows.map((row) => ({ ...row, daysLost: daysSince(row.lostAt) }));
  });
}

export async function getUnassignedCount() {
  const [row] = await queryAsUser((tx) =>
    tx
      .select({ total: count() })
      .from(experts)
      .where(and(isNull(experts.ownerId), isNull(experts.deletedAt))),
  );
  return row.total;
}
