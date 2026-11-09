import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { Tx } from "@/db";
import { activities, experts, expertTags, niches, tags } from "@/db/schema";
import { findOrCreateNiches, findOrCreateTags, getInitialStage } from "@/lib/experts/mutations";
import { normalizeForCompare, normalizeWhatsapp, parseFollowers } from "@/lib/experts/normalize";
import { formatDate, todayInSaoPaulo } from "@/lib/format";
import { computeScore } from "@/lib/score";
import { getScoreWeights } from "@/lib/settings";
import { candidateSchema, isHttpUrl, researchNotes } from "./candidate";
import type { ResearchConfig } from "./config";
import { profileFromUrl, profileKey } from "./profile-url";

// Análise de perfil pela IA: o usuário cadastra o lead pelo link (em "Novo
// expert"), o lead fica com a tag ANALYSIS_TAG, e o /analisar do Claude Code
// pesquisa o perfil e preenche os campos vazios.

export const ANALYSIS_TAG = "analisar-ia";
export const ANALYSIS_SOURCE = "Cadastro pelo link";
const ANALYSIS_TITLE = "Análise IA";

export class AnalysisError extends Error {
  constructor(
    message: string,
    readonly existingId?: string,
  ) {
    super(message);
  }
}

// Cria o lead só com o link e o põe na fila de análise.
export async function createForAnalysis(tx: Tx, rawUrl: string, userId: string) {
  if (!rawUrl.trim()) throw new AnalysisError("Cole o link do perfil.");
  const profile = profileFromUrl(rawUrl);
  if (!profile) {
    throw new AnalysisError("Cole o link de um perfil do Instagram, TikTok ou YouTube (não de um post ou vídeo).");
  }

  const [existing] = await tx
    .select({ id: experts.id, name: experts.name })
    .from(experts)
    .where(
      and(
        eq(experts.platform, profile.platform),
        eq(sql`lower(${experts.handle})`, profile.handle),
        isNull(experts.deletedAt),
      ),
    )
    .limit(1);
  if (existing) throw new AnalysisError(`Esse perfil já está no sistema: ${existing.name}.`, existing.id);

  const [stage, weights] = await Promise.all([getInitialStage(tx), getScoreWeights(tx)]);
  const empty = { engagementRate: null, sellsProduct: null, recurringProblem: null, hasMethod: null, contentFrequency: null };
  const [created] = await tx
    .insert(experts)
    .values({
      name: `@${profile.handle}`,
      handle: profile.handle,
      platform: profile.platform,
      profileUrl: profile.url,
      source: ANALYSIS_SOURCE,
      ownerId: userId,
      stageId: stage.id,
      ...computeScore(empty, weights),
    })
    .returning({ id: experts.id });

  const tagIds = await findOrCreateTags(tx, [ANALYSIS_TAG]);
  await tx.insert(expertTags).values({ expertId: created.id, tagId: tagIds.get(ANALYSIS_TAG)! });
  await tx.insert(activities).values({
    expertId: created.id,
    userId,
    type: "stage_change",
    description: `Lead cadastrado pelo link na etapa "${stage.name}", aguardando a análise da IA.`,
    metadata: { fromStageId: null, toStageId: stage.id, source: "link_analysis" },
  });
  return created.id;
}

// Leads na fila de análise (com a tag), do mais antigo para o mais novo.
export async function listPendingAnalyses(tx: Tx) {
  return tx
    .select({
      id: experts.id,
      name: experts.name,
      handle: experts.handle,
      platform: experts.platform,
      profileUrl: experts.profileUrl,
      nicheName: niches.name,
      followers: experts.followers,
      createdAt: experts.createdAt,
    })
    .from(experts)
    .innerJoin(expertTags, eq(expertTags.expertId, experts.id))
    .innerJoin(tags, eq(tags.id, expertTags.tagId))
    .leftJoin(niches, eq(niches.id, experts.nicheId))
    .where(and(eq(tags.name, ANALYSIS_TAG), isNull(experts.deletedAt)))
    .orderBy(asc(experts.createdAt));
}

