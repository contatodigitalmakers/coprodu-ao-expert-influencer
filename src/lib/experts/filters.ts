import type { ScoreTier } from "@/db/schema/enums";
import { isUuid } from "./normalize";

// Filtros da lista de experts. Ficam na URL (nomes em português, pois
// aparecem para o usuário), então dá para salvar ou compartilhar uma busca.

export const FILTER_PARAMS = {
  search: "busca",
  nicheId: "nicho",
  stageId: "etapa",
  owner: "responsavel",
  tagId: "tag",
  tier: "score",
  followers: "seguidores",
  page: "pagina",
} as const;

export const OWNER_ME = "meus";
export const OWNER_NONE = "sem";

export const FOLLOWER_RANGES = {
  "ate-10k": { label: "Até 10 mil", min: 0, max: 10_000 },
  "10k-50k": { label: "10 mil a 50 mil", min: 10_000, max: 50_000 },
  "50k-100k": { label: "50 mil a 100 mil", min: 50_000, max: 100_000 },
  "100k-500k": { label: "100 mil a 500 mil", min: 100_000, max: 500_000 },
  "500k-1m": { label: "500 mil a 1 milhão", min: 500_000, max: 1_000_000 },
  "1m-mais": { label: "Mais de 1 milhão", min: 1_000_000, max: null },
} as const;

export type FollowerRange = keyof typeof FOLLOWER_RANGES;

export type ExpertFilters = {
  search: string | null;
  nicheId: string | null;
  stageId: string | null;
  owner: string | null; // OWNER_ME, OWNER_NONE ou id de usuário
  tagId: string | null;
  tier: ScoreTier | null;
  followers: FollowerRange | null;
  page: number;
};

type SearchParams = Record<string, string | string[] | undefined>;

// Lê os filtros da URL, ignorando valores inválidos.
export function parseFilters(params: SearchParams): ExpertFilters {
  const get = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() || null;
  };
  const uuidOrNull = (key: string) => {
    const value = get(key);
    return isUuid(value) ? value : null;
  };

  const owner = get(FILTER_PARAMS.owner);
  const tier = get(FILTER_PARAMS.tier);
  const followers = get(FILTER_PARAMS.followers);
  const page = Number(get(FILTER_PARAMS.page));

  return {
    search: get(FILTER_PARAMS.search)?.slice(0, 100) ?? null,
    nicheId: uuidOrNull(FILTER_PARAMS.nicheId),
    stageId: uuidOrNull(FILTER_PARAMS.stageId),
    owner: owner === OWNER_ME || owner === OWNER_NONE || isUuid(owner) ? owner : null,
    tagId: uuidOrNull(FILTER_PARAMS.tagId),
    tier: tier === "A" || tier === "B" || tier === "C" ? tier : null,
    followers: followers && followers in FOLLOWER_RANGES ? (followers as FollowerRange) : null,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function hasActiveFilters(filters: ExpertFilters) {
  return Object.entries(filters).some(([key, value]) => key !== "page" && value !== null);
}
