// Testes da Etapa 9 (agenda e diagnóstico). Banco real, tudo desfeito no final.
// Uso: npx tsx --env-file=.env.local tests/db/etapa9.ts
import { desc, eq } from "drizzle-orm";
import { runAsUser } from "@/db";
import { activities, experts, meetings, stages, users } from "@/db/schema";
import { getStageByKey } from "@/lib/experts/mutations";
import { rescheduleMeeting, saveDiagnosis, scheduleMeeting, setMeetingStatus, toScheduledAt } from "@/lib/meetings/mutations";

async function main() {
  const results: { name: string; pass: boolean; detail: string }[] = [];
  const check = (name: string, pass: boolean, detail = "") => results.push({ name, pass, detail });

  check("15:00 em Brasília = 18:00 UTC", toScheduledAt("2026-11-12", "15:00").toISOString() === "2026-11-12T18:00:00.000Z");

  class Rollback extends Error {}
  const fake = { sub: "00000000-0000-0000-0000-000000000000", role: "authenticated" } as never;
  const [user] = await runAsUser(fake, (tx) => tx.select({ id: users.id, name: users.name }).from(users).limit(1));
  const claims = { sub: user.id, role: "authenticated" } as never;

  try {
    await runAsUser(claims, async (tx) => {
      const replied = await getStageByKey(tx, "replied");
      const [expert] = await tx.insert(experts).values({ name: "Agenda E2E", handle: "e2e.agenda", platform: "instagram", stageId: replied.id }).returning();
      const stageKey = async () =>
        (await tx.select({ key: stages.key }).from(experts).innerJoin(stages, eq(stages.id, experts.stageId)).where(eq(experts.id, expert.id)))[0].key;
      const lastActivity = async () =>
        (await tx.select().from(activities).where(eq(activities.expertId, expert.id)).orderBy(desc(activities.createdAt)).limit(1))[0];

      const meetingId = await scheduleMeeting(tx, expert.id, { date: "2026-11-12", time: "15:00", link: "https://meet.google.com/abc", closerId: user.id }, user.id);
      check("Agendar move para \"Diagnóstico agendado\"", (await stageKey()) === "meeting_scheduled");
      const scheduled = (await tx.select().from(activities).where(eq(activities.expertId, expert.id)).orderBy(desc(activities.createdAt)))
        .find((activity) => activity.type === "meeting");
      check("Agendamento na linha do tempo", scheduled?.description === `Diagnóstico agendado para 12/11/2026, 15:00 com ${user.name}.`, scheduled?.description ?? "");

      await rescheduleMeeting(tx, meetingId, { date: "2026-11-13", time: "09:30", link: null, closerId: user.id }, user.id);
      const [rescheduled] = await tx.select().from(meetings).where(eq(meetings.id, meetingId));
      check("Reagendar muda data e link", rescheduled.scheduledAt.toISOString() === "2026-11-13T12:30:00.000Z" && rescheduled.link === null);

      await saveDiagnosis(tx, meetingId, { audience: "Mulheres 25-40", currentProducts: "Curso", approxRevenue: "R$ 30 mil", appIdea: "App de treinos", planInterestId: null, objections: "Preço" });
      const [withDiagnosis] = await tx.select().from(meetings).where(eq(meetings.id, meetingId));
      check("Diagnóstico salvo", withDiagnosis.diagnosis?.appIdea === "App de treinos");

      await setMeetingStatus(tx, meetingId, "no_show", user.id);
      check("\"Não compareceu\" não muda a etapa", (await stageKey()) === "meeting_scheduled");
      await setMeetingStatus(tx, meetingId, "done", user.id);
      check("\"Realizada\" move para \"Diagnóstico realizado\"", (await stageKey()) === "meeting_done");
      check("Status registrado na linha do tempo", (await lastActivity()).description?.startsWith('Etapa alterada de "Diagnóstico agendado" para "Diagnóstico realizado"') ?? false);

      // Lead já mais adiante no funil não volta de etapa.
      const negotiation = await getStageByKey(tx, "negotiation");
      const [ahead] = await tx.insert(experts).values({ name: "Agenda Adiante E2E", handle: "e2e.agenda.adiante", platform: "instagram", stageId: negotiation.id }).returning();
      await scheduleMeeting(tx, ahead.id, { date: "2026-11-12", time: "10:00", link: null, closerId: user.id }, user.id);
      const [aheadStage] = await tx.select({ key: stages.key }).from(experts).innerJoin(stages, eq(stages.id, experts.stageId)).where(eq(experts.id, ahead.id));
      check("Lead em Negociação não volta para Diagnóstico agendado", aheadStage.key === "negotiation");

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
