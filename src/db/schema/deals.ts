import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { plans } from "./catalog";
import { authenticatedCan, deletedAt, id, timestamps } from "./common";
import { meetingStatus, projectStatus, proposalStatus } from "./enums";
import { experts } from "./experts";
import { users } from "./users";

// Fechamento: reuniões de diagnóstico, propostas e projetos ganhos.

export const meetings = pgTable(
  "meetings",
  {
    id: id(),
    expertId: uuid("expert_id")
      .notNull()
      .references(() => experts.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id), // responsável (Closer)
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    link: text("link"),
    status: meetingStatus("status").notNull().default("scheduled"),
    diagnosis: jsonb("diagnosis").$type<DiagnosisForm>(), // formulário de diagnóstico
    ...timestamps,
  },
  (t) => [
    index("meetings_expert_id_idx").on(t.expertId),
    ...authenticatedCan("select", "insert", "update", "delete"),
  ],
);

// Formulário de diagnóstico preenchido na reunião (seção 3.7).
export type DiagnosisForm = {
  audience?: string;
  currentProducts?: string;
  approxRevenue?: string;
  appIdea?: string;
  planInterestId?: string | null;
  objections?: string;
};

export type ProposalExtra = {
  name: string;
  value: number;
};

export const proposals = pgTable(
  "proposals",
  {
    id: id(),
    expertId: uuid("expert_id")
      .notNull()
      .references(() => experts.id),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id),
    // Valores copiados do plano: ficam congelados na proposta (regra 8).
    setupValue: numeric("setup_value", { precision: 12, scale: 2, mode: "number" }).notNull(),
    expertShare: integer("expert_share").notNull(),
    ourShare: integer("our_share").notNull(),
    extras: jsonb("extras").$type<ProposalExtra[]>().notNull().default([]), // serviços extras
    total: numeric("total", { precision: 12, scale: 2, mode: "number" }).notNull(),
    status: proposalStatus("status").notNull().default("draft"),
    publicToken: uuid("public_token").notNull().unique().defaultRandom(), // link público
    sentAt: timestamp("sent_at", { withTimezone: true }),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check(
      "proposals_shares_sum_100",
      sql`${t.expertShare} between 0 and 100 and ${t.expertShare} + ${t.ourShare} = 100`,
    ),
    index("proposals_expert_id_idx").on(t.expertId),
    // Sem "delete": proposta é histórico da negociação.
    ...authenticatedCan("select", "insert", "update"),
  ],
);

// Criado ao marcar o lead como Ganho (regra 5); base do futuro módulo de entrega.
export const projects = pgTable(
  "projects",
  {
    id: id(),
    expertId: uuid("expert_id")
      .notNull()
      .references(() => experts.id),
    proposalId: uuid("proposal_id")
      .notNull()
      .unique()
      .references(() => proposals.id),
    status: projectStatus("status").notNull().default("awaiting_kickoff"),
    setupPaidAt: date("setup_paid_at").notNull(),
    contractSignedAt: date("contract_signed_at").notNull(),
    ...timestamps,
  },
  () => [...authenticatedCan("select", "insert", "update")],
);

// Apresentação personalizada para a call de diagnóstico (slides em
// public/apresentacao). O lead recebe o link curto /a/<code>.
export const presentations = pgTable(
  "presentations",
  {
    id: id(),
    expertId: uuid("expert_id")
      .notNull()
      .references(() => experts.id),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // quem criou
    code: text("code").notNull().unique(), // código do link curto
    // Campos do gerador (chave → texto), congelados ao salvar: dados do cliente,
    // planos (plano1_voce, plano1_caucao...) e slides ocultos (ocultar).
    data: jsonb("data").$type<Record<string, string>>().notNull().default({}),
    views: integer("views").notNull().default(0), // aberturas do link
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }),
    deletedAt: deletedAt(), // excluída = link desativado
    ...timestamps,
  },
  (t) => [
    check("presentations_code_format", sql`${t.code} ~ '^[a-z0-9]{6,12}$'`),
    index("presentations_expert_id_idx").on(t.expertId),
    // Sem "delete": exclusão lógica, para o histórico do lead.
    ...authenticatedCan("select", "insert", "update"),
  ],
);
