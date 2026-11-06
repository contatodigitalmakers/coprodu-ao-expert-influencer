import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { templates } from "./catalog";
import { authenticatedCan, id, timestamps } from "./common";
import { channel, enrollmentStatus, taskOutcome, taskStatus } from "./enums";
import { experts } from "./experts";
import { users } from "./users";

// Cadência = sequência de passos (dia, canal, template) que gera tarefas.
export const cadences = pgTable(
  "cadences",
  {
    id: id(),
    name: text("name").notNull(),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  () => [...authenticatedCan("select", "insert", "update", "delete")],
);

export const cadenceSteps = pgTable(
  "cadence_steps",
  {
    id: id(),
    cadenceId: uuid("cadence_id")
      .notNull()
      .references(() => cadences.id, { onDelete: "cascade" }),
    dayOffset: integer("day_offset").notNull(), // D0, D1, D3...
    channel: channel("channel").notNull(),
    // null = passo sem mensagem (ex.: seguir e interagir).
    templateId: uuid("template_id").references(() => templates.id),
    order: integer("order").notNull(),
    ...timestamps,
  },
  (t) => [
    check("cadence_steps_day_offset_positive", sql`${t.dayOffset} >= 0`),
    ...authenticatedCan("select", "insert", "update", "delete"),
  ],
);

export const cadenceEnrollments = pgTable(
  "cadence_enrollments",
  {
    id: id(),
    expertId: uuid("expert_id")
      .notNull()
      .references(() => experts.id),
    cadenceId: uuid("cadence_id")
      .notNull()
      .references(() => cadences.id),
    status: enrollmentStatus("status").notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => [
    // Regra 2: um lead só pode estar em uma cadência ativa por vez.
    uniqueIndex("cadence_enrollments_one_active_per_expert")
      .on(t.expertId)
      .where(sql`${t.status} = 'active'`),
    ...authenticatedCan("select", "insert", "update", "delete"),
  ],
);

// Tarefas do SDR (geradas pela cadência ou avulsas).
export const tasks = pgTable(
  "tasks",
  {
    id: id(),
    expertId: uuid("expert_id")
      .notNull()
      .references(() => experts.id),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // responsável
    enrollmentId: uuid("enrollment_id").references(() => cadenceEnrollments.id),
    stepId: uuid("step_id").references(() => cadenceSteps.id, { onDelete: "set null" }),
    dueDate: date("due_date").notNull(),
    channel: channel("channel").notNull(),
    status: taskStatus("status").notNull().default("pending"),
    outcome: taskOutcome("outcome"),
    ...timestamps,
  },
  (t) => [
    index("tasks_user_id_due_date_idx").on(t.userId, t.dueDate),
    index("tasks_expert_id_idx").on(t.expertId),
    ...authenticatedCan("select", "insert", "update", "delete"),
  ],
);
