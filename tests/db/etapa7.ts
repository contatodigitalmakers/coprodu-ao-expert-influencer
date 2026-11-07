// Testes da Etapa 7 (cadências). Banco real, tudo desfeito no final.
// Uso: npx tsx --env-file=.env.local tests/db/etapa7.ts
import { and, asc, eq } from "drizzle-orm";
import { runAsUser, type Tx } from "@/db";
import { cadenceEnrollments, cadences, experts, lossReasons, stages, tasks, templates, users } from "@/db/schema";
import { addDays, CadenceError, completeTask, enrollExpert, skipTask } from "@/lib/cadences/mutations";
import { getStageByKey } from "@/lib/experts/mutations";
import { todayInSaoPaulo } from "@/lib/format";
import { moveExpert } from "@/lib/pipeline/move";

async function main() {
  const results: { name: string; pass: boolean; detail: string }[] = [];
  const check = (name: string, pass: boolean, detail = "") => results.push({ name, pass, detail });

  check("addDays soma dias (virada de mês)", addDays("2026-11-28", 5) === "2026-12-03");
  check("addDays 0 mantém a data", addDays("2026-11-06", 0) === "2026-11-06");

  class Rollback extends Error {}
  const fake = { sub: "00000000-0000-0000-0000-000000000000", role: "authenticated" } as never;
  const [user] = await runAsUser(fake, (tx) => tx.select({ id: users.id }).from(users).limit(1));
  const claims = { sub: user.id, role: "authenticated" } as never;

  try {
    await runAsUser(claims, async (tx) => {
      const [cadence] = await tx.select().from(cadences).where(eq(cadences.name, "Cadência padrão (12 dias)"));
      const stageNew = await getStageByKey(tx, "new");
      const newExpert = async (handle: string) =>
        (await tx.insert(experts).values({ name: `Cadência ${handle} E2E`, handle, platform: "instagram", stageId: stageNew.id }).returning())[0];
      const stageKeyOf = async (expertId: string) =>
        (await tx.select({ key: stages.key }).from(experts).innerJoin(stages, eq(stages.id, experts.stageId)).where(eq(experts.id, expertId)))[0].key;
      const tasksOf = (expertId: string) =>
        tx.select().from(tasks).where(eq(tasks.expertId, expertId)).orderBy(asc(tasks.dueDate));
      const enrollmentOf = async (expertId: string) =>
        (await tx.select().from(cadenceEnrollments).where(eq(cadenceEnrollments.expertId, expertId)))[0];

      // Inscrição gera as tarefas nas datas certas e move para "Em cadência".
      const a = await newExpert("e2e.cad.a");
      await enrollExpert(tx, a.id, cadence.id, user.id);
      const today = todayInSaoPaulo();
      const aTasks = await tasksOf(a.id);
      const dates = aTasks.map((task) => task.dueDate).join(",");
      const expected = [0, 1, 3, 5, 8, 12].map((days) => addDays(today, days)).join(",");
      check("6 tarefas nas datas D0, D1, D3, D5, D8, D12", dates === expected, `${dates} vs ${expected}`);
      check("Tarefas para quem inscreveu (lead sem responsável)", aTasks.every((task) => task.userId === user.id));
      check("Lead vai para \"Em cadência\"", (await stageKeyOf(a.id)) === "in_cadence");

      // Uma cadência ativa por vez (regra 2).
      let error: unknown = null;
      try {
        await tx.transaction((sp) => enrollExpert(sp as Tx, a.id, cadence.id, user.id));
      } catch (caught) {
        error = caught;
      }
      check("Segunda inscrição ativa é bloqueada", error instanceof CadenceError, String(error));

      // Resultado "enviado" conta uso do template; "respondeu" pausa e move.
      const [d1Template] = await tx.select().from(templates).where(eq(templates.name, "D1 · Abordagem por DM"));
      await completeTask(tx, aTasks[0].id, "sent", user.id); // D0 interação (sem template)
      await completeTask(tx, aTasks[1].id, "sent", user.id); // D1 DM
      const [d1After] = await tx.select().from(templates).where(eq(templates.id, d1Template.id));
      check("Template conta o uso", d1After.timesUsed === d1Template.timesUsed + 1 && d1After.timesReplied === d1Template.timesReplied);

      await completeTask(tx, aTasks[2].id, "replied", user.id); // D3 respondeu
      const enrollmentA = await enrollmentOf(a.id);
      const afterReply = await tasksOf(a.id);
      check("\"Respondeu\" pausa a cadência", enrollmentA.status === "paused", enrollmentA.status);
      check("Tarefas restantes são puladas", afterReply.slice(3).every((task) => task.status === "skipped"));
      check("Lead vai para \"Respondeu\"", (await stageKeyOf(a.id)) === "replied");
      const [d3] = await tx.select().from(templates).where(eq(templates.name, "D3 · Follow-up por DM"));
      check("Template conta a resposta", d3.timesReplied >= 1);

      // Cadência sem resposta: lead vai para Perdido "Sem resposta".
      const b = await newExpert("e2e.cad.b");
      await enrollExpert(tx, b.id, cadence.id, user.id);
      const bTasks = await tasksOf(b.id);
      for (const [index, task] of bTasks.entries()) {
        if (index === 3) await skipTask(tx, task.id, user.id);
        else await completeTask(tx, task.id, index === 2 ? "no_response" : "sent", user.id);
      }
      const [bAfter] = await tx
        .select({ key: stages.key, reason: lossReasons.key })
        .from(experts)
        .innerJoin(stages, eq(stages.id, experts.stageId))
        .leftJoin(lossReasons, eq(lossReasons.id, experts.lossReasonId))
        .where(eq(experts.id, b.id));
      check("Fim sem resposta: Perdido com motivo \"Sem resposta\"", bAfter.key === "lost" && bAfter.reason === "no_reply", JSON.stringify(bAfter));
      check("Cadência fica encerrada", (await enrollmentOf(b.id)).status === "finished");

      // Lead perdido pode entrar de novo em cadência (é reativado).
      await enrollExpert(tx, b.id, cadence.id, user.id);
      check("Inscrever lead perdido o reativa para \"Em cadência\"", (await stageKeyOf(b.id)) === "in_cadence");

      // Mover pelo pipeline: Respondeu pausa; Perdido encerra.
      const c = await newExpert("e2e.cad.c");
      await enrollExpert(tx, c.id, cadence.id, user.id);
      const replied = await getStageByKey(tx, "replied");
      await moveExpert(tx, { expertId: c.id, toStageId: replied.id }, user.id);
      const cTasks = await tasksOf(c.id);
      check("Mover para Respondeu pausa a cadência", (await enrollmentOf(c.id)).status === "paused" && cTasks.every((task) => task.status === "skipped"));

      const [noInterest] = await tx.select().from(lossReasons).where(eq(lossReasons.name, "Sem interesse"));
      const d = await newExpert("e2e.cad.d");
      await enrollExpert(tx, d.id, cadence.id, user.id);
      const lost = await getStageByKey(tx, "lost");
      await moveExpert(tx, { expertId: d.id, toStageId: lost.id, lossReasonId: noInterest.id }, user.id);
      check("Mover para Perdido encerra a cadência", (await enrollmentOf(d.id)).status === "finished");

      const pending = await tx
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.expertId, d.id), eq(tasks.status, "pending")));
      check("Sem tarefas pendentes depois de encerrar", pending.length === 0);

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
