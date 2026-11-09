import { z } from "zod";
import type { ImportRow } from "@/lib/experts/import-fields";
import { formatFollowers } from "@/lib/format";
import type { ProfileRef } from "./profile-url";

// Um candidato encontrado pelo /pesquisa (arquivo tmp/pesquisa/<rodada>.json).
// Os nomes dos campos estão em português porque o arquivo é escrito pela IA
// seguindo o roteiro em .claude/skills/pesquisa/SKILL.md.

export const RESEARCH_TAG = "pesquisa-ia";
export const RESEARCH_SOURCE = "Pesquisa IA";

const text = (max: number) => z.string().trim().max(max).default("");
const answer = z
  .enum(["sim", "nao", "não", ""])
  .default("")
  .transform((value) => (value === "não" ? "nao" : value));

export const candidateSchema = z.object({
  nome: z.string().trim().min(1, "sem nome").max(200),
  handle: text(100),
  plataforma: z.enum(["instagram", "youtube", "tiktok"], "plataforma inválida"),
  profileUrl: z.string().trim().min(1, "sem link do perfil"),
  nicho: z.string().trim().min(1, "sem nicho"),
  seguidores: z.union([z.string(), z.number()]).default("").transform((value) => String(value).trim()),
  cidade: text(100),
  whatsapp: text(40),
  email: text(200),
  fonteContato: text(500),
  vendeProduto: answer,
  produto: text(300),
  fonteProduto: text(500),
  temMetodo: answer,
  problemaRecorrente: answer,
  frequenciaConteudo: answer,
  resumo: text(1200),
  mensagemSugerida: text(1200),
  provas: z
    .array(z.object({ url: z.string().trim(), trecho: text(400) }))
    .default([]),
});

export type Candidate = z.infer<typeof candidateSchema>;

export const roundFileSchema = z.object({
  rodada: z.string().default(""),
  candidatos: z.array(z.unknown()),
});

const isHttpUrl = (value: string) => /^https?:\/\/\S+$/i.test(value);

// Observações do lead: o perfil montado pela IA, com fontes e data.
export function researchNotes(candidate: Candidate, followers: number | null, today: string) {
  const lines = [`[${RESEARCH_SOURCE} · ${today} · a revisar]`];
  if (candidate.resumo) lines.push(`Resumo: ${candidate.resumo}`);
  lines.push(
    followers === null
      ? "Seguidores: não confirmados"
      : `Seguidores: ~${formatFollowers(followers).replace(/ /g, " ")} (buscador, ${today})`,
  );
  if (candidate.produto) {
    lines.push(`Produto: ${candidate.produto}${isHttpUrl(candidate.fonteProduto) ? ` (fonte: ${candidate.fonteProduto})` : ""}`);
  }
  const proofs = candidate.provas.filter((proof) => isHttpUrl(proof.url));
  if (proofs.length) {
    lines.push("Provas:");
    for (const proof of proofs) lines.push(`- ${proof.url}${proof.trecho ? ` — "${proof.trecho}"` : ""}`);
  }
  if (candidate.mensagemSugerida) lines.push("Mensagem sugerida:", candidate.mensagemSugerida);
  return lines.join("\n").slice(0, 5000);
}

// Converte para a linha da importação (reaproveita validação, score e gravação).
export function toImportRow(
  candidate: Candidate,
  profile: ProfileRef,
  niche: string,
  followers: number | null,
  today: string,
): ImportRow {
  // Contato só entra com a página onde ele estava publicado.
  const hasContactSource = isHttpUrl(candidate.fonteContato);
  return {
    name: candidate.nome,
    handle: profile.handle,
    platform: profile.platform,
    profileUrl: profile.url,
    niche,
    followers: followers === null ? "" : String(followers),
    engagementRate: "",
    whatsapp: hasContactSource ? candidate.whatsapp : "",
    email: hasContactSource ? candidate.email : "",
    city: candidate.cidade,
    source: RESEARCH_SOURCE,
    tags: RESEARCH_TAG,
    notes: researchNotes(candidate, followers, today),
    sellsProduct: candidate.vendeProduto,
    productDescription: candidate.produto,
    hasMethod: candidate.temMetodo,
    recurringProblem: candidate.problemaRecorrente,
    contentFrequency: candidate.frequenciaConteudo,
  };
}
