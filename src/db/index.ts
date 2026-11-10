import type { JwtPayload } from "@supabase/supabase-js";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Esta conexão entra como dona do banco e IGNORA a RLS.
// Por isso não é exportada: o app só acessa dados via runAsUser().

const createDb = (client: postgres.Sql) => drizzle({ client, schema });
type Db = ReturnType<typeof createDb>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida. Veja o .env.example.");
  return url;
}

// O pooler de transação do Supabase exige prepare: false.
const options = { prepare: false, onnotice: () => {} } as const;

// Na Cloudflare (Workers), uma conexão não pode ser reaproveitada entre
// requisições: cada transação abre a sua e a fecha no fim.
// No Node (next dev/start, scripts e testes), a conexão é compartilhada; em
// desenvolvimento ela fica no globalThis para não abrir uma nova a cada recarga.
const isWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
const globalForDb = globalThis as unknown as { pgClient?: postgres.Sql };

async function withDb<T>(fn: (db: Db) => Promise<T>) {
  if (isWorkers) {
    const client = postgres(databaseUrl(), { ...options, max: 1 });
    try {
      return await fn(createDb(client));
    } finally {
      await client.end({ timeout: 5 });
    }
  }
  globalForDb.pgClient ??= postgres(databaseUrl(), options);
  return fn(createDb(globalForDb.pgClient));
}

// Executa as consultas como o usuário logado, para a RLS valer.
// Dentro de uma transação, assume o papel "authenticated" do Supabase e repassa
// os dados do token, o que faz auth.uid() funcionar nas políticas.
export function runAsUser<T>(claims: JwtPayload, fn: (tx: Tx) => Promise<T>) {
  return withDb((db) =>
    db.transaction(async (tx) => {
      await tx.execute(
        sql`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`,
      );
      await tx.execute(sql`set local role authenticated`);
      return fn(tx);
    }),
  );
}

// Executa como visitante sem login (papel "anon"). Usado só pela página pública
// da proposta, que chama funções do banco feitas para isso (migration 0010).
export function runAsAnon<T>(fn: (tx: Tx) => Promise<T>) {
  return withDb((db) =>
    db.transaction(async (tx) => {
      await tx.execute(sql`set local role anon`);
      return fn(tx);
    }),
  );
}