// Quantos estão na fila e o id da tag (para o link da lista filtrada).
export async function getPendingSummary(tx: Tx) {
  const [tag] = await tx.select({ id: tags.id }).from(tags).where(eq(tags.name, ANALYSIS_TAG));
  if (!tag) return { count: 0, tagId: null };
  const [row] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(expertTags)
    .innerJoin(experts, eq(experts.id, expertTags.expertId))
    .where(and(eq(expertTags.tagId, tag.id), isNull(experts.deletedAt)));
  return { count: row?.count ?? 0, tagId: tag.id };
}

// Resultado da análise de um lead (arquivo tmp/pesquisa/analise-<data>.json).
// Mesmos campos do candidato do /pesquisa, mas o lead vem pelo id.
export const analysisSchema = candidateSchema
  .omit({ nome: true, handle: true, plataforma: true, profileUrl: true, nicho: true })
  .extend({
    id: z.uuid("id inválido"),
    encontrado: z.boolean().default(true),
    nome: z.string().trim().max(200).default(""),
    nicho: z.string().trim().max(100).default(""),
  });

export type AnalysisReport = {
  received: number;
  updated: { id: string; name: string; filled: string[] }[];
  notFound: { id: string; name: string }[];
  discarded: { label: string; reason: string }[];
  warnings: string[];
};

const toBoolean = (value: "" | "sim" | "nao") => (value === "" ? null : value === "sim");
const EMAIL = z.email();

