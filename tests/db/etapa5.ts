// Testes da Etapa 5 (regras de etapa no banco e moveExpert). Tudo desfeito no final.
// Uso: npx tsx --env-file=.env.local tests/db/etapa5.ts
import { and, desc, eq, sql } from "drizzle-orm";
import { runAsUser, type Tx } from "@/db";
import { databaseHint } from "@/db/errors";
import { activities, experts, lossReasons, plans, projects, proposals, stages, users } from "@/db/schema";
import { getStageByKey } from "@/lib/experts/mutations";
import { MoveError, moveExpert } from "@/lib/pipeline/move";

async function main() {
  const results: { name: string; pass: boolean; detail: string }[] = [];
  const check = (name: string, pass: boolean, detail = "") => results.push({ name, pass, detail });

  // Executa num savepoint e devolve o erro (ou null).
  const attempt = async (tx: Tx, fn: (sp: Tx) => Promise<unknown>) => {
    try {
      await tx.transaction(async (sp) => {
        await fn(sp);
      });
      return null;
    } catch (error) {
      return error;
    }
  };

  class Rollback extends Error {}
  const fake = { sub: "00000000-0000-0000-0000-000000000000", role: "authenticated" } as never;
  const [user] = await runAsUser(fake, (tx) => tx.select({ id: users.id }).from(users).limit(1));
  const claims = { sub: user.id, role: "authenticated" } as never;

  try {
    await runAsUser(claims, async (tx) => {
      const stageNew = await getStageByKey(tx, "new");
      const lost = await getStageByKey(tx, "lost");
      const won = await getStageByKey(tx, "won");
      const replied = await getStageByKey(tx, "replied");
      const [noInterest] = await tx.select().from(lossReasons).where(eq(lossReasons.name, "Sem interesse"));
      const [other] = await tx.select().from(lossReasons).where(eq(lossReasons.key, "other"));
      const [expert] = await tx
        .insert(experts)
        .values({ name: "Pipeline E2E", handle: "e2e.pipeline", platform: "instagram", stageId: stageNew.id, stageEnteredAt: new Date("2026-01-01") })
        .returning();
      const lastActivity = async () =>
        (await tx.select().from(activities).where(eq(activities.expertId, expert.id)).orderBy(desc(activities.createdAt)).limit(1))[0];

      // Perdido sem motivo: bloqueado no banco e na função.
      let error = await attempt(tx, (sp) => sp.update(experts).set({ stageId: lost.id }).where(eq(experts.id, expert.id)));
      check("Banco bloqueia Perdido sem motivo", databaseHint(error) === "loss_reason_required", String(error));
      error = await attempt(tx, (sp) => moveExpert(sp, { expertId: expert.id, toStageId: lost.id }, user.id));
      check("moveExpert pede o motivo da perda", error instanceof MoveError && error.message === "Escolha o motivo da perda.", String(error));
      error = await attempt(tx, (sp) => moveExpert(sp, { expertId: expert.id, toStageId: lost.id, lossReasonId: other.id }, user.id));
      check("Motivo \"Outro\" exige descrição", error instanceof MoveError && error.message === "Descreva o motivo da perda.", String(error));

      // Mudança simples: atualiza stage_entered_at e registra na linha do tempo com o usuário.
      await moveExpert(tx, { expertId: expert.id, toStageId: replied.id }, user.id);
      const [afterReplied] = await tx.select().from(experts).where(eq(experts.id, expert.id));
      check("stage_entered_at atualizado ao mudar de etapa", afterReplied.stageEnteredAt.getFullYear() >= 2026 && afterReplied.stageEnteredAt > new Date("2026-02-01"));
      let activity = await lastActivity();
      check(
        "Mudança de etapa registrada com usuário",
        activity?.type === "stage_change" && activity.userId === user.id && activity.description === 'Etapa alterada de "Novo lead" para "Respondeu".',
        JSON.stringify(activity),
      );

      // Perdido com motivo.
      await moveExpert(tx, { expertId: expert.id, toStageId: lost.id, lossReasonId: noInterest.id, lossNote: "Disse que não é o momento" }, user.id);
      const [afterLost] = await tx.select().from(experts).where(eq(experts.id, expert.id));
      activity = await lastActivity();
      check("Perdido com motivo grava o motivo", afterLost.stageId === lost.id && afterLost.lossReasonId === noInterest.id);
      check("Linha do tempo mostra o motivo", Boolean(activity?.description?.includes("Motivo: Sem interesse. Disse que não é o momento")), activity?.description ?? "");

      // Reativação: motivo apagado e registro de reativação (regra 6).
      await moveExpert(tx, { expertId: expert.id, toStageId: stageNew.id }, user.id);
      const [afterReactivation] = await tx.select().from(experts).where(eq(experts.id, expert.id));
      activity = await lastActivity();
      check("Reativação apaga o motivo da perda", afterReactivation.lossReasonId === null && afterReactivation.lossNote === null);
      check("Reativação registrada", activity?.description === 'Lead reativado: de "Perdido" para "Novo lead".', activity?.description ?? "");

      // Ganho sem proposta aceita: bloqueado no banco e na função.
      error = await attempt(tx, (sp) => sp.update(experts).set({ stageId: won.id }).where(eq(experts.id, expert.id)));
      check("Banco bloqueia Ganho sem proposta aceita", databaseHint(error) === "accepted_proposal_required", String(error));

      const [plan] = await tx.select().from(plans).where(eq(plans.name, "Setup 7k"));
      const [proposal] = await tx
        .insert(proposals)
        .values({ expertId: expert.id, planId: plan.id, setupValue: 7000, expertShare: 70, ourShare: 30, total: 7000, status: "accepted", acceptedAt: new Date() })
        .returning();

      // Com proposta aceita mas sem projeto: bloqueado no fim da transação.
      error = await attempt(tx, async (sp) => {
        await sp.update(experts).set({ stageId: won.id }).where(eq(experts.id, expert.id));
        await sp.execute(sql`set constraints experts_won_requires_project immediate`);
      });
      check("Banco bloqueia Ganho sem projeto (assinatura + pagamento)", databaseHint(error) === "won_requires_project", String(error));

      error = await attempt(tx, (sp) => moveExpert(sp, { expertId: expert.id, toStageId: won.id }, user.id));
      check("moveExpert pede os dados do Ganho", error instanceof MoveError, String(error));

      // Ganho completo: cria o Projeto "Aguardando kickoff" (regra 5).
      await moveExpert(
        tx,
        { expertId: expert.id, toStageId: won.id, won: { proposalId: proposal.id, contractSignedAt: "2026-11-05", setupPaidAt: "2026-11-06" } },
        user.id,
      );
      await tx.execute(sql`set constraints experts_won_requires_project immediate`);
      const [project] = await tx.select().from(projects).where(eq(projects.expertId, expert.id));
      const [afterWon] = await tx.select().from(experts).where(eq(experts.id, expert.id));
      check("Ganho cria Projeto em \"Aguardando kickoff\"", project?.status === "awaiting_kickoff" && project.setupPaidAt === "2026-11-06" && afterWon.stageId === won.id, JSON.stringify(project));

      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(activities)
        .where(and(eq(activities.expertId, expert.id), eq(activities.type, "stage_change")));
      check("Uma atividade por mudança de etapa (4)", count === 4, `${count}`);

      // Etapas de sistema identificadas por key.
      const keys = await tx.select({ key: stages.key }).from(stages);
      check("10 etapas com identificador", keys.filter((row) => row.key).length === 10);

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
