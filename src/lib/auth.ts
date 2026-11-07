import type { JwtPayload } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { runAsUser, type Tx } from "@/db";
import { users, type User } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

// Lê e valida o token da sessão. Sem sessão válida, manda para o login.
// O cache() evita repetir a validação várias vezes na mesma requisição.
const getClaims = cache(async (): Promise<JwtPayload> => {
  // Sessão é sempre calculada na hora (a validação do token usa o relógio).
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  return data.claims;
});

// Executa consultas no banco como o usuário logado (com RLS).
// Use em toda leitura e gravação de dados nas páginas e Server Actions.
export async function queryAsUser<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const claims = await getClaims();
  return runAsUser(claims, fn);
}

// Para páginas e ações restritas ao Admin.
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (user.role !== "admin") throw new Error("Acesso restrito ao Admin.");
  return user;
}

// Usuário logado, com os dados da tabela users.
export const getCurrentUser = cache(async (): Promise<User> => {
  const claims = await getClaims();
  const [user] = await runAsUser(claims, (tx) =>
    tx.select().from(users).where(eq(users.id, claims.sub)),
  );
  if (!user) {
    throw new Error("Este login não tem cadastro na tabela users.");
  }
  return user;
});
