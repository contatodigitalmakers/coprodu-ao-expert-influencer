import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Tx } from "@/db";
import { experts, tags } from "@/db/schema";
import { analyzeImport, importAnalyzedRows } from "@/lib/experts/import";
import { normalizeForCompare, normalizeHandle, parseFollowers } from "@/lib/experts/normalize";
import { formatDate, todayInSaoPaulo } from "@/lib/format";
import { candidateSchema, RESEARCH_TAG, toImportRow, type Candidate } from "./candidate";
import type { ResearchConfig } from "./config";
import { profileFromUrl, profileKey, type ProfileRef } from "./profile-url";

// Grava os candidatos de uma rodada do /pesquisa, aplicando as regras em ordem.
// Cada candidato descartado sai com o motivo, para o relatório da rodada.

export type ResearchReport = {
  received: number;
  created: { id: string; name: string; handle: string; platform: string }[];
  discarded: { label: string; reason: string }[];
  warnings: string[];
  tagId: string | null;
};

type Accepted = { candidate: Candidate; profile: ProfileRef; niche: string; followers: number | null; label: string };

export async function saveResearch(
  tx: Tx,
  rawCandidates: unknown[],
  options: {
    config: ResearchConfig;
    userId: string;
    // Perfis vistos nas buscas registradas; null = sem registro (prova não conferida).
    searchKeys: Set<string> | null;
    limit?: number;
  },
): Promise<ResearchReport> {
  const { config } = options;
  const report: ResearchReport = { received: rawCandidates.length, created: [], discarded: [], warnings: [], tagId: null };
  const discard = (label: string, reason: string) => report.discarded.push({ label, reason });
  if (!options.searchKeys) {
    report.warnings.push("Sem registro de buscas: não deu para conferir se cada perfil apareceu numa busca. Confira os perfis antes de prospectar.");
  }

  const nicheByKey = new Map(config.niches.map((niche) => [normalizeForCompare(niche.name), niche.name]));
  const seen = new Set<string>();
  const accepted: Accepted[] = [];

  for (const raw of rawCandidates) {
    const rawLabel = (raw && typeof raw === "object" && "nome" in raw ? String(raw.nome) : "") || "(sem nome)";
    const parsed = candidateSchema.safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      discard(rawLabel, `dados inválidos (${issue.path.join(".") || "candidato"}: ${issue.message})`);
      continue;
    }
    const candidate = parsed.data;

    // 1. Link de perfil e @ tirado do próprio link.
    const profile = profileFromUrl(candidate.profileUrl);
    const label = profile ? `${candidate.nome} (@${profile.handle} · ${profile.platform})` : candidate.nome;
    if (!profile) {
      discard(label, "o link não é de um perfil de Instagram, TikTok ou YouTube");
      continue;
    }
    if (profile.platform !== candidate.plataforma) {
      discard(label, "a plataforma não bate com o link do perfil");
      continue;
    }
    if (!config.platforms.includes(profile.platform)) {
      discard(label, "plataforma fora da configuração");
      continue;
    }
    if (candidate.handle && normalizeHandle(candidate.handle) !== profile.handle) {
      discard(label, `o @ informado (@${normalizeHandle(candidate.handle)}) não bate com o link do perfil`);
      continue;
    }
    const key = profileKey(profile);
    if (seen.has(key)) {
      discard(label, "repetido nesta rodada");
      continue;
    }
    seen.add(key);

    // 2. Prova: o perfil apareceu na resposta de alguma busca registrada.
    if (options.searchKeys && !options.searchKeys.has(key)) {
      discard(label, "o perfil não apareceu em nenhuma busca registrada (possível invenção)");
      continue;
    }

    // 4. Nicho da configuração (gravado com o nome oficial).
    const niche = nicheByKey.get(normalizeForCompare(candidate.nicho));
    if (!niche) {
      discard(label, `nicho "${candidate.nicho}" fora da configuração`);
      continue;
    }

    // 5. Seguidores dentro da faixa (sem número: aceita, marcado como não confirmado).
    const parsedFollowers = parseFollowers(candidate.seguidores);
    const followers = parsedFollowers !== null && Number.isFinite(parsedFollowers) ? parsedFollowers : null;
    if (followers !== null && (followers < config.followersMin || followers > config.followersMax)) {
      discard(label, `seguidores fora da faixa (${followers.toLocaleString("pt-BR")})`);
      continue;
    }

    // 6. Contato sem a página onde estava publicado é removido.
    if ((candidate.whatsapp || candidate.email) && !/^https?:\/\//i.test(candidate.fonteContato)) {
      report.warnings.push(`${label}: contato removido (sem a página onde estava publicado).`);
    }
    accepted.push({ candidate, profile, niche, followers, label });
  }

  // 3. Já analisado antes, inclusive excluído (rejeitado): nunca volta.
  const handles = [...new Set(accepted.map((item) => item.profile.handle))];
  const known = handles.length
    ? await tx
        .select({ platform: experts.platform, handle: experts.handle, deletedAt: experts.deletedAt })
        .from(experts)
        .where(inArray(sql`lower(${experts.handle})`, handles))
    : [];
  const knownByKey = new Map(known.map((row) => [profileKey(row), row.deletedAt !== null]));
  const fresh = accepted.filter((item) => {
    const wasDeleted = knownByKey.get(profileKey(item.profile));
    if (wasDeleted === undefined) return true;
    discard(item.label, wasDeleted ? "já foi analisado e excluído antes" : "já está no sistema");
    return false;
  });

  // 7. Quantidade máxima da rodada.
  const limit = options.limit ?? config.quantity;
  for (const item of fresh.slice(limit)) discard(item.label, "acima da quantidade da rodada");
  const toSave = fresh.slice(0, limit);

  // 8. Grava pela importação (validação, score, nicho, tag e linha do tempo).
  const today = formatDate(todayInSaoPaulo());
  const rows = toSave.map((item) => toImportRow(item.candidate, item.profile, item.niche, item.followers, today));
  const analysis = await analyzeImport(tx, rows, "instagram");
  for (const error of analysis.errors) discard(toSave[error.line - 2]?.label ?? "(linha)", `dados inválidos (${error.message})`);
  for (const duplicate of [...analysis.duplicatesInDb, ...analysis.duplicatesInFile]) {
    discard(toSave[duplicate.line - 2]?.label ?? `@${duplicate.handle}`, "já está no sistema");
  }
  await importAnalyzedRows(tx, analysis, null, options.userId, {
    activityDescription: "Lead encontrado pela pesquisa IA.",
    source: "research",
  });

  // 9. Relatório: quem foi criado e o id da tag (link da lista filtrada).
  const savedHandles = analysis.ready.map((row) => row.data.handle);
  if (savedHandles.length) {
    const created = await tx
      .select({ id: experts.id, name: experts.name, handle: experts.handle, platform: experts.platform })
      .from(experts)
      .where(and(isNull(experts.deletedAt), inArray(experts.handle, savedHandles)));
    const savedKeys = new Set(analysis.ready.map((row) => profileKey(row.data)));
    report.created = created.filter((row) => savedKeys.has(profileKey(row)));
  }
  const [tag] = await tx.select({ id: tags.id }).from(tags).where(eq(tags.name, RESEARCH_TAG));
  report.tagId = tag?.id ?? null;
  return report;
}
