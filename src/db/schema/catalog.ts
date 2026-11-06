import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedCan, deletedAt, id, timestamps } from "./common";
import { channel, templateStage } from "./enums";

// Cadastros e configurações usados pelo restante do sistema.

export const niches = pgTable(
  "niches",
  {
    id: id(),
    name: text("name").notNull().unique(),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  () => [...authenticatedCan("select", "insert", "update", "delete")],
);

export const tags = pgTable(
  "tags",
  {
    id: id(),
    name: text("name").notNull().unique(),
    color: text("color").notNull().default("#64748b"),
    ...timestamps,
  },
  () => [...authenticatedCan("select", "insert", "update", "delete")],
);

// Etapas do pipeline (editáveis pelo Admin).
export const stages = pgTable(
  "stages",
  {
    id: id(),
    name: text("name").notNull(),
    order: integer("order").notNull(),
    // Limite de dias parado na etapa antes do alerta; null = sem limite.
    maxDays: integer("max_days"),
    isWon: boolean("is_won").notNull().default(false),
    isLost: boolean("is_lost").notNull().default(false),
    ...timestamps,
  },
  (t) => [
    check("stages_not_won_and_lost", sql`not (${t.isWon} and ${t.isLost})`),
    check("stages_max_days_positive", sql`${t.maxDays} > 0`),
    ...authenticatedCan("select", "insert", "update", "delete"),
  ],
);

export const lossReasons = pgTable(
  "loss_reasons",
  {
    id: id(),
    name: text("name").notNull().unique(),
    ...timestamps,
  },
  () => [...authenticatedCan("select", "insert", "update", "delete")],
);

// Planos de setup e divisão de receita (ex.: Setup 7k → 70% expert / 30% nós).
export const plans = pgTable(
  "plans",
  {
    id: id(),
    name: text("name").notNull(),
    setupValue: numeric("setup_value", { precision: 12, scale: 2, mode: "number" }).notNull(),
    expertShare: integer("expert_share").notNull(), // % da receita para o expert
    ourShare: integer("our_share").notNull(), // % da receita para nós
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    check(
      "plans_shares_sum_100",
      sql`${t.expertShare} between 0 and 100 and ${t.expertShare} + ${t.ourShare} = 100`,
    ),
    check("plans_setup_value_positive", sql`${t.setupValue} >= 0`),
    ...authenticatedCan("select", "insert", "update", "delete"),
  ],
);

// Mensagens e scripts. Sem exclusão definitiva: podem estar ligados a cadências.
export const templates = pgTable(
  "templates",
  {
    id: id(),
    name: text("name").notNull(),
    channel: channel("channel").notNull(),
    stage: templateStage("stage").notNull(), // categoria da mensagem
    body: text("body").notNull(),
    timesUsed: integer("times_used").notNull().default(0),
    timesReplied: integer("times_replied").notNull().default(0),
    deletedAt: deletedAt(),
    ...timestamps,
  },
  () => [...authenticatedCan("select", "insert", "update")],
);

export type ScoreWeights = {
  engagement: number;
  sellsProduct: number;
  recurringProblem: number;
  hasMethod: number;
  contentFrequency: number;
};

// Configurações gerais do sistema. Tabela de linha única.
export const settings = pgTable(
  "settings",
  {
    id: id(),
    scoreWeights: jsonb("score_weights").$type<ScoreWeights>().notNull(),
    // Etapa para onde o lead vai quando a proposta é aceita (Negociação ou Ganho).
    acceptedProposalStageId: uuid("accepted_proposal_stage_id")
      .notNull()
      .references(() => stages.id),
    // Dias até o lead sem resposta voltar para a fila de reativação.
    reactivationDays: integer("reactivation_days").notNull().default(60),
    ...timestamps,
  },
  () => [
    uniqueIndex("settings_single_row").on(sql`(true)`),
    ...authenticatedCan("select", "update"),
  ],
);
