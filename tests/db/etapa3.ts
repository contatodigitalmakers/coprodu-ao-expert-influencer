// Teste da Etapa 3 (roda contra o banco real, tudo desfeito no final).
// Uso: npx tsx --env-file=.env.local tests/db/etapa3.ts
import { readFileSync } from "node:fs";
import Papa from "papaparse";
import { and, count, eq, isNull, like, sql } from "drizzle-orm";
import { runAsUser } from "@/db";
import { isUniqueViolation } from "@/db/errors";
import { activities, expertTags, experts, niches, users } from "@/db/schema";
import { analyzeImport, importAnalyzedRows } from "@/lib/experts/import";
import { IMPORT_FIELDS, normalizeHeader, type ImportRow } from "@/lib/experts/import-fields";
import { getInitialStage } from "@/lib/experts/mutations";
import { normalizeHandle, normalizeWhatsapp, parseFollowers, parseYesNo } from "@/lib/experts/normalize";
import { expertFormSchema } from "@/lib/experts/validation";

async function main() {
const results: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail = "") => results.push({ name, pass, detail });
const show = (value: unknown) => JSON.stringify(value);

// 1. Normalização
const followerCases: [string, number | null][] = [
  ["12500", 12500], ["12.500", 12500], ["12,5 mil", 12500], ["12.5k", 12500],
  ["1,2M", 1200000], ["1.2 mi", 1200000], ["", null],
];
for (const [input, expected] of followerCases) {
  const got = parseFollowers(input);
  check(`Seguidores "${input}" → ${expected}`, got === expected, `obtido ${got}`);
}
check("Seguidores \"muitos\" é inválido", Number.isNaN(parseFollowers("muitos")));
check("@ \"@Fulana \" → fulana", normalizeHandle("@Fulana ") === "fulana");
check("@ de link do Instagram", normalizeHandle("https://www.instagram.com/fulana.fit/") === "fulana.fit");
check("@ de link do TikTok", normalizeHandle("tiktok.com/@fulana") === "fulana");
check("WhatsApp (11) 99999-8888 → 5511999998888", normalizeWhatsapp("(11) 99999-8888") === "5511999998888");
check("WhatsApp já com 55 fica igual", normalizeWhatsapp("+55 11 99999-8888") === "5511999998888");
check("WhatsApp curto é inválido", normalizeWhatsapp("9999-8888") === "invalid");
check("Sim/não: \"Não\" → false", parseYesNo("Não") === false);
check("Sim/não: \"nao_informado\" → null", parseYesNo("nao_informado") === null);

const formOk = expertFormSchema.safeParse({
  name: "Teste", handle: "@Teste", platform: "instagram", profileUrl: "instagram.com/teste", nicheId: "",
  followers: "12,5 mil", engagementRate: "3,5", whatsapp: "(11) 99999-8888", email: "", city: "",
  source: "", ownerId: "", tags: ["vip"], notes: "", sellsProduct: "sim", productDescription: "",
  hasMethod: "nao", recurringProblem: "nao_informado", contentFrequency: "sim",
});
check(
  "Formulário válido é normalizado",
  formOk.success && formOk.data.handle === "teste" && formOk.data.followers === 12500 &&
    formOk.data.engagementRate === 3.5 && formOk.data.profileUrl === "https://instagram.com/teste" &&
    formOk.data.recurringProblem === null,
  formOk.success ? "" : show(formOk.error.issues),
);
const formBad = expertFormSchema.safeParse({ ...(formOk.success ? {} : {}), name: "", handle: "", platform: "x" });
check("Formulário sem nome/@/plataforma é recusado", !formBad.success);

// 2. Importação da planilha de 105 linhas (mesmo parser e mapeamento da tela)
const csv = readFileSync("tests/fixtures/teste-importacao-105-linhas.csv", "utf8");
const parsed = Papa.parse<Record<string, string>>(csv, {
  header: true,
  skipEmptyLines: "greedy",
  transformHeader: (header) => header.trim(),
});
const headers = parsed.meta.fields ?? [];
const mapping = Object.fromEntries(
  IMPORT_FIELDS.flatMap((field) => {
    const header = headers.find((h) => (field.aliases as readonly string[]).includes(normalizeHeader(h)));
    return header ? [[field.key, header]] : [];
  }),
);
const rows: ImportRow[] = parsed.data.map((row) =>
  Object.fromEntries(Object.entries(mapping).map(([field, header]) => [field, row[header] ?? ""])),
);
check("Planilha lida: 105 linhas", rows.length === 105, `${rows.length}`);
check("Colunas reconhecidas automaticamente", Object.keys(mapping).length === headers.length, show(mapping));

