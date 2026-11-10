// Testes do /pesquisa (gravação dos candidatos). Banco real, tudo desfeito no final.
// Uso: npx tsx --env-file=.env.local tests/db/pesquisa.ts
import { readFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { runAsUser } from "@/db";
import { activities, experts, expertTags, niches, stages, tags, users } from "@/db/schema";
import { getStageByKey } from "@/lib/experts/mutations";
import { parseResearchConfig } from "@/lib/research/config";
import { profileFromUrl } from "@/lib/research/profile-url";
import { saveResearch } from "@/lib/research/save";
import { profileKeysFromLog } from "@/lib/research/search-log";

async function main() {
  const results: { name: string; pass: boolean; detail: string }[] = [];
  const check = (name: string, pass: boolean, detail = "") => results.push({ name, pass, detail });

  // Links de perfil
  const cases: [string, string | null][] = [
    ["https://www.instagram.com/Ana.Nutri/", "instagram:ana.nutri"],
    ["https://instagram.com/ana.nutri?hl=pt-br", "instagram:ana.nutri"],
    ["https://www.instagram.com/p/C8xyz/", null],
    ["https://www.instagram.com/reel/abc/", null],
    ["https://www.tiktok.com/@joao.fit", "tiktok:joao.fit"],
    ["https://www.tiktok.com/@joao.fit/video/123456", "tiktok:joao.fit"],
    ["https://www.youtube.com/@CanalFe", "youtube:canalfe"],
    ["https://www.youtube.com/watch?v=abc", null],
    ["https://linktr.ee/ana", null],
    ["javascript:alert(1)", null],
    ["instagram.com/Sem.Protocolo", "instagram:sem.protocolo"],
    ["www.tiktok.com/@sem.protocolo", "tiktok:sem.protocolo"],
    ["@so.o.arroba", null],
  ];
  for (const [url, expected] of cases) {
    const profile = profileFromUrl(url);
    const got = profile ? `${profile.platform}:${profile.handle}` : null;
    check(`Link ${url} → ${expected ?? "não é perfil"}`, got === expected, `obtido ${got}`);
  }

  // Configuração real do projeto
  const config = parseResearchConfig(readFileSync("pesquisa/config.md", "utf8"));
  check(
    "Config: 4 nichos, 10 por rodada, 10 mil a 500 mil, 3 plataformas",
    config.niches.map((niche) => niche.name).join(",") === "Nutrição,Fitness,Religião,Renda extra" &&
      config.quantity === 10 && config.followersMin === 10000 && config.followersMax === 500000 && config.platforms.length === 3,
    JSON.stringify({ ...config, niches: config.niches.map((niche) => niche.name) }),
  );

  // Registro de buscas: só a RESPOSTA vale como prova
  const now = new Date();
  const log = [
    { data: now.toISOString(), ferramenta: "WebSearch", entrada: { query: "site:instagram.com/inventado.na.busca" }, resposta: "Links: [{\"url\":\"https://www.instagram.com/ana.teste.e2e/\"},{\"url\":\"https://www.tiktok.com/@joao.teste.e2e/video/1\"}]" },
    { data: new Date(now.getTime() - 48 * 3600_000).toISOString(), ferramenta: "WebSearch", entrada: {}, resposta: "https://www.instagram.com/antiga.e2e/" },
  ].map((line) => JSON.stringify(line)).join("\n");
  const keys = profileKeysFromLog(log, new Date(now.getTime() - 24 * 3600_000));
  check("Registro: perfis da resposta contam", keys.has("instagram:ana.teste.e2e") && keys.has("tiktok:joao.teste.e2e"));
  check("Registro: o texto da busca não conta como prova", !keys.has("instagram:inventado.na.busca"));
  check("Registro: buscas com mais de 24h não contam", !keys.has("instagram:antiga.e2e"));

  class Rollback extends Error {}
  const fake = { sub: "00000000-0000-0000-0000-000000000000", role: "authenticated" } as never;
  const [user] = await runAsUser(fake, (tx) => tx.select({ id: users.id }).from(users).limit(1));
  const claims = { sub: user.id, role: "authenticated" } as never;

  const candidate = (overrides: Record<string, unknown>) => ({
    nome: "Ana Teste E2E",
    handle: "ana.teste.e2e",
    plataforma: "instagram",
    profileUrl: "https://www.instagram.com/ana.teste.e2e/",
    nicho: "Nutricao",
    seguidores: "48K",
    whatsapp: "(11) 99999-0000",
    email: "",
    fonteContato: "https://linktr.ee/ana.teste.e2e",
    vendeProduto: "sim",
    produto: "Curso Emagrece 30",
    fonteProduto: "https://hotmart.com/produto",
    temMetodo: "sim",
    problemaRecorrente: "sim",
    frequenciaConteudo: "",
    resumo: "Nutricionista que ensina reeducação alimentar.",
    ideiaApp: "App Emagrece 30: cardápio do dia e registro de peso.",
    mensagens: {
      prospeccao: "Boa tarde, Ana, tudo bem? Acompanhei seu conteúdo.\n\nFiquei curioso: ou você já tem algum sistema ou app próprio?",
      amostra: "Entendi, Ana! Pergunto porque a gente desenvolve apps próprios para experts, em parceria.",
      convite: "Ana, esse foi só um rascunho. Você teria um horário amanhã ou depois de amanhã?",
    },
    provas: [{ url: "https://www.instagram.com/ana.teste.e2e/", trecho: "48K Followers · Nutricionista" }],
    ...overrides,
  });

  try {
    await runAsUser(claims, async (tx) => {
      const stageNew = await getStageByKey(tx, "new");
      // Um lead já existente e um excluído (rejeitado antes).
      await tx.insert(experts).values([
        { name: "Existente E2E", handle: "existente.e2e", platform: "instagram", stageId: stageNew.id },
        { name: "Rejeitado E2E", handle: "rejeitado.e2e", platform: "tiktok", stageId: stageNew.id, deletedAt: new Date() },
      ]);
      const searchKeys = new Set([
        "instagram:ana.teste.e2e", "instagram:existente.e2e", "tiktok:rejeitado.e2e", "instagram:sem.contato.e2e",
        "youtube:canal.fe.e2e", "instagram:fora.faixa.e2e", "instagram:nicho.errado.e2e",
        ...Array.from({ length: 12 }, (_, index) => `instagram:extra${index}.e2e`),
      ]);

      const report = await saveResearch(
        tx,
        [
          candidate({}),
          candidate({ nome: "Repetida E2E" }), // mesmo perfil de novo na rodada
          candidate({ nome: "Existente E2E", handle: "existente.e2e", profileUrl: "https://www.instagram.com/existente.e2e/" }),
          candidate({ nome: "Rejeitado E2E", handle: "rejeitado.e2e", plataforma: "tiktok", profileUrl: "https://www.tiktok.com/@rejeitado.e2e" }),
          candidate({ nome: "Inventada E2E", handle: "inventada.e2e", profileUrl: "https://www.instagram.com/inventada.e2e/" }),
          candidate({ nome: "Handle Errado E2E", handle: "outro.nome", profileUrl: "https://www.instagram.com/sem.contato.e2e/" }),
          candidate({ nome: "Post E2E", handle: "", profileUrl: "https://www.instagram.com/p/abc123/" }),
          candidate({ nome: "Plataforma Errada E2E", plataforma: "tiktok", handle: "", profileUrl: "https://www.instagram.com/sem.contato.e2e/" }),
          candidate({ nome: "Nicho Errado E2E", handle: "nicho.errado.e2e", profileUrl: "https://www.instagram.com/nicho.errado.e2e/", nicho: "Astrologia" }),
          candidate({ nome: "Fora da Faixa E2E", handle: "fora.faixa.e2e", profileUrl: "https://www.instagram.com/fora.faixa.e2e/", seguidores: "2,3M" }),
          candidate({ nome: "Sem Contato E2E", handle: "sem.contato.e2e", profileUrl: "https://www.instagram.com/sem.contato.e2e/", fonteContato: "", seguidores: "" }),
          candidate({ nome: "Fé E2E", handle: "canal.fe.e2e", plataforma: "youtube", profileUrl: "https://www.youtube.com/@canal.fe.e2e", nicho: "Religião", seguidores: "120 mil", whatsapp: "" }),
          {},
        ],
        { config, userId: user.id, searchKeys },
      );

      const reasons = Object.fromEntries(report.discarded.map((item) => [item.label.split(" (")[0], item.reason]));
      check("Cria os 3 candidatos válidos", report.created.length === 3, JSON.stringify(report.created.map((lead) => lead.handle)));
      check("Repetido na rodada é descartado", reasons["Repetida E2E"] === "repetido nesta rodada", reasons["Repetida E2E"]);
      check("Lead já ativo é descartado", reasons["Existente E2E"] === "já está no sistema", reasons["Existente E2E"]);
      check("Lead excluído antes (rejeitado) não volta", reasons["Rejeitado E2E"] === "já foi analisado e excluído antes", reasons["Rejeitado E2E"]);
      check("Perfil fora das buscas é descartado (anti-invenção)", reasons["Inventada E2E"]?.startsWith("o perfil não apareceu"), reasons["Inventada E2E"]);
      check("@ diferente do link é descartado", reasons["Handle Errado E2E"]?.startsWith("o @ informado"), reasons["Handle Errado E2E"]);
      check("Link de post não é perfil", reasons["Post E2E"]?.startsWith("o link não é de um perfil"), reasons["Post E2E"]);
      check("Plataforma diferente do link é descartada", reasons["Plataforma Errada E2E"] === "a plataforma não bate com o link do perfil", reasons["Plataforma Errada E2E"]);
      check("Nicho fora da configuração é descartado", reasons["Nicho Errado E2E"]?.startsWith("nicho"), reasons["Nicho Errado E2E"]);
      check("Seguidores fora da faixa são descartados", reasons["Fora da Faixa E2E"]?.startsWith("seguidores fora da faixa"), reasons["Fora da Faixa E2E"]);
      check("Candidato sem dados é descartado", reasons["(sem nome)"]?.startsWith("dados inválidos"), reasons["(sem nome)"]);

      const [ana] = await tx.select().from(experts).where(eq(experts.handle, "ana.teste.e2e"));
      check(
        "Lead gravado: origem, sem responsável, Novo lead, score e contato com fonte",
        ana?.source === "Pesquisa IA" && ana.ownerId === null && ana.stageId === stageNew.id && ana.score === 60 && ana.whatsapp === "5511999990000" && ana.followers === 48000,
        JSON.stringify(ana && { source: ana.source, owner: ana.ownerId, score: ana.score, whatsapp: ana.whatsapp, followers: ana.followers }),
      );
      check("Observações com resumo, provas, data e mensagem", Boolean(ana?.notes?.startsWith("[Pesquisa IA · ") && ana.notes.includes("Provas:") && ana.notes.includes("Ideia do app: App Emagrece 30")), ana?.notes ?? "");
      const notes = ana?.notes ?? "";
      const at = (text: string) => notes.indexOf(text);
      check(
        "Observações trazem as 3 mensagens na ordem, cada uma com o título da etapa",
        at("1. Prospecção") > 0 && at("1. Prospecção") < at("Boa tarde, Ana") && at("Boa tarde, Ana") < at("2. Proposta de amostra") &&
          at("2. Proposta de amostra") < at("Entendi, Ana!") && at("Entendi, Ana!") < at("3. Envio da amostra") && at("3. Envio da amostra") < at("amanhã ou depois de amanhã"),
        notes,
      );
      const [tagLink] = await tx
        .select({ name: tags.name })
        .from(expertTags)
        .innerJoin(tags, eq(tags.id, expertTags.tagId))
        .where(eq(expertTags.expertId, ana.id));
      check("Tag pesquisa-ia aplicada", tagLink?.name === "pesquisa-ia" && report.tagId !== null);
      const [activity] = await tx.select().from(activities).where(eq(activities.expertId, ana.id));
      check("Linha do tempo: \"Lead encontrado pela pesquisa IA.\"", activity?.description === "Lead encontrado pela pesquisa IA." && (activity.metadata as { source?: string }).source === "research");

      const [semContato] = await tx.select().from(experts).where(eq(experts.handle, "sem.contato.e2e"));
      check("Contato sem fonte é removido; seguidores não confirmados", semContato?.whatsapp === null && semContato.followers === null && Boolean(semContato.notes?.includes("Seguidores: não confirmados")));
      check("Aviso de contato removido no relatório", report.warnings.some((warning) => warning.includes("contato removido")));

      const [religiao] = await tx.select({ id: niches.id }).from(niches).where(eq(niches.name, "Religião"));
      const [fe] = await tx.select().from(experts).where(and(eq(experts.handle, "canal.fe.e2e"), eq(experts.platform, "youtube")));
      check("Nicho novo (Religião) criado e ligado ao lead", Boolean(religiao) && fe?.nicheId === religiao.id);

      // Limite da rodada
      const many = await saveResearch(
        tx,
        Array.from({ length: 12 }, (_, index) =>
          candidate({ nome: `Extra ${index} E2E`, handle: `extra${index}.e2e`, profileUrl: `https://www.instagram.com/extra${index}.e2e/` }),
        ),
        { config, userId: user.id, searchKeys, limit: 5 },
      );
      check("Quantidade da rodada respeitada (5 de 12)", many.created.length === 5 && many.discarded.filter((item) => item.reason === "acima da quantidade da rodada").length === 7);

      // Sem registro de buscas: grava, mas avisa
      const noLog = await saveResearch(tx, [candidate({ nome: "Sem Log E2E", handle: "sem.log.e2e", profileUrl: "https://www.instagram.com/sem.log.e2e/" })], {
        config,
        userId: user.id,
        searchKeys: null,
      });
      check("Sem registro de buscas: grava e avisa", noLog.created.length === 1 && noLog.warnings.some((warning) => warning.startsWith("Sem registro de buscas")));

      const [stage] = await tx.select({ key: stages.key }).from(stages).where(eq(stages.id, ana.stageId));
      check("Leads da pesquisa ficam em \"Novo lead\"", stage.key === "new");

      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }

  // Nada ficou gravado
  const [left] = await runAsUser(claims, (tx) => tx.select({ id: experts.id }).from(experts).where(eq(experts.handle, "ana.teste.e2e")));
  check("Nada ficou gravado (rollback)", !left);

  for (const r of results) console.log(`${r.pass ? "OK     " : "FALHOU "} ${r.name}${r.detail && !r.pass ? `  (${r.detail.slice(0, 300)})` : ""}`);
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} testes passaram`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
