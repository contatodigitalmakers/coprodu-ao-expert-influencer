import type { Platform } from "@/db/schema/enums";

// Normalização dos dados de experts, usada no cadastro e na importação CSV.
// Funções que retornam NaN ou "invalid" indicam valor que não deu para entender.

// Texto sem acentos, minúsculo e sem espaços nas pontas (para comparar nomes).
export function normalizeForCompare(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

// "@Fulana", "fulana " ou "instagram.com/fulana/" → "fulana"
export function normalizeHandle(value: string) {
  let handle = value.trim();
  const looksLikeUrl = /^(https?:\/\/|www\.)/i.test(handle) || /\.[a-z]{2,}\//i.test(handle);
  if (looksLikeUrl) {
    const path = handle.replace(/^[a-z]+:\/\//i, "").split(/[?#]/)[0];
    const segments = path.split("/").filter(Boolean);
    handle = segments.length > 1 ? segments[segments.length - 1] : "";
  }
  return handle.replace(/^@+/, "").replace(/\s+/g, "").toLowerCase();
}

// Só números, com 55 na frente quando faltar o código do país (número
// brasileiro com DDD tem 10 ou 11 dígitos).
export function normalizeWhatsapp(value: string): string | null | "invalid" {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length >= 12 && digits.length <= 15) return digits;
  return "invalid";
}

// Aceita "12500", "12.500", "12,5 mil", "12.5k", "1,2M", "1,2 mi".
export function parseFollowers(value: string): number | null {
  const text = normalizeForCompare(value).replace(/\s+/g, "");
  if (!text) return null;
  const match = text.match(/^([\d.,]+)(k|mil|m|mi|mm|milhao|milhoes)?$/);
  if (!match) return NaN;
  const [, number, unit] = match;
  if (!unit) {
    // Sem unidade, ponto e vírgula são separadores de milhar.
    return Number(number.replace(/[.,]/g, ""));
  }
  const multiplier = unit === "k" || unit === "mil" ? 1_000 : 1_000_000;
  // Com unidade, vírgula ou ponto é a casa decimal.
  return Math.round(Number(number.replace(",", ".")) * multiplier);
}

// "3,5%" ou "3.5" → 3.5
export function parseDecimal(value: string): number | null {
  const text = value.replace(/[%\s]/g, "").replace(",", ".");
  if (!text) return null;
  return Number(text);
}

const YES = new Set(["sim", "s", "yes", "y", "true", "1", "x"]);
const NO = new Set(["nao", "n", "no", "false", "0"]);
const UNKNOWN = new Set(["", "-", "nao_informado", "nao informado"]);

// Respostas sim/não das perguntas de qualificação. null = não informado.
export function parseYesNo(value: string): boolean | null | "invalid" {
  const text = normalizeForCompare(value);
  if (YES.has(text)) return true;
  if (NO.has(text)) return false;
  if (UNKNOWN.has(text)) return null;
  return "invalid";
}

// Link sem "https://" ganha o prefixo.
export function normalizeUrl(value: string) {
  const url = value.trim();
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

// Texto livre de plataforma (planilha) → valor do sistema.
export function parsePlatform(value: string): Platform | null {
  const text = normalizeForCompare(value).replace(/\s+/g, "");
  if (!text) return null;
  if (text.startsWith("insta") || text === "ig") return "instagram";
  if (text.startsWith("you") || text === "yt") return "youtube";
  if (text.startsWith("tik")) return "tiktok";
  return "other";
}

// "vip, quente; parceria" → ["vip", "quente", "parceria"] (sem repetidos)
export function splitTags(value: string) {
  const seen = new Set<string>();
  return value
    .split(/[,;|]/)
    .map((tag) => tag.trim())
    .filter((tag) => {
      const key = normalizeForCompare(tag);
      if (!tag || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}
