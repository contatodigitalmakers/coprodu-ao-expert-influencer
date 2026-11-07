// Testes de tela da Etapa 8 (fila do dia e meta diária).
// Uso: BASE_URL=http://localhost:3200 npx tsx --env-file=.env.local tests/e2e/etapa8.ts
import postgres from "postgres";
import { choose, createRunner, credentials, expect, login, open } from "./helpers";

const visible = { visible: true } as const;

async function main() {
  const sql = postgres(process.env.DATABASE_URL_MIGRATIONS!, { max: 1, onnotice: () => {} });
  const stage = async (key: string) => (await sql`select id from public.stages where key = ${key}`)[0].id;
  const [fitness] = await sql`select id from public.niches where name = 'Fitness'`;
  const [noReply] = await sql`select id from public.loss_reasons where key = 'no_reply'`;
  const owner = credentials.id;
  const leads = await sql`insert into public.experts ${sql([
    { name: "Fila A E2E", handle: "e2e.fila.a", platform: "instagram", stage_id: await stage("new"), owner_id: owner, niche_id: fitness.id, whatsapp: "5511999990000", email: "filaa@exemplo.com", loss_reason_id: null, stage_entered_at: new Date() },
    { name: "Fila B E2E", handle: "e2e.fila.b", platform: "instagram", stage_id: await stage("new"), owner_id: owner, niche_id: fitness.id, whatsapp: null, email: null, loss_reason_id: null, stage_entered_at: new Date() },
    { name: "Reativar E2E", handle: "e2e.reativar", platform: "instagram", stage_id: await stage("lost"), owner_id: owner, niche_id: null, whatsapp: null, email: null, loss_reason_id: noReply.id, stage_entered_at: new Date(Date.now() - 70 * 86_400_000) },
  ])} returning id, name`;
  const idOf = (name: string) => leads.find((lead) => lead.name === name)!.id;

  const { start, step, report } = createRunner("etapa8");
  const { browser, context, page } = await start();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const task = (name: string, channel: string) =>
    page.getByRole("region", { name: channel, exact: true }).getByRole("article", { name: `Tarefa ${name}` });

  try {
    await login(page);

    await step(page, "Inscrever os leads na cadência padrão (pela ficha)", async () => {
      for (const name of ["Fila A E2E", "Fila B E2E"]) {
        await open(page, `/experts/${idOf(name)}`);
        await choose(page, "Cadência", "Cadência padrão (12 dias)");
        await page.getByRole("button", { name: "Inscrever na cadência" }).click();
        await page.getByRole("button", { name: "Encerrar cadência" }).waitFor();
      }
      // Traz D1 (DM) e D8 (e-mail) para hoje e D5 (WhatsApp) para ontem.
      await sql`update public.tasks t set due_date = case s.day_offset
                  when 1 then (now() at time zone 'America/Sao_Paulo')::date
                  when 8 then (now() at time zone 'America/Sao_Paulo')::date
                  when 5 then (now() at time zone 'America/Sao_Paulo')::date - 1
                  else t.due_date end
                from public.cadence_steps s
                where s.id = t.step_id and t.expert_id in ${sql([idOf("Fila A E2E"), idOf("Fila B E2E")])}`;
    });

    await step(page, "Fila agrupada por canal, com meta diária", async () => {
      await open(page, "/");
      await page.getByRole("heading", { name: "Olá, Teste!" }).waitFor();
      await page.getByTestId("daily-goal").getByText("0 de 40 toques").waitFor();
      await task("Fila A E2E", "Seguir e interagir").waitFor();
      await task("Fila A E2E", "DM Instagram").waitFor();
      await task("Fila A E2E", "E-mail").waitFor();
      await task("Fila A E2E", "WhatsApp").getByText("Atrasada há 1 dia").waitFor();
      expect((await page.getByRole("article", { name: /^Tarefa Fila B/ }).count()) === 4, "B deveria ter 4 tarefas hoje");
      await task("Fila B E2E", "WhatsApp").getByText("Sem WhatsApp cadastrado").waitFor();
    });

    await step(page, "Mensagem com variáveis preenchidas e botão copiar", async () => {
      const dm = task("Fila A E2E", "DM Instagram");
      const message = await dm.getByTestId("task-message").innerText();
      expect(message.startsWith("Oi, Fila! Tudo bem? Aqui é Teste."), `mensagem: ${message.slice(0, 60)}`);
      expect(message.includes("sobre Fitness"), "nicho deveria estar preenchido");
      await dm.getByRole("button", { name: "Copiar mensagem" }).click();
      await dm.getByRole("button", { name: "Copiado!" }).waitFor();
      const clipboard = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboard === message, "texto copiado deveria ser a mensagem");
    });

    await step(page, "Links diretos: WhatsApp com texto e e-mail com assunto", async () => {
      const whatsapp = await task("Fila A E2E", "WhatsApp").getByRole("link", { name: "Abrir WhatsApp" }).getAttribute("href");
      expect(whatsapp?.startsWith("https://wa.me/5511999990000?text=Oi%2C%20Fila"), `wa.me: ${whatsapp}`);
      const email = await task("Fila A E2E", "E-mail").getByRole("link", { name: "Abrir e-mail" }).getAttribute("href");
      expect(email?.startsWith("mailto:filaa@exemplo.com?subject=Um%20app%20com%20a%20sua%20marca%2C%20Fila"), `mailto: ${email}`);
      const profile = await task("Fila A E2E", "DM Instagram").getByRole("link", { name: "Abrir perfil" }).getAttribute("href");
      expect(profile === "https://instagram.com/e2e.fila.a", `perfil: ${profile}`);
    });

    await step(page, "Registrar \"Feito\" tira a tarefa e conta o toque", async () => {
      await task("Fila A E2E", "Seguir e interagir").getByRole("button", { name: "Feito" }).click();
      await task("Fila A E2E", "Seguir e interagir").waitFor({ state: "detached" });
      await page.getByTestId("daily-goal").getByText("1 de 40 toques").waitFor();
    });

    await step(page, "\"Respondeu\" pausa a cadência e move o lead", async () => {
      await task("Fila B E2E", "DM Instagram").getByRole("button", { name: "Respondeu" }).click();
      await page.getByRole("article", { name: "Tarefa Fila B E2E" }).first().waitFor({ state: "detached" });
      await page.getByTestId("daily-goal").getByText("2 de 40 toques").waitFor();
      const [row] = await sql`select s.key, en.status from public.experts e join public.stages s on s.id = e.stage_id
                              join public.cadence_enrollments en on en.expert_id = e.id where e.id = ${idOf("Fila B E2E")}`;
      expect(row.key === "replied" && row.status === "paused", JSON.stringify(row));
    });

    await step(page, "\"Pular\" tira a tarefa sem contar toque", async () => {
      await task("Fila A E2E", "E-mail").getByRole("button", { name: "Pular" }).click();
      await task("Fila A E2E", "E-mail").waitFor({ state: "detached" });
      await page.getByTestId("daily-goal").getByText("2 de 40 toques").waitFor();
    });

    await step(page, "Fila de reativação: reativar lead perdido sem resposta", async () => {
      const section = page.getByRole("region", { name: "Fila de reativação" });
      await section.getByText("Reativar E2E").waitFor();
      await section.getByRole("button", { name: "Reativar Reativar E2E" }).click();
      await section.waitFor({ state: "detached" });
      const [row] = await sql`select s.key from public.experts e join public.stages s on s.id = e.stage_id where e.id = ${idOf("Reativar E2E")}`;
      expect(row.key === "new", `etapa: ${row.key}`);
    });

    await step(page, "Meta diária configurável por usuário", async () => {
      await open(page, "/configuracoes");
      await page.getByLabel("Teste Automatizado", { exact: true }).fill("5");
      await page.getByRole("button", { name: "Salvar metas" }).click();
      await page.getByText("Metas salvas.").filter(visible).waitFor();
      await open(page, "/");
      await page.getByTestId("daily-goal").getByText("2 de 5 toques").waitFor();
    });
  } finally {
    await browser.close();
    await sql`update public.users set daily_goal = null where id = ${owner}`;
    await sql.end();
  }
  process.exit(report() ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
