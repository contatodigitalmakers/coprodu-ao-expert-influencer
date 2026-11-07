import type { ActivityType, Platform } from "@/db/schema/enums";

// Textos em português dos valores fixos do banco.

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  other: "Outra",
};

export const PLATFORM_OPTIONS = Object.entries(PLATFORM_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  note: "Nota",
  stage_change: "Mudança de etapa",
  interaction: "Interação",
  call: "Ligação",
  dm: "DM",
  whatsapp: "WhatsApp",
  email: "E-mail",
  meeting: "Reunião",
  proposal: "Proposta",
};

// Tipos que o usuário registra manualmente na ficha do expert.
export const MANUAL_ACTIVITY_TYPES = ["note", "interaction", "call", "dm", "whatsapp", "email"] as const;
