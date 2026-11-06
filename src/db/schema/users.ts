import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUsers } from "drizzle-orm/supabase";

export const userRole = pgEnum("user_role", ["admin", "sdr", "closer"]);

// Uma linha por login do Supabase Auth (mesmo id). A linha é criada por um
// trigger no banco quando o login é criado (ver migration create_user_on_signup).
export const users = pgTable(
  "users",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: userRole("role").notNull(),
    active: boolean("active").notNull().default(true),
    dailyGoal: integer("daily_goal"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  () => [
    // Por enquanto só os sócios usam o sistema: qualquer usuário logado lê.
    // Inserção só pelo trigger; alteração e exclusão ainda não liberadas.
    pgPolicy("users_select_authenticated", {
      for: "select",
      to: authenticatedRole,
      using: sql`true`,
    }),
  ],
);

export type User = typeof users.$inferSelect;
