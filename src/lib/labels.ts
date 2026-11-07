import type {
  ActivityType,
  Channel,
  EnrollmentStatus,
  MeetingStatus,
  Platform,
  ProposalStatus,
  TaskOutcome,
  TemplateStage,
} from "@/db/schema/enums";

// Textos em português dos valores fixos do banco (enums).

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

export const CHANNEL_LABELS: Record<Channel, string> = {
  interaction: "Seguir e interagir",
  dm: "DM Instagram",
  whatsapp: "WhatsApp",
  email: "E-mail",
  call: "Ligação",
};

export const CHANNEL_OPTIONS = Object.entries(CHANNEL_LABELS).map(([value, label]) => ({ value, label }));

// Categorias de template (coluna templates.stage).
export const TEMPLATE_STAGE_LABELS: Record<TemplateStage, string> = {
  approach: "Abordagem",
  follow_up: "Follow-up",
  objection_handling: "Quebra de objeção",
  diagnosis_invite: "Convite para diagnóstico",
  breakup: "Encerramento",
  script: "Script / roteiro",
};

export const TEMPLATE_STAGE_OPTIONS = Object.entries(TEMPLATE_STAGE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

// Resultado de cada passo da cadência (seção 3.4).
export const TASK_OUTCOME_LABELS: Record<TaskOutcome, string> = {
  sent: "Enviado",
  replied: "Respondeu",
  no_response: "Sem resposta",
  invalid_number: "Número inválido",
};

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  active: "Ativa",
  paused: "Pausada (lead respondeu)",
  finished: "Encerrada",
};

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  scheduled: "Agendada",
  done: "Realizada",
  canceled: "Cancelada",
  no_show: "Não compareceu",
};

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: "Rascunho",
  sent: "Enviada",
  viewed: "Visualizada",
  accepted: "Aceita",
  rejected: "Recusada",
};
