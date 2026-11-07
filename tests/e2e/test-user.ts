// Usuário de teste para os testes de tela (Playwright).
// Uso: npx tsx --env-file=.env.local tests/e2e/test-user.ts create|delete
// A senha é aleatória e fica só em tmp/e2e/test-user.json (ignorado pelo Git).
import { randomBytes } from "node:crypto";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import postgres from "postgres";

export const TEST_EMAIL = "teste.automatizado@central-comercial.test";
const CREDENTIALS_FILE = "tmp/e2e/test-user.json";

async function main() {
  const command = process.argv[2];
  const sql = postgres(process.env.DATABASE_URL_MIGRATIONS!, { max: 1, onnotice: () => {} });
  try {
    // Remove o anterior (e o que ele deixou: leads de teste etc. são limpos à parte).
    await sql`delete from auth.users where email = ${TEST_EMAIL}`;
    if (command === "delete") {
      if (existsSync(CREDENTIALS_FILE)) rmSync(CREDENTIALS_FILE);
      console.log("Usuário de teste apagado.");
      return;
    }

    const password = randomBytes(18).toString("base64url");
    const [user] = await sql`
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change,
        email_change_token_current, phone_change, phone_change_token, reauthentication_token
      ) values (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
        ${TEST_EMAIL}, extensions.crypt(${password}, extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}', '{"name":"Teste Automatizado"}', now(), now(),
        '', '', '', '', '', '', '', ''
      ) returning id`;
    await sql`
      insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (${user.id}, ${user.id}, ${sql.json({ sub: user.id, email: TEST_EMAIL, email_verified: true })}, 'email', now(), now(), now())`;
    writeFileSync(CREDENTIALS_FILE, JSON.stringify({ id: user.id, email: TEST_EMAIL, password }, null, 2));
    console.log(`Usuário de teste criado (${TEST_EMAIL}).`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
