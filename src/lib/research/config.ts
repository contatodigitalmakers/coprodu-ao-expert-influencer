import type { Platform } from "@/db/schema/enums";

// Configuração da pesquisa (pesquisa/config.md), lida pelo /pesquisa e pelos scripts.
// O arquivo é Markdown para ser fácil de editar; só estas partes têm formato fixo:
//   ## Parâmetros   → linhas "- chave: valor"
//   ## Nichos       → um "### Nome do nicho" por nicho, com "- palavras-chave: a, b, c"

export type ResearchConfig = {
  followersMin: number;
  followersMax: number;
  quantity: number;
  platforms: Platform[];
  niches: { name: string; keywords: string[] }[];
};

const PLATFORMS: Platform[] = ["instagram", "youtube", "tiktok"];

export function parseResearchConfig(markdown: string): ResearchConfig {
  const params = new Map<string, string>();
  const niches: ResearchConfig["niches"] = [];
  let section = "";

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("## ")) {
      section = line.slice(3).trim().toLowerCase();
      continue;
    }
    if (section.startsWith("parâmetros") || section.startsWith("parametros")) {
      const match = line.match(/^-\s*([a-z_]+)\s*:\s*(.+)$/i);
      if (match) params.set(match[1].toLowerCase(), match[2].trim());
    } else if (section.startsWith("nichos")) {
      if (line.startsWith("### ")) niches.push({ name: line.slice(4).trim(), keywords: [] });
      const keywords = line.match(/^-\s*palavras-chave\s*:\s*(.+)$/i);
      if (keywords && niches.length) {
        niches[niches.length - 1].keywords = keywords[1].split(",").map((word) => word.trim()).filter(Boolean);
      }
    }
  }

  const number = (key: string, fallback: number) => {
    const value = Number((params.get(key) ?? "").replace(/[.\s]/g, ""));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  };
  const platforms = (params.get("plataformas") ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is Platform => (PLATFORMS as string[]).includes(value));

  if (!niches.length) throw new Error("pesquisa/config.md: nenhum nicho em \"## Nichos\".");
  return {
    followersMin: number("seguidores_min", 10_000),
    followersMax: number("seguidores_max", 500_000),
    quantity: number("quantidade_por_rodada", 10),
    platforms: platforms.length ? platforms : PLATFORMS,
    niches,
  };
}
