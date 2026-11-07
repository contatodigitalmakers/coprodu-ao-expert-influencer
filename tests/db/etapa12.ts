// Auditoria de segurança do banco (Etapa 12): RLS, políticas, funções e API pública.
// Uso: npx tsx --env-file=.env.local tests/db/etapa12.ts
import postgres from "postgres";

const PUBLIC_FUNCTIONS = ["get_public_proposal", "respond_to_proposal"]; // as únicas abertas ao anon
const NO_DELETE = ["activities", "experts", "projects", "proposals", "settings", "templates", "users"];

async function main() {
  const results: { name: string; pass: boolean; detail: string }[] = [];
  const check = (name: string, pass: boolean, detail = "") => results.push({ name, pass, detail });
  const sql = postgres(process.env.DATABASE_URL_MIGRATIONS!, { max: 1, onnotice: () => {} });

  try {
    const tables = await sql`select relname as name, relrowsecurity as rls from pg_class
                             where relnamespace = 'public'::regnamespace and relkind = 'r' order by 1`;
    const withoutRls = tables.filter((table) => !table.rls).map((table) => table.name);
    check(`RLS ligada nas ${tables.length} tabelas`, withoutRls.length === 0, withoutRls.join(", "));

    const policies = await sql`select tablename, policyname, cmd, roles::text[] as roles from pg_policies where schemaname = 'public'`;
    const openToAnon = policies.filter((policy) => policy.roles.some((role: string) => role === "anon" || role === "public"));
    check("Nenhuma política libera anon/public", openToAnon.length === 0, JSON.stringify(openToAnon));
    const deletable = new Set(policies.filter((policy) => policy.cmd === "DELETE" || policy.cmd === "ALL").map((policy) => policy.tablename));
    const leaking = NO_DELETE.filter((table) => deletable.has(table));
    check("Sem exclusão definitiva em histórico (experts, propostas, atividades...)", leaking.length === 0, leaking.join(", "));
    const [{ count }] = await sql`select count(*)::int as count from pg_policies where schemaname = 'public'`;
    check("Políticas cadastradas", count > 0, `${count}`);

    const functions = await sql`
      select p.proname as name, p.prosecdef as definer, coalesce(array_to_string(p.proconfig, ','), '') as config,
             has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
             has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
      from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'`;
    const noSearchPath = functions.filter((fn) => !fn.config.includes("search_path")).map((fn) => fn.name);
    check(`Funções com search_path fixo (${functions.length})`, noSearchPath.length === 0, noSearchPath.join(", "));
    const anonFunctions = functions.filter((fn) => fn.anon_exec).map((fn) => fn.name).sort();
    // Funções de gatilho (returns trigger) não podem ser chamadas diretamente, mesmo com EXECUTE.
    const triggerFns = (await sql`select p.proname as name from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prorettype = 'trigger'::regtype`).map((row) => row.name);
    const unexpected = anonFunctions.filter((name) => !PUBLIC_FUNCTIONS.includes(name) && !triggerFns.includes(name));
    check("Anon só executa as funções da proposta pública", unexpected.length === 0, unexpected.join(", "));
    const definers = functions.filter((fn) => fn.definer).map((fn) => fn.name).sort();
    check("Funções security definer conhecidas", definers.join(",") === "get_public_proposal,handle_new_auth_user,is_admin,respond_to_proposal", definers.join(","));
    const newUserFn = functions.find((fn) => fn.name === "handle_new_auth_user");
    check("Função do gatilho de login não é executável por anon/authenticated", Boolean(newUserFn && !newUserFn.anon_exec && !newUserFn.auth_exec));

  } finally {
    await sql.end();
  }

  // API pública do Supabase com a chave publishable (o que qualquer pessoa tem).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const headers = { apikey: key, "content-type": "application/json" };
  const tables = ["users", "niches", "tags", "stages", "loss_reasons", "plans", "templates", "settings", "experts", "expert_tags", "activities", "cadences", "cadence_steps", "cadence_enrollments", "tasks", "meetings", "proposals", "projects"];
  const exposed: string[] = [];
  for (const table of tables) {
    const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers });
    const body = await response.json();
    if (Array.isArray(body) && body.length > 0) exposed.push(table);
  }
  check("API pública não devolve linha de nenhuma das 18 tabelas", exposed.length === 0, exposed.join(", "));

  const write = await fetch(`${url}/rest/v1/niches`, { method: "POST", headers, body: JSON.stringify({ name: "Invasor" }) });
  check("API pública não consegue gravar", write.status >= 400, `status ${write.status}`);

  const isAdmin = await fetch(`${url}/rest/v1/rpc/is_admin`, { method: "POST", headers, body: "{}" });
  check("API pública não executa is_admin", isAdmin.status >= 400, `status ${isAdmin.status}`);

  const proposal = await fetch(`${url}/rest/v1/rpc/get_public_proposal`, {
    method: "POST",
    headers,
    body: JSON.stringify({ proposal_token: "00000000-0000-4000-8000-000000000000" }),
  });
  check("Token de proposta inexistente devolve vazio", proposal.ok && (await proposal.json()) === null, `status ${proposal.status}`);

  const settings = await fetch(`${url}/auth/v1/settings`, { headers });
  const auth = await settings.json();
  check("Cadastro aberto desligado no Supabase Auth", auth.disable_signup === true, JSON.stringify(auth.disable_signup));

  for (const r of results) console.log(`${r.pass ? "OK     " : "FALHOU "} ${r.name}${r.detail && !r.pass ? `  (${r.detail.slice(0, 300)})` : ""}`);
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} testes passaram`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
