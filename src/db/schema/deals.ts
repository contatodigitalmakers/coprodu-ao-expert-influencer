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
import { authenticatedCan, id, timestamps } from "./common";
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
    diagnosis: jsonb("diagnosis").$type<Record<string, unknown>>(), // formulário de diagnóstico
    ...timestamps,
  },
  (t) => [
    index("meetings_expert_id_idx").on(t.expertId),
    ...authenticatedCan("select", "insert", "update", "delete"),
  ],
);

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
