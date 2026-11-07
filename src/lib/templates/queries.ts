import { and, asc, eq, isNull } from "drizzle-orm";
import { cache } from "react";
import { templates } from "@/db/schema";
import type { Channel } from "@/db/schema/enums";
import { queryAsUser } from "@/lib/auth";
import { isUuid } from "@/lib/experts/normalize";

// Templates ativos (sem os excluídos), opcionalmente de um canal.
export async function listTemplates(channel: Channel | null) {
  return queryAsUser((tx) =>
    tx
      .select()
      .from(templates)
      .where(and(isNull(templates.deletedAt), channel ? eq(templates.channel, channel) : undefined))
      .orderBy(asc(templates.name)),
  );
}

export type TemplateRow = Awaited<ReturnType<typeof listTemplates>>[number];

export async function getTemplate(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await queryAsUser((tx) =>
    tx
      .select()
      .from(templates)
      .where(and(eq(templates.id, id), isNull(templates.deletedAt))),
  );
  return row ?? null;
}

// Opções para escolher template num passo de cadência.
export const getTemplateOptions = cache(async () =>
  queryAsUser((tx) =>
    tx
      .select({ id: templates.id, name: templates.name, channel: templates.channel })
      .from(templates)
      .where(isNull(templates.deletedAt))
      .orderBy(asc(templates.name)),
  ),
);

// Taxa de resposta do template (respostas / usos), em %.
export function replyRate(template: { timesUsed: number; timesReplied: number }) {
  return template.timesUsed ? Math.round((template.timesReplied / template.timesUsed) * 100) : null;
}