class Rollback extends Error {}

// Pega o id de um usuário real (a RLS deixa qualquer logado ler users).
const fakeClaims = { sub: "00000000-0000-0000-0000-000000000000", role: "authenticated" } as never;
const [user] = await runAsUser(fakeClaims, (tx) => tx.select({ id: users.id }).from(users).limit(1));
const claims = { sub: user.id, role: "authenticated" } as never;

try {
  await runAsUser(claims, async (tx) => {
    const testExperts = and(like(experts.handle, "teste.expert%"), isNull(experts.deletedAt));
    const [{ before }] = await tx.select({ before: count() }).from(experts).where(testExperts);

    const first = await analyzeImport(tx, rows, "instagram");
    check("Prévia: 100 serão criados", first.ready.length === 100 - before, `${first.ready.length}`);
    check("Prévia: 3 repetidos na planilha", first.duplicatesInFile.length === 3, show(first.duplicatesInFile));
    check("Prévia: 2 linhas com erro", first.errors.length === 2, show(first.errors));
    check("Prévia: nicho novo \"Yoga\"", show(first.newNiches) === show(["Yoga"]), show(first.newNiches));

    const created = await importAnalyzedRows(tx, first, user.id, user.id);
    check("Importação: 100 leads criados", created === 100, `${created}`);

    const [{ total }] = await tx.select({ total: count() }).from(experts).where(testExperts);
    check("Banco: 100 experts de teste", total === 100, `${total}`);
    const [{ acts }] = await tx
      .select({ acts: count() })
      .from(activities)
      .innerJoin(experts, eq(experts.id, activities.expertId))
      .where(testExperts);
    check("Banco: 1 registro na linha do tempo por lead", acts === 100, `${acts}`);
    const [{ links }] = await tx
      .select({ links: count() })
      .from(expertTags)
      .innerJoin(experts, eq(experts.id, expertTags.expertId))
      .where(testExperts);
    check("Banco: tags ligadas (100 + 33 \"quente\")", links === 133, `${links}`);
    const [yoga] = await tx.select({ id: niches.id }).from(niches).where(eq(niches.name, "Yoga"));
    check("Banco: nicho Yoga criado", Boolean(yoga));

    const [sample] = await tx.select().from(experts).where(eq(experts.handle, "teste.expert007"));
    check(
      "Linha \"@Teste.Expert007\" normalizada",
      Boolean(sample) && sample.platform === "youtube" && sample.whatsapp === "5511980001007",
      show(sample && { handle: sample.handle, platform: sample.platform, whatsapp: sample.whatsapp }),
    );
    const [stage] = [await getInitialStage(tx)];
    check("Leads importados em \"Novo lead\"", sample?.stageId === stage.id && stage.name === "Novo lead");

    // Segunda importação da mesma planilha: nada é duplicado.
    const second = await analyzeImport(tx, rows, "instagram");
    check("Reimportação: 0 serão criados", second.ready.length === 0, `${second.ready.length}`);
    check("Reimportação: 100 já cadastrados", second.duplicatesInDb.length === 100, `${second.duplicatesInDb.length}`);
    const createdAgain = await importAnalyzedRows(tx, second, user.id, user.id);
    check("Reimportação: 0 leads criados", createdAgain === 0, `${createdAgain}`);

    // Cadastro manual com @ já existente (maiúsculas diferentes) é bloqueado.
    let blocked = false;
    try {
      await tx.transaction((sp) =>
        sp.insert(experts).values({ name: "Dup", handle: "TESTE.EXPERT001", platform: "instagram", stageId: stage.id }),
      );
    } catch (error) {
      blocked = isUniqueViolation(error, "experts_platform_handle_unique");
    }
    check("Cadastro com @ repetido é bloqueado e reconhecido", blocked);

    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(experts).where(testExperts);
    check("Continua com 100 experts de teste", n === 100, `${n}`);

    throw new Rollback();
  });
} catch (error) {
  if (!(error instanceof Rollback)) throw error;
}

// Confere que nada ficou gravado.
const [{ left }] = await runAsUser(claims, (tx) =>
  tx.select({ left: count() }).from(experts).where(like(experts.handle, "teste.expert%")),
);
check("Nada ficou gravado (rollback)", left === 0, `${left}`);

for (const r of results) console.log(`${r.pass ? "OK     " : "FALHOU "} ${r.name}${r.detail && !r.pass ? `  (${r.detail})` : ""}`);
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} testes passaram`);
process.exit(failed ? 1 : 0);

}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
