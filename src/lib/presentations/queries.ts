import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { runAsAnon } from "@/db";
import { experts, meetings, presentations, users, type User } from "@/db/schema";
import { queryAsUser } from "@/lib/auth";
import { getExpert } from "@/lib/experts/queries";
import { isUuid } from "@/lib/experts/normalize";
import { todayInSaoPaulo } from "@/lib/format";
import { PLATFORM_LABELS } from "@/lib/labels";
import { getActivePlans } from "@/lib/proposals/queries";
import { DEFAULT_PLANS, MAX_FIELD_LENGTH } from "./fields";

export const PRESENTATION_CODE = /^[a-z0-9]{6,12}$/;

const presentationFields = {
  id: presentations.id,
  code: presentations.code,
  data: presentations.data,
  views: presentations.views,
  lastViewedAt: presentations.lastViewedAt,
  createdAt: presentations.createdAt,
  updatedAt: presentations.updatedAt,
  expertId: experts.id,
  expertName: experts.name,
  expertHandle: experts.handle,
  expertWhatsapp: experts.whatsapp,
  createdByName: users.name,
};

// Lista da seção Apresentações, da mais nova para a mais antiga. A busca
// acha o nome ou @ do lead e também o nome usado na apresentação.
export async function listPresentations(search: string) {
  const term = search.trim();
  return queryAsUser((tx) =>
    tx
      .select(presentationFields)
      .from(presentations)
      .innerJoin(experts, eq(experts.id, presentations.expertId))
      .leftJoin(users, eq(users.id, presentations.userId))
      .where(
        and(
          isNull(presentations.deletedAt),
          isNull(experts.deletedAt),
          term
            ? or(
                ilike(experts.name, `%${term}%`),
                ilike(experts.handle, `%${term.replace(/^@/, "")}%`),
                ilike(sql`${presentations.data}->>'expert'`, `%${term}%`),
              )
            : undefined,
        ),
      )
      .orderBy(desc(presentations.createdAt))
      .limit(200),
  );
}

export type PresentationRow = Awaited<ReturnType<typeof listPresentations>>[number];

export async function getPresentation(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await queryAsUser((tx) =>
    tx
      .select(presentationFields)
      .from(presentations)
      .innerJoin(experts, eq(experts.id, presentations.expertId))
      .leftJoin(users, eq(users.id, presentations.userId))
      .where(and(eq(presentations.id, id), isNull(presentations.deletedAt), isNull(experts.deletedAt))),
  );
  return row ?? null;
}

export async function getExpertPresentations(expertId: string) {
  if (!isUuid(expertId)) return [];
  return queryAsUser((tx) =>
    tx
      .select(presentationFields)
      .from(presentations)
      .innerJoin(experts, eq(experts.id, presentations.expertId))
      .leftJoin(users, eq(users.id, presentations.userId))
      .where(and(eq(presentations.expertId, expertId), isNull(presentations.deletedAt)))
      .orderBy(desc(presentations.createdAt)),
  );
}

// Formulário de uma apresentação nova, já preenchido com os dados do lead,
// da reunião de diagnóstico e dos planos ativos. null se o lead não existe.
export async function getPresentationDefaults(expertId: string, user: User) {
  const expert = await getExpert(expertId);
  if (!expert) return null;
  const [meetingRows, activePlans] = await Promise.all([
    queryAsUser((tx) =>
      tx
        .select({ scheduledAt: meetings.scheduledAt, status: meetings.status, diagnosis: meetings.diagnosis })
        .from(meetings)
        .where(and(eq(meetings.expertId, expertId), sql`${meetings.status} <> 'canceled'`))
        .orderBy(desc(meetings.scheduledAt)),
    ),
    getActivePlans(),
  ]);

  // Data da conversa: a próxima reunião agendada ou, sem ela, a mais recente.
  const soon = Date.now() - 60 * 60 * 1000;
  const upcoming = meetingRows.filter((m) => m.status === "scheduled" && m.scheduledAt.getTime() >= soon).at(-1);
  const meeting = upcoming ?? meetingRows[0];
  const diagnosis = meetingRows.find((m) => m.diagnosis)?.diagnosis ?? {};

  const plans = [0, 1, 2].map((i) => activePlans[i] ?? { id: null, ...DEFAULT_PLANS[i] });
  const highlighted = plans.findIndex((plan) => plan.id && plan.id === diagnosis.planInterestId);

  const values: Record<string, string | null | undefined> = {
    // Nome provisório do cadastro pelo link ("@handle") não vai para a capa.
    expert: expert.name.startsWith("@") ? "" : expert.name,
    nicho: expert.nicheName,
    seguidores: expert.followers === null ? "" : String(expert.followers),
    rede: expert.platform === "other" ? "" : PLATFORM_LABELS[expert.platform],
    vende: diagnosis.currentProducts || expert.productDescription,
    publico: diagnosis.audience,
    data: meeting ? todayInSaoPaulo(meeting.scheduledAt) : "",
    vendedor: user.name,
    destaque: highlighted >= 0 ? String(highlighted + 1) : "",
  };
  plans.forEach((plan, i) => {
    values[`plano${i + 1}_voce`] = String(plan.expertShare);
    values[`plano${i + 1}_caucao`] = String(plan.setupValue);
  });

  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    const text = value?.trim().slice(0, MAX_FIELD_LENGTH);
    if (text) data[key] = text;
  }
  return { expert: { id: expert.id, name: expert.name }, data };
}

// Link curto (sem login): lê pelo código e, se pedido, conta a abertura.
export async function getPublicPresentation(code: string, registerView: boolean) {
  if (!PRESENTATION_CODE.test(code)) return null;
  const rows = await runAsAnon((tx) =>
    tx.execute<{ data: Record<string, string> | null }>(
      sql`select public.get_public_presentation(${code}, ${registerView}) as data`,
    ),
  );
  return rows[0]?.data ?? null;
}
