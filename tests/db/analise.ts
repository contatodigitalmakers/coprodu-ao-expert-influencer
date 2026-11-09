// Testes do cadastro pelo link + /analisar. Banco real, tudo desfeito no final.
// Uso: npx tsx --env-file=.env.local tests/db/analise.ts
import { readFileSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { runAsUser } from "@/db";
import { activities, experts, expertTags, niches, stages, tags, users } from "@/db/schema";
import { parseResearchConfig } from "@/lib/research/config";
import {
  ANALYSIS_TAG,
  AnalysisError,
  createForAnalysis,
  getPendingSummary,
  listPendingAnalyses,
  saveAnalyses,
} from "@/lib/research/analysis";

async function main() {
  const results: { name: string; pass: boolean; detail: string }[] = [];
  const check = (name: string, pass: boolean, detail = "") => results.push({ name, pass, detail });
  const config = parseResearchConfig(readFileSync("pesquisa/config.md", "utf8"));

  class Rollback extends Error {}
  const fake = { sub: "00000000-0000-0000-0000-000000000000", role: "authenticated" } as never;
  const [user] = await runAsUser(fake, (tx) => tx.select({ id: users.id }).from(users).limit(1));
  const claims = { sub: user.id, role: "authenticated" } as never;

  try {
    await runAsUser(claims, async (tx) => {
      // Cadastro pelo link
      const errorOf = async (url: string) => {
        try {
          await createForAnalysis(tx, url, user.id);
          return null;
        } catch (error) {
          return error instanceof AnalysisError ? error : null;
        }
      };
      check("Link vazio é recusado", (await errorOf("  "))?.message === "Cole o link do perfil.");
      check("Link de post é recusado", Boolean((await errorOf("https://www.instagram.com/p/abc123/"))?.message.startsWith("Cole o link de um perfil")));
      check("Link de fora das redes é recusado", Boolean(await errorOf("https://linktr.ee/ana")));

      const anaId = await createForAnalysis(tx, "https://www.instagram.com/Ana.Analise.E2E/?hl=pt-br", user.id);
      const [ana] = await tx.select().from(experts).where(eq(experts.id, anaId));
      const [stage] = await tx.select({ key: stages.key }).from(stages).where(eq(stages.id, ana.stageId));
      check(
        "Lead criado com @ e plataforma do link, em Novo lead, com responsável e origem",
        ana.handle === "ana.analise.e2e" && ana.platform === "instagram" && ana.name === "@ana.analise.e2e" &&
          ana.profileUrl === "https://www.instagram.com/ana.analise.e2e/" && stage.key === "new" &&
          ana.ownerId === user.id && ana.source === "Cadastro pelo link" && ana.score === 0,
        JSON.stringify(ana),
      );
      const [tagLink] = await tx
        .select({ name: tags.name })
        .from(expertTags)
        .innerJoin(tags, eq(tags.id, expertTags.tagId))
        .where(eq(expertTags.expertId, anaId));
      check("Lead entra na fila (tag analisar-ia)", tagLink?.name === ANALYSIS_TAG);
      const [created] = await tx.select().from(activities).where(eq(activities.expertId, anaId));
      check("Linha do tempo: cadastrado pelo link, aguardando análise", Boolean(created?.description?.includes("aguardando a análise da IA")));

      const duplicate = await errorOf("https://instagram.com/ana.analise.e2e");
      check("Perfil já cadastrado é recusado, com o link do lead", duplicate?.existingId === anaId, duplicate?.message);

      const beaId = await createForAnalysis(tx, "https://www.tiktok.com/@bea.analise.e2e/video/123", user.id);
      const caioId = await createForAnalysis(tx, "https://www.youtube.com/@caio.analise.e2e", user.id);
      const davId = await createForAnalysis(tx, "https://www.instagram.com/dav.analise.e2e/", user.id);
      const eduId = await createForAnalysis(tx, "https://www.instagram.com/edu.analise.e2e/", user.id);

      // A Bea já tem dados digitados pelo usuário: não podem ser apagados.
      const [fitness] = await tx.select({ id: niches.id }).from(niches).where(eq(niches.name, "Fitness"));
      await tx.update(experts).set({ name: "Beatriz Digitada", nicheId: fitness.id, followers: 999, sellsProduct: false }).where(eq(experts.id, beaId));

      const pending = await listPendingAnalyses(tx);
      const pendingIds = new Set(pending.map((lead) => lead.id));
      check("Fila lista os cadastrados pelo link", [anaId, beaId, caioId, davId, eduId].every((id) => pendingIds.has(id)));
      const summary = await getPendingSummary(tx);
      check("Resumo da fila conta os pendentes", summary.count >= 5 && summary.tagId !== null, JSON.stringify(summary));

      const searchKeys = new Set(["instagram:ana.analise.e2e", "tiktok:bea.analise.e2e", "instagram:edu.analise.e2e"]);
      const report = await saveAnalyses(
        tx,
        [
          {
            id: anaId,
            nome: "Ana Análise",
            nicho: "Nutricao",
            seguidores: "48K",
            cidade: "Campinas (SP)",
            whatsapp: "(11) 98888-7777",
            email: "contato@ana-analise-e2e.com",
            fonteContato: "https://linktr.ee/ana.analise.e2e",
            vendeProduto: "sim",
            produto: "Curso Comer Bem",
            fonteProduto: "https://hotmart.com/x",
            temMetodo: "sim",
            problemaRecorrente: "sim",
            resumo: "Nutricionista que ensina.",
            mensagemSugerida: "Oi, Ana!",
            provas: [{ url: "https://www.instagram.com/ana.analise.e2e/", trecho: "48K Followers" }],
          },
          { id: beaId, nome: "Bea IA", nicho: "Nutrição", seguidores: "20K", vendeProduto: "sim", whatsapp: "11977776666", resumo: "Personal." },
          { id: caioId, nome: "Caio", seguidores: "10K" }, // não apareceu em nenhuma busca
          { id: davId, encontrado: false },
          { id: eduId, nome: "Edu", nicho: "Astrologia" },
          { id: anaId, nome: "De novo" },
          { id: "nao-e-uuid" },
        ],
        { config, userId: user.id, searchKeys },
      );

      const updated = new Map(report.updated.map((lead) => [lead.id, lead]));
      const reasons = report.discarded.map((item) => `${item.label}: ${item.reason}`);
      check("Atualiza os 3 com prova (Ana, Bea e Edu)", updated.size === 3 && updated.has(anaId) && updated.has(beaId) && updated.has(eduId), JSON.stringify(report));

      const [anaAfter] = await tx.select().from(experts).where(eq(experts.id, anaId));
      const [nutricao] = await tx.select({ id: niches.id }).from(niches).where(eq(niches.name, "Nutrição"));
      check(
        "Ana: nome, nicho, seguidores, cidade e contato com fonte preenchidos",
        anaAfter.name === "Ana Análise" && anaAfter.nicheId === nutricao.id && anaAfter.followers === 48000 &&
          anaAfter.city === "Campinas (SP)" && anaAfter.whatsapp === "5511988887777" && anaAfter.email === "contato@ana-analise-e2e.com",
        JSON.stringify(anaAfter),
      );
      check("Ana: qualificação e score recalculado (60)", anaAfter.sellsProduct === true && anaAfter.hasMethod === true && anaAfter.productDescription === "Curso Comer Bem" && anaAfter.score === 60, `score ${anaAfter.score}`);
      check("Ana: observações com o bloco da análise", Boolean(anaAfter.notes?.startsWith("[Análise IA · ") && anaAfter.notes.includes("Mensagem sugerida:")), anaAfter.notes ?? "");
      const anaTags = await tx.select().from(expertTags).where(eq(expertTags.expertId, anaId));
      check("Ana: saiu da fila", anaTags.length === 0);
      const anaActivities = await tx.select().from(activities).where(and(eq(activities.expertId, anaId), eq(activities.type, "note")));
      check("Ana: linha do tempo com o que foi preenchido", Boolean(anaActivities[0]?.description?.startsWith("Perfil analisado pela IA. Preenchido: nome, nicho")), anaActivities[0]?.description ?? "");

      const [beaAfter] = await tx.select().from(experts).where(eq(experts.id, beaId));
      check(
        "Bea: o que o usuário digitou não é apagado",
        beaAfter.name === "Beatriz Digitada" && beaAfter.nicheId === fitness.id && beaAfter.followers === 999 && beaAfter.sellsProduct === false,
        JSON.stringify(beaAfter),
      );
      check("Bea: contato sem fonte não é gravado (com aviso)", beaAfter.whatsapp === null && report.warnings.some((w) => w.includes("contato removido")));

      check("Caio: sem prova na busca, descartado e continua na fila", reasons.some((r) => r.includes("@caio.analise.e2e") && r.includes("continua aguardando")), reasons.join(" | "));
      const caioTags = await tx.select().from(expertTags).where(eq(expertTags.expertId, caioId));
      check("Caio: ainda tem a tag analisar-ia", caioTags.length === 1);

      const [davAfter] = await tx.select().from(experts).where(eq(experts.id, davId));
      const davTags = await tx.select().from(expertTags).where(eq(expertTags.expertId, davId));
      check(
        "Dav: não encontrado sai da fila com aviso nas observações",
        report.notFound.some((lead) => lead.id === davId) && davTags.length === 0 && Boolean(davAfter.notes?.includes("Não encontrei informações públicas")),
      );

      const [eduAfter] = await tx.select().from(experts).where(eq(experts.id, eduId));
      check("Edu: nicho inexistente fica vazio, com aviso", eduAfter.nicheId === null && eduAfter.name === "Edu" && report.warnings.some((w) => w.includes('nicho "Astrologia"')));
      check("Repetido no arquivo é descartado", reasons.some((r) => r.includes("repetido no arquivo")));
      check("Id inválido é descartado", reasons.some((r) => r.startsWith("nao-e-uuid: dados inválidos")));

      // Já analisado: não entra de novo.
      const again = await saveAnalyses(tx, [{ id: anaId, nome: "Outra" }], { config, userId: user.id, searchKeys });
      check("Lead já analisado não é analisado de novo", again.updated.length === 0 && again.discarded[0]?.reason.startsWith("não está aguardando"));

      // Sem registro de buscas: grava e avisa.
      const noLog = await saveAnalyses(tx, [{ id: caioId, nome: "Caio Sem Log" }], { config, userId: user.id, searchKeys: null });
      check("Sem registro de buscas: grava e avisa", noLog.updated.length === 1 && noLog.warnings[0]?.startsWith("Sem registro de buscas"));

      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }

  const [left] = await runAsUser(claims, (tx) => tx.select({ id: experts.id }).from(experts).where(eq(experts.handle, "ana.analise.e2e")));
  check("Nada ficou gravado (rollback)", !left);

  for (const r of results) console.log(`${r.pass ? "OK     " : "FALHOU "} ${r.name}${r.detail && !r.pass ? `  (${r.detail.slice(0, 400)})` : ""}`);
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} testes passaram`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
