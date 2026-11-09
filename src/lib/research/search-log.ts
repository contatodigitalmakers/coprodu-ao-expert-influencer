import { existsSync, readFileSync } from "node:fs";
import { profileFromUrl, profileKey } from "./profile-url";

// Registro das buscas (tmp/pesquisa/buscas.jsonl), gravado pelo hook
// .claude/hooks/registrar-busca.mjs a cada WebSearch/WebFetch.
// Serve de prova: um perfil só é aceito se o link dele apareceu na RESPOSTA de
// alguma busca recente (o texto da busca em si não conta, para a IA não
// conseguir "provar" um @ que ela mesma escreveu).

export const SEARCH_LOG_PATH = "tmp/pesquisa/buscas.jsonl";

const URL_PATTERN = /https?:\/\/[^\s"'\\)<>\]]+/g;

// Perfis ("plataforma:@") encontrados nas respostas registradas desde "since".
export function profileKeysFromLog(content: string, since: Date) {
  const keys = new Set<string>();
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    let entry: { data?: string; resposta?: unknown };
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.data && new Date(entry.data) < since) continue;
    const text = typeof entry.resposta === "string" ? entry.resposta : JSON.stringify(entry.resposta ?? "");
    for (const match of text.matchAll(URL_PATTERN)) {
      const profile = profileFromUrl(match[0]);
      if (profile) keys.add(profileKey(profile));
    }
  }
  return keys;
}

// null = não há registro (o hook não está ativo): a prova não é conferida.
export function readSearchLog(path = SEARCH_LOG_PATH, since = new Date(Date.now() - 24 * 60 * 60 * 1000)) {
  if (!existsSync(path)) return null;
  return profileKeysFromLog(readFileSync(path, "utf8"), since);
}
