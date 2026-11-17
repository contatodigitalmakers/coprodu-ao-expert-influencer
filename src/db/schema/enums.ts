import { pgEnum } from "drizzle-orm/pg-core";

// Valores fixos usados nas tabelas. Os textos em português para a interface
// ficam no código das telas; aqui os valores são em inglês.

export const userRole = pgEnum("user_role", ["admin", "sdr", "closer"]);

export const platform = pgEnum("platform", ["instagram", "youtube", "tiktok", "other"]);

export const scoreTier = pgEnum("score_tier", ["A", "B", "C"]);

// Canais de contato. "interaction" = seguir e interagir (D0 da cadência).
export const channel = pgEnum("channel", ["interaction", "dm", "whatsapp", "email", "call"]);

export const activityType = pgEnum("activity_type", [
  "note",
  "stage_change",
  "interaction",
  "call",
  "dm",
  "whatsapp",
  "email",
  "meeting",
  "proposal",
]);

// Categoria da mensagem (seção 3.6), não a etapa do pipeline.
// "script" = script de ligação ou roteiro da reunião de diagnóstico.
export const templateStage = pgEnum("template_stage", [
  "approach",
  "follow_up",
  "objection_handling",
  "diagnosis_invite",
  "breakup",
  "script",
]);

export const enrollmentStatus = pgEnum("enrollment_status", ["active", "paused", "finished"]);

export const taskStatus = pgEnum("task_status", ["pending", "done", "skipped"]);

export const taskOutcome = pgEnum("task_outcome", [
  "sent",
  "replied",
  "no_response",
  "invalid_number",
]);

export const meetingStatus = pgEnum("meeting_status", ["scheduled", "done", "canceled", "no_show"]);

export const proposalStatus = pgEnum("proposal_status", [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "rejected",
]);

// Por enquanto só o status inicial; as etapas de entrega vêm na Fase 3.
export const projectStatus = pgEnum("project_status", ["awaiting_kickoff"]);

// Central Financeira: status do app em coprodução (os da planilha de controle).
export const appStatus = pgEnum("app_status", [
  "prospecting",
  "negotiating",
  "contract_signed",
  "in_development",
  "beta",
  "launching",
  "operating",
  "paused",
  "closed",
]);

// Central Financeira: categorias de custo. O grupo (do app, da empresa ou
// imposto) fica em src/lib/finance/labels.ts. paid_traffic, ai_app e
// ai_development entram nos cálculos de CPA, ROAS e gasto com IA.
export const costCategory = pgEnum("cost_category", [
  "paid_traffic",
  "ai_app",
  "infrastructure",
  "sales_tools",
  "app_freelancers",
  "app_other",
  "ai_development",
  "software",
  "people",
  "services",
  "taxes",
  "company_other",
]);

export type Platform = (typeof platform.enumValues)[number];
export type ScoreTier = (typeof scoreTier.enumValues)[number];
export type ActivityType = (typeof activityType.enumValues)[number];
export type Channel = (typeof channel.enumValues)[number];
export type TemplateStage = (typeof templateStage.enumValues)[number];
export type TaskOutcome = (typeof taskOutcome.enumValues)[number];
export type EnrollmentStatus = (typeof enrollmentStatus.enumValues)[number];
export type MeetingStatus = (typeof meetingStatus.enumValues)[number];
export type ProposalStatus = (typeof proposalStatus.enumValues)[number];
export type AppStatus = (typeof appStatus.enumValues)[number];
export type CostCategory = (typeof costCategory.enumValues)[number];
