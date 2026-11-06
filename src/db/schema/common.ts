import { sql } from "drizzle-orm";
import { pgPolicy, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

// Colunas presentes em todas as tabelas (seção 5 do escopo).
export const id = () => uuid("id").primaryKey().defaultRandom();

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// Exclusão lógica (soft delete): preenchido = excluído.
export const deletedAt = () => timestamp("deleted_at", { withTimezone: true });

type Operation = "select" | "insert" | "update" | "delete";

// Políticas de RLS. Por enquanto só os sócios usam o sistema (ver CLAUDE.md):
// qualquer usuário logado pode fazer as operações listadas. Operação fora da
// lista fica bloqueada no banco (ex.: sem "delete" em experts, o que força
// o soft delete).
export function authenticatedCan(...operations: Operation[]) {
  return operations.map((operation) =>
    pgPolicy(`authenticated_can_${operation}`, {
      for: operation,
      to: authenticatedRole,
      using: operation === "insert" ? undefined : sql`true`,
      withCheck: operation === "insert" || operation === "update" ? sql`true` : undefined,
    }),
  );
}
