import type { JwtPayload } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL não definida. Veja o .env.example.");
}

// Em desenvolvimento o Next recarrega os módulos a cada alteração;
// guardamos a conexão para não abrir uma nova a cada recarga.
const globalForDb = globalThis as unknown as { pgClient?: postgres.Sql };
const client = globalForDb.pgClient ?? postgres(url, { prepare: false }); // o pooler de transação do Supabase exige prepare: false
if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

// Esta conexão entra como dona do banco e IGNORA a RLS.
// Por isso não é exportada: o app só acessa dados via runAsUser().
const db = drizzle({ client, schema });

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Executa as consultas como o usuário logado, para a RLS valer.
// Dentro de uma transação, assume o papel "authenticated" do Supabase e repassa
// os dados do token, o que faz auth.uid() funcionar nas políticas.
export function runAsUser<T>(claims: JwtPayload, fn: (tx: Tx) => Promise<T>) {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`,
    );
    await tx.execute(sql`set local role authenticated`);
    return fn(tx);
  });
}

// Executa como visitante sem login (papel "anon"). Usado só pela página pública
// da proposta, que chama funções do banco feitas para isso (migration 0010).
export function runAsAnon<T>(fn: (tx: Tx) => Promise<T>) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`set local role anon`);
    return fn(tx);
  });
}
