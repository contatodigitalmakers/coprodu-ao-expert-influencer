// Testes das apresentações (link curto). Banco real, tudo desfeito no final.
// Uso: npx tsx --env-file=.env.local tests/db/apresentacoes.ts
// Sem DATABASE_URL, roda só a parte que não usa o banco.
import { desc, eq, sql } from "drizzle-orm";
import { runAsUser, type Tx } from "@/db";
import { isUniqueViolation } from "@/db/errors";
import { activities, experts, presentations, stages, users } from "@/db/schema";
import { renderDeckHtml } from "@/lib/presentations/deck-html";
import { encodeDeckData, readDeckLink } from "@/lib/presentations/encode";
import { createPresentation, deletePresentation, newPresentationCode, updatePresentation } from "@/lib/presentations/mutations";
import { PRESENTATION_CODE } from "@/lib/presentations/queries";
import { presentationDataSchema } from "@/lib/presentations/validation";

async function main() {
  const results: { name: string; pass: boolean; detail: string }[] = [];
  const check = (name: string, pass: boolean, detail = "") => results.push({ name, pass, detail });

  // ---------- Sem banco ----------
  const valid = presentationDataSchema.safeParse({ expert: "  Ana\u0007 Souza ", invasor: "x", ocultar: "19, 3,3, 99", plano1_voce: "65" });
  check("Validação: limpa o texto, descarta chave desconhecida e normaliza os slides ocultos",
    valid.success && valid.data.expert === "Ana Souza" && !("invasor" in valid.data) && valid.data.ocultar === "3,19",
    JSON.stringify(valid));
  check("Validação: recusa link http (só https)", !presentationDataSchema.safeParse({ foto: "http://x.com/a.jpg" }).success);
  check("Validação: recusa javascript: no link", !presentationDataSchema.safeParse({ mockup: "javascript:alert(1)" }).success);
  check("Validação: recusa % acima de 100", !presentationDataSchema.safeParse({ plano2_voce: "120" }).success);
  check("Validação: recusa texto acima de 400 caracteres", !presentationDataSchema.safeParse({ dor: "a".repeat(401) }).success);
  check("Validação: aceita números em pt-BR", presentationDataSchema.safeParse({ seguidores: "1,2mi", plano1_caucao: "R$ 4.500" }).success);

  const link = `https://site.antigo/index.html?d=${encodeDeckData({ expert: "Bruno", data: "", nicho: "fitness" })}&data=12/11/2026&setup=5000`;
  const imported = readDeckLink(link);
  check("Link antigo: lê ?d= e os parâmetros, data dd/mm/aaaa e o nome antigo setup",
    imported?.expert === "Bruno" && imported.nicho === "fitness" && imported.data === "2026-11-12" && imported.caucao === "5000",
    JSON.stringify(imported));
  check("Link antigo: texto que não é link não quebra", readDeckLink("") !== undefined);

  const codes = Array.from({ length: 200 }, newPresentationCode);
  check("Código do link: 8 caracteres sem 0, o, 1, i, l", codes.every((code) => /^[a-hjkmnp-z2-9]{8}$/.test(code) && PRESENTATION_CODE.test(code)), codes[0]);

  const html = renderDeckHtml({ data: { expert: "Ana</script><script>alert(1)</script>" }, origin: "https://exemplo.com" });
  check("HTML: nome com </script> não fecha a tag dos dados", !html.includes("Ana</script>") && html.includes("Ana\\u003c/script"));
  check("HTML: caminhos absolutos de /apresentacao e og:image completo",
    html.includes('href="/apresentacao/css/deck.css') && html.includes('src="/apresentacao/js/deck.js') && html.includes('content="https://exemplo.com/apresentacao/assets/og.png"'));
  check("HTML da prévia não traz dados salvos", !renderDeckHtml({ data: null, origin: "" }).includes("DM_DADOS"));

  // ---------- Com banco ----------
  if (process.env.DATABASE_URL) {
    class Rollback extends Error {}
    const fake = { sub: "00000000-0000-0000-0000-000000000000", role: "authenticated" } as never;
    const [user] = await runAsUser(fake, (tx) => tx.select({ id: users.id }).from(users).limit(1));
    const claims = { sub: user.id, role: "authenticated" } as never;

    // Consulta como visitante sem login e volta para o usuário logado.
    const asAnon = async <T,>(tx: Tx, query: ReturnType<typeof sql>) => {
      await tx.execute(sql`select set_config('request.jwt.claims', '', true)`);
      await tx.execute(sql`set local role anon`);
      const rows = await tx.execute(query);
      await tx.execute(sql`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`);
      await tx.execute(sql`set local role authenticated`);
      return rows as unknown as T[];
    };
    const publicData = async (tx: Tx, code: string, view: boolean) =>
      (await asAnon<{ data: Record<string, string> | null }>(tx, sql`select public.get_public_presentation(${code}, ${view}) as data`))[0].data;

    try {
      await runAsUser(claims, async (tx) => {
        const [stage] = await tx.select({ id: stages.id }).from(stages).where(eq(stages.key, "new"));
        const [expert] = await tx.insert(experts).values({ name: "Apresentação E2E", handle: "e2e.apresentacao", platform: "instagram", stageId: stage.id }).returning();

        const { id, code } = await createPresentation(tx, expert.id, { expert: "Ana Souza", plano1_voce: "65" }, user.id);
        const [log] = await tx.select().from(activities).where(eq(activities.expertId, expert.id)).orderBy(desc(activities.createdAt)).limit(1);
        check("Criar grava a apresentação e a nota na linha do tempo", PRESENTATION_CODE.test(code) && log.type === "note" && log.description?.includes(`/a/${code}`) === true, JSON.stringify(log));

        const anonCount = await asAnon<{ n: number }>(tx, sql`select count(*)::int as n from public.presentations`);
        check("Visitante sem login não lê a tabela de apresentações", anonCount[0].n === 0);

        const data = await publicData(tx, code, true);
        let [row] = await tx.select().from(presentations).where(eq(presentations.id, id));
        check("Link curto devolve os dados e conta a abertura", data?.expert === "Ana Souza" && row.views === 1 && row.lastViewedAt !== null, JSON.stringify({ data, views: row.views }));
        await publicData(tx, code, false);
        [row] = await tx.select().from(presentations).where(eq(presentations.id, id));
        check("Janela do apresentador não conta abertura", row.views === 1);
        check("Código que não existe não abre", (await publicData(tx, "zzzzzzzz", true)) === null);

        await updatePresentation(tx, id, { expert: "Ana Souza Lima" });
        [row] = await tx.select().from(presentations).where(eq(presentations.id, id));
        check("Editar mantém o mesmo código", row.code === code && row.data.expert === "Ana Souza Lima");

        let error: unknown = null;
        try {
          await tx.transaction((sp) => sp.insert(presentations).values({ expertId: expert.id, code, data: {} }));
        } catch (caught) {
          error = caught;
        }
        check("Código repetido é recusado pelo banco", isUniqueViolation(error, "presentations_code_unique"), String(error));
        error = null;
        try {
          await tx.transaction((sp) => sp.insert(presentations).values({ expertId: expert.id, code: "ABC", data: {} }));
        } catch (caught) {
          error = caught;
        }
        check("Código fora do formato é recusado pelo banco", error !== null);

        error = null;
        try {
          await tx.transaction((sp) => sp.delete(presentations).where(eq(presentations.id, id)));
        } catch (caught) {
          error = caught;
        }
        const [stillThere] = await tx.select({ id: presentations.id }).from(presentations).where(eq(presentations.id, id));
        check("Sem exclusão definitiva (só lógica)", Boolean(stillThere));

        await deletePresentation(tx, id, user.id);
        check("Apresentação excluída não abre", (await publicData(tx, code, true)) === null);

        const second = await createPresentation(tx, expert.id, { expert: "Ana" }, user.id);
        await tx.update(experts).set({ deletedAt: new Date() }).where(eq(experts.id, expert.id));
        check("Apresentação de lead excluído não abre", (await publicData(tx, second.code, true)) === null);

        throw new Rollback();
      });
    } catch (error) {
      if (!(error instanceof Rollback)) throw error;
    }
  } else {
    console.log("Sem DATABASE_URL: só os testes que não usam o banco.\n");
  }

  for (const r of results) console.log(`${r.pass ? "OK     " : "FALHOU "} ${r.name}${r.detail && !r.pass ? `  (${r.detail.slice(0, 300)})` : ""}`);
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} testes passaram`);
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
