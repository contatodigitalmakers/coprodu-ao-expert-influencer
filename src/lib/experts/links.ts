import type { Platform } from "@/db/schema/enums";

// Link do perfil: o cadastrado ou, se vazio, montado a partir do @.
export function profileLink(platform: Platform, handle: string, profileUrl: string | null) {
  if (profileUrl) return profileUrl;
  switch (platform) {
    case "instagram":
      return `https://instagram.com/${handle}`;
    case "tiktok":
      return `https://www.tiktok.com/@${handle}`;
    case "youtube":
      return `https://www.youtube.com/@${handle}`;
    default:
      return null;
  }
}

export function whatsappLink(whatsapp: string) {
  return `https://wa.me/${whatsapp}`;
}
