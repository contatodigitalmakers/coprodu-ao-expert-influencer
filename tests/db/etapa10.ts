// Testes da Etapa 10 (propostas). Banco real, tudo desfeito no final.
// Uso: npx tsx --env-file=.env.local tests/db/etapa10.ts
import { desc, eq, sql } from "drizzle-orm";
import { runAsUser, type Tx } from "@/db";
import { databaseHint } from "@/db/errors";
import { activities, experts, plans, proposals, stages, users } from "@/db/schema";
import { getStageByKey } from "@/lib/experts/mutations";
import { parseMoney, proposalTotal } from "@/lib/proposals/calc";
import { createProposal, markSent, updateDraft } from "@/lib/proposals/mutations";

async function main() {
  const results: { name: string; pass: boolean; detail: string }[] = [];
  const check = (name: string, pass: boolean, detail = "") => results.push({ name, pass, detail });

  check("parseMoney \"R$ 7.000,00\" → 7000", parseMoney("R$ 7.000,00") === 7000);
  check("parseMoney \"1500,5\" → 1500.5", parseMoney("1500,5") === 1500.5);
  check("parseMoney \"abc\" é inválido", Number.isNaN(parseMoney("abc")));
  check("Total = setup + extras", proposalTotal(7000, [{ name: "Tráfego", value: 1500 }, { name: "Lançamento", value: 999.99 }]) === 9499.99);

  class Rollback extends Error {}
  const fake = { sub: "00000000-0000-0000-0000-000000000000", role: "authenticated" } as never;
  const [user] = await runAsUser(fake, (tx) => tx.select({ id: users.id }).from(users).limit(1));
  const claims = { sub: user.id, role: "authenticated" } as never;

  // Chama a função como visitante sem login e volta para o usuário logado.
  const asAnon = async <T,>(tx: Tx, query: ReturnType<typeof sql>) => {
    await tx.execute(sql`select set_config('request.jwt.claims', '', true)`);
    await tx.execute(sql`set local role anon`);
    const rows = await tx.execute(query);
    await tx.execute(sql`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`);
    await tx.execute(sql`set local role authenticated`);
    return rows as unknown as T[];
  };

  try {
    await runAsUser(claims, async (tx) => {
      const meetingDone = await getStageByKey(tx, "meeting_done");
      const [expert] = await tx.insert(experts).values({ name: "Proposta E2E", handle: "e2e.proposta", platform: "instagram", stageId: meetingDone.id }).returning();
      const stageKey = async () =>
        (await tx.select({ key: stages.key }).from(experts).innerJoin(stages, eq(stages.id, experts.stageId)).where(eq(experts.id, expert.id)))[0].key;
      const [plan7k] = await tx.select().from(plans).where(eq(plans.name, "Setup 7k"));
      const [plan5k] = await tx.select().from(plans).where(eq(plans.name, "Setup 5k"));

      const proposalId = await createProposal(tx, expert.id, plan5k.id, [], user.id);
      await updateDraft(tx, proposalId, plan7k.id, [{ name: "Tráfego", value: 1500 }]);
      let [proposal] = await tx.select().from(proposals).where(eq(proposals.id, proposalId));
      check("Proposta copia valores e divisão do plano 7k (70/30)", proposal.setupValue === 7000 && proposal.expertShare === 70 && proposal.ourShare === 30 && proposal.total === 8500, JSON.stringify(proposal));

      // Rascunho não é público.
      let [publicRow] = await asAnon<{ proposal: unknown }>(tx, sql`select public.get_public_proposal(${proposal.publicToken}::uuid) as proposal`);
      check("Rascunho não aparece na página pública", publicRow.proposal === null);

      await markSent(tx, proposalId, user.id);
      check("Enviada move o lead para \"Proposta enviada\"", (await stageKey()) === "proposal_sent");

      [publicRow] = await asAnon<{ proposal: { expertShare: number; ourShare: number; status: string } }>(tx, sql`select public.get_public_proposal(${proposal.publicToken}::uuid) as proposal`);
      [proposal] = await tx.select().from(proposals).where(eq(proposals.id, proposalId));
      check("Página pública mostra 70/30", (publicRow.proposal as { expertShare: number }).expertShare === 70);
      check("Visualização registrada", proposal.status === "viewed" && proposal.viewedAt !== null);

      const anonCount = await asAnon<{ n: number }>(tx, sql`select count(*)::int as n from public.proposals`);
      check("Visitante sem login não lê a tabela de propostas", anonCount[0].n === 0);

      const [answer] = await asAnon<{ result: string }>(tx, sql`select public.respond_to_proposal(${proposal.publicToken}::uuid, true) as result`);
      [proposal] = await tx.select().from(proposals).where(eq(proposals.id, proposalId));
      check("Aceite pela página pública", answer.result === "accepted" && proposal.status === "accepted" && proposal.acceptedAt !== null);
      check("Aceite move o lead para Negociação (padrão)", (await stageKey()) === "negotiation");
      const [last] = await tx.select().from(activities).where(eq(activities.expertId, expert.id)).orderBy(desc(activities.createdAt)).limit(2);
      check("Mudança de etapa registrada sem usuário (veio do expert)", last.type === "stage_change" && last.userId === null, JSON.stringify(last));

      const [again] = await asAnon<{ result: string }>(tx, sql`select public.respond_to_proposal(${proposal.publicToken}::uuid, false) as result`);
      check("Resposta só vale uma vez", again.result === "unavailable");

      let error: unknown = null;
      try {
        await tx.transaction(async (sp) => {
          await sp.update(proposals).set({ expertShare: 80, ourShare: 20 }).where(eq(proposals.id, proposalId));
        });
      } catch (caught) {
        error = caught;
      }
      check("Divisão da proposta aceita fica congelada (regra 8)", databaseHint(error) === "accepted_proposal_frozen", String(error));

      // Mudar o plano depois não altera a proposta aceita.
      await tx.update(plans).set({ setupValue: 7500 }).where(eq(plans.id, plan7k.id));
      [proposal] = await tx.select().from(proposals).where(eq(proposals.id, proposalId));
      check("Mudança no plano não afeta a proposta", proposal.setupValue === 7000);

      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
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
