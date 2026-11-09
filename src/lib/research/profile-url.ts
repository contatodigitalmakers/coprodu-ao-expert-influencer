import type { Platform } from "@/db/schema/enums";

// Reconhece o link de PERFIL de Instagram, TikTok ou YouTube e tira o @ dele.
// Links de post, vídeo ou busca não contam como perfil.

export type ProfileRef = { platform: Platform; handle: string; url: string };

// Primeiros trechos de caminho do Instagram que não são perfis.
const INSTAGRAM_RESERVED = new Set([
  "p", "reel", "reels", "explore", "stories", "tv", "accounts", "about", "developer",
  "legal", "direct", "web", "popular", "topics",
]);

export function profileFromUrl(raw: string): ProfileRef | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");
  const parts = url.pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));

  if (host === "instagram.com") {
    const first = parts[0]?.replace(/^@/, "").toLowerCase();
    if (!first || INSTAGRAM_RESERVED.has(first) || !/^[a-z0-9._]{1,30}$/.test(first)) return null;
    return { platform: "instagram", handle: first, url: `https://www.instagram.com/${first}/` };
  }

  if (host === "tiktok.com") {
    const segment = parts.find((part) => part.startsWith("@"));
    const handle = segment?.slice(1).toLowerCase();
    if (!handle || !/^[a-z0-9._]{2,24}$/.test(handle)) return null;
    return { platform: "tiktok", handle, url: `https://www.tiktok.com/@${handle}` };
  }

  if (host === "youtube.com") {
    const [first, second] = parts;
    if (first?.startsWith("@") && first.length > 1) {
      const handle = first.slice(1).toLowerCase();
      return { platform: "youtube", handle, url: `https://www.youtube.com/@${handle}` };
    }
    if ((first === "c" || first === "user" || first === "channel") && second) {
      return { platform: "youtube", handle: second.toLowerCase(), url: `https://www.youtube.com/${first}/${second}` };
    }
  }
  return null;
}

export const profileKey = (profile: Pick<ProfileRef, "platform" | "handle">) =>
  `${profile.platform}:${profile.handle.toLowerCase()}`;
