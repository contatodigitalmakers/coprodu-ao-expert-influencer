import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { lossReasons, niches, stages, tags } from "./catalog";
import { authenticatedCan, deletedAt, id, timestamps } from "./common";
import { activityType, platform, scoreTier } from "./enums";
import { users } from "./users";

// Experts (leads) prospectados.
export const experts = pgTable(
  "experts",
  {
    id: id(),
    name: text("name").notNull(),
    handle: text("handle").notNull(), // @ principal
    platform: platform("platform").notNull(),
    profileUrl: text("profile_url"),
    nicheId: uuid("niche_id").references(() => niches.id),
    followers: integer("followers"),
    engagementRate: numeric("engagement_rate", { precision: 5, scale: 2, mode: "number" }), // em %
    whatsapp: text("whatsapp"),
    email: text("email"),
    city: text("city"),
    source: text("source"), // origem do lead
    // Responsável. Sem responsável = fila "Não atribuídos" (regra 1).
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => stages.id),
    stageEnteredAt: timestamp("stage_entered_at", { withTimezone: true }).notNull().defaultNow(),
    // Score de qualificação (null = ainda não calculado).
    score: integer("score"),
    scoreTier: scoreTier("score_tier"),
    // Qualificação (null = ainda não informado).
    sellsProduct: boolean("sells_product"),
    productDescription: text("product_description"),
    hasMethod: boolean("has_method"),
    recurringProblem: boolean("recurring_problem"),
    contentFrequency: boolean("content_frequency"),
    notes: text("notes"),
    // Motivo da perda, preenchido ao mover para "Perdido" (regra 3).
    lossReasonId: uuid("loss_reason_id").references(() => lossReasons.id),
    lossNote: text("loss_note"), // detalhe quando o motivo é "Outro"
    deletedAt: deletedAt(),
    ...timestamps,
  },
  (t) => [
    // Bloqueio de duplicidade: mesmo @ na mesma plataforma, sem diferenciar
    // maiúsculas. Leads excluídos não contam.
    uniqueIndex("experts_platform_handle_unique")
      .on(t.platform, sql`lower(${t.handle})`)
      .where(sql`${t.deletedAt} is null`),
    index("experts_stage_id_idx").on(t.stageId),
    index("experts_owner_id_idx").on(t.ownerId),
    check("experts_score_range", sql`${t.score} between 0 and 100`),
    check("experts_followers_positive", sql`${t.followers} >= 0`),
    // Sem "delete": exclusão de lead é só lógica (regra 9).
    ...authenticatedCan("select", "insert", "update"),
  ],
);

export const expertTags = pgTable(
  "expert_tags",
  {
    id: id(),
    expertId: uuid("expert_id")
      .notNull()
      .references(() => experts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [
    unique("expert_tags_expert_tag_unique").on(t.expertId, t.tagId),
    ...authenticatedCan("select", "insert", "update", "delete"),
  ],
);

// Linha do tempo do expert: interações, mudanças de etapa, propostas etc.
export const activities = pgTable(
  "activities",
  {
    id: id(),
    expertId: uuid("expert_id")
      .notNull()
      .references(() => experts.id),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    type: activityType("type").notNull(),
    description: text("description"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
    // Horário real de cada registro (now() se repete dentro da mesma transação,
    // o que embaralharia a ordem da linha do tempo).
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (t) => [
    index("activities_expert_id_created_at_idx").on(t.expertId, t.createdAt),
    // Histórico: só leitura e inclusão, nunca alteração ou exclusão.
    ...authenticatedCan("select", "insert"),
  ],
);
