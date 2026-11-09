// Partes comuns dos scripts do /pesquisa.
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { runAsUser } from "@/db";
import { users } from "@/db/schema";
import { parseResearchConfig } from "@/lib/research/config";

export const CONFIG_PATH = "pesquisa/config.md";

export function loadConfig() {
  return parseResearchConfig(readFileSync(CONFIG_PATH, "utf8"));
}

// Usuário em nome de quem a pesquisa grava (PESQUISA_USER_EMAIL no .env.local).
export async function researchUserClaims() {
  const email = process.env.PESQUISA_USER_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("Defina PESQUISA_USER_EMAIL no .env.local (o e-mail do seu login).");
  const anyone = { sub: "00000000-0000-0000-0000-000000000000", role: "authenticated" } as never;
  const [user] = await runAsUser(anyone, (tx) => tx.select({ id: users.id }).from(users).where(eq(users.email, email)));
  if (!user) throw new Error(`Nenhum login com o e-mail ${email}.`);
  return { userId: user.id, claims: { sub: user.id, role: "authenticated" } as never };
}

export function fail(error: unknown) {
  console.error(`Erro: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