export async function saveAnalyses(
  tx: Tx,
  rawItems: unknown[],
  options: { config: ResearchConfig; userId: string; searchKeys: Set<string> | null },
): Promise<AnalysisReport> {
  const report: AnalysisReport = { received: rawItems.length, updated: [], notFound: [], discarded: [], warnings: [] };
  const discard = (label: string, reason: string) => report.discarded.push({ label, reason });
  if (!options.searchKeys) {
    report.warnings.push("Sem registro de buscas: não deu para conferir se cada perfil apareceu numa busca. Confira os dados.");
  }

  const today = formatDate(todayInSaoPaulo());
  const weights = await getScoreWeights(tx);
  const [tag] = await tx.select({ id: tags.id }).from(tags).where(eq(tags.name, ANALYSIS_TAG));
  // Nichos válidos: os do banco (ativos) e os do config (criados se faltarem).
  const nicheRows = await tx.select({ id: niches.id, name: niches.name }).from(niches).where(eq(niches.active, true));
  const nicheIdByKey = new Map(nicheRows.map((row) => [normalizeForCompare(row.name), row.id]));
  const configNicheByKey = new Map(options.config.niches.map((niche) => [normalizeForCompare(niche.name), niche.name]));
  const seen = new Set<string>();

  for (const raw of rawItems) {
    const rawLabel = raw && typeof raw === "object" && "id" in raw ? String(raw.id) : "(sem id)";
    const parsed = analysisSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      discard(rawLabel, `dados inválidos (${issue.path.join(".") || "item"}: ${issue.message})`);
      continue;
    }
    const item = parsed.data;
    if (seen.has(item.id)) {
      discard(rawLabel, "repetido no arquivo");
      continue;
    }
    seen.add(item.id);

    // 1. O lead existe e está na fila de análise.
    const [expert] = tag
      ? await tx
          .select({ expert: experts })
          .from(experts)
          .innerJoin(expertTags, and(eq(expertTags.expertId, experts.id), eq(expertTags.tagId, tag.id)))
          .where(and(eq(experts.id, item.id), isNull(experts.deletedAt)))
      : [];
    if (!expert) {
      discard(rawLabel, "não está aguardando análise (já foi analisado, foi excluído ou não existe)");
      continue;
    }
    const lead = expert.expert;
    const label = `${lead.name} (@${lead.handle} · ${lead.platform})`;
    const finish = async (description: string, metadata: Record<string, unknown>, set: Partial<typeof experts.$inferInsert>) => {
      await tx.update(experts).set(set).where(eq(experts.id, lead.id));
      await tx.delete(expertTags).where(and(eq(expertTags.expertId, lead.id), eq(expertTags.tagId, tag!.id)));
      await tx.insert(activities).values({ expertId: lead.id, userId: options.userId, type: "note", description, metadata });
    };
    const appendNotes = (block: string) => (lead.notes ? `${lead.notes}\n\n${block}` : block).slice(0, 10000);

    // 2. Nada encontrado: sai da fila com um aviso nas observações.
    if (!item.encontrado) {
      await finish(
        "A IA não encontrou informações públicas do perfil.",
        { source: "link_analysis", found: false },
        { notes: appendNotes(`[${ANALYSIS_TITLE} · ${today}]\nNão encontrei informações públicas deste perfil no buscador. Preencha à mão.`) },
      );
      report.notFound.push({ id: lead.id, name: lead.name });
      continue;
    }

    // 3. Prova: o perfil apareceu na resposta de alguma busca registrada.
    const profile = profileFromUrl(lead.profileUrl ?? "");
    const key = profileKey(profile ?? { platform: lead.platform, handle: lead.handle });
    if (options.searchKeys && !options.searchKeys.has(key)) {
      discard(label, "o perfil não apareceu em nenhuma busca registrada; continua aguardando análise");
      continue;
    }

    // 4. Só preenche o que está vazio (o que o usuário digitou é mantido).
    const set: Partial<typeof experts.$inferInsert> = {};
    const filled: string[] = [];
    const isPlaceholderName = lead.name === `@${lead.handle}` || lead.name === lead.handle;
    if (item.nome && isPlaceholderName) {
      set.name = item.nome;
      filled.push("nome");
    }
    if (item.nicho && !lead.nicheId) {
      const nicheKey = normalizeForCompare(item.nicho);
      let nicheId = nicheIdByKey.get(nicheKey);
      const configName = configNicheByKey.get(nicheKey);
      if (!nicheId && configName) {
        nicheId = (await findOrCreateNiches(tx, [configName])).get(nicheKey);
        if (nicheId) nicheIdByKey.set(nicheKey, nicheId);
      }
      if (nicheId) {
        set.nicheId = nicheId;
        filled.push("nicho");
      } else {
        report.warnings.push(`${label}: nicho "${item.nicho}" não existe no sistema; ficou vazio.`);
      }
    }
    const followers = parseFollowers(item.seguidores);
    const validFollowers = followers !== null && Number.isFinite(followers) ? followers : null;
    if (validFollowers !== null && lead.followers === null) {
      set.followers = validFollowers;
      filled.push("seguidores");
    }
    if (item.cidade && !lead.city) {
      set.city = item.cidade;
      filled.push("cidade");
    }
    // Contato só com a página onde estava publicado.
    if (item.whatsapp || item.email) {
      if (!isHttpUrl(item.fonteContato)) {
        report.warnings.push(`${label}: contato removido (sem a página onde estava publicado).`);
      } else {
        const whatsapp = item.whatsapp ? normalizeWhatsapp(item.whatsapp) : null;
        if (whatsapp === "invalid") report.warnings.push(`${label}: WhatsApp inválido, não gravado.`);
        else if (whatsapp && !lead.whatsapp) {
          set.whatsapp = whatsapp;
          filled.push("WhatsApp");
        }
        if (item.email && !EMAIL.safeParse(item.email).success) report.warnings.push(`${label}: e-mail inválido, não gravado.`);
        else if (item.email && !lead.email) {
          set.email = item.email.toLowerCase();
          filled.push("e-mail");
        }
      }
    }
    const answers = [
      ["sellsProduct", item.vendeProduto, "vende produto"],
      ["hasMethod", item.temMetodo, "método"],
      ["recurringProblem", item.problemaRecorrente, "problema recorrente"],
      ["contentFrequency", item.frequenciaConteudo, "frequência de conteúdo"],
    ] as const;
    for (const [field, value, name] of answers) {
      const answer = toBoolean(value);
      if (answer !== null && lead[field] === null) {
        set[field] = answer;
        filled.push(name);
      }
    }
    if (item.produto && !lead.productDescription) {
      set.productDescription = item.produto;
      filled.push("produto");
    }
    set.notes = appendNotes(researchNotes(item, validFollowers, today, ANALYSIS_TITLE));
    filled.push("observações");

    // 5. Score recalculado com os dados novos.
    const merged = { ...lead, ...set };
    Object.assign(set, computeScore(merged, weights));

    await finish(`Perfil analisado pela IA. Preenchido: ${filled.join(", ")}.`, { source: "link_analysis", fields: filled }, set);
    report.updated.push({ id: lead.id, name: set.name ?? lead.name, filled });
  }
  return report;
}
