// Testes de tela da Etapa 9 (agenda e diagnóstico).
// Uso: BASE_URL=http://localhost:3200 npx tsx --env-file=.env.local tests/e2e/etapa9.ts
import postgres from "postgres";
import { createRunner, expect, login, open } from "./helpers";

const visible = { visible: true } as const;

async function main() {
  const sql = postgres(process.env.DATABASE_URL_MIGRATIONS!, { max: 1, onnotice: () => {} });
  const [qualified] = await sql`select id from public.stages where key = 'qualified'`;
  const [lead] = await sql`insert into public.experts (name, handle, platform, stage_id) values ('Agenda UI E2E', 'e2e.agendaui', 'instagram', ${qualified.id}) returning id`;
  const stageKey = async () =>
    (await sql`select s.key from public.experts e join public.stages s on s.id = e.stage_id where e.id = ${lead.id}`)[0].key;

  const { start, step, report } = createRunner("etapa9");
  const { browser, page } = await start();
  // Amanhã em Brasília, para a reunião aparecer em "Próximas".
  const tomorrow = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + 86_400_000));
  const [year, month, day] = tomorrow.split("-");

  try {
    await login(page);

    await step(page, "Agendar diagnóstico pela ficha", async () => {
      await open(page, `/experts/${lead.id}`);
      await page.getByLabel("Data", { exact: true }).fill(tomorrow);
      await page.getByLabel("Hora (Brasília)", { exact: true }).fill("15:30");
      await page.getByLabel("Link da chamada", { exact: true }).fill("https://meet.google.com/e2e-test");
      await page.getByRole("button", { name: "Agendar diagnóstico" }).click();
      // A confirmação é a reunião na lista (o formulário recolhe ao atualizar).
      await page.getByRole("list", { name: "Reuniões do lead" }).getByText(`${day}/${month}/${year}, 15:30`, { exact: false }).waitFor();
      await page.getByText(`Diagnóstico agendado para ${day}/${month}/${year}, 15:30 com Teste Automatizado.`).filter(visible).waitFor();
      expect((await stageKey()) === "meeting_scheduled", "lead deveria ir para Diagnóstico agendado");
    });

    await step(page, "Link inválido é recusado", async () => {
      // Com uma reunião já agendada, o formulário fica recolhido.
      await page.getByText("Agendar diagnóstico", { exact: true }).filter(visible).click();
      await page.getByLabel("Link da chamada", { exact: true }).fill("meet sem link");
      await page.getByRole("button", { name: "Agendar diagnóstico" }).click();
      await page.getByText("Link da chamada inválido (use http:// ou https://).").filter(visible).waitFor();
      await page.getByLabel("Link da chamada", { exact: true }).fill("javascript:alert(1)");
      await page.getByRole("button", { name: "Agendar diagnóstico" }).click();
      await page.getByText("Link da chamada inválido (use http:// ou https://).").filter(visible).waitFor();
    });

    await step(page, "Agenda mostra a reunião em Próximas", async () => {
      await open(page, "/agenda");
      const upcoming = page.getByRole("region", { name: "Próximas" });
      await upcoming.getByRole("link", { name: `${day}/${month}/${year}, 15:30 · Agenda UI E2E` }).waitFor();
      await upcoming.getByRole("link", { name: "Entrar na chamada" }).waitFor();
    });

    await step(page, "Diagnóstico salvo e mantido ao recarregar", async () => {
      await page.getByRole("link", { name: /Agenda UI E2E/ }).filter(visible).click();
      await page.waitForURL(/\/agenda\/[0-9a-f-]{36}$/);
      await page.waitForLoadState("networkidle");
      await page.getByText("Roteiro da reunião de diagnóstico", { exact: true }).waitFor();
      await page.getByLabel("Audiência", { exact: true }).fill("Mulheres de 25 a 40 anos no Instagram");
      await page.getByLabel("Ideia de app", { exact: true }).fill("App de treinos em casa");
      await page.getByRole("combobox", { name: "Plano de interesse" }).click();
      await page.getByRole("option", { name: "Setup 7k" }).click();
      await page.getByRole("button", { name: "Salvar diagnóstico" }).click();
      await page.getByText("Diagnóstico salvo.").waitFor();
      await open(page, page.url());
      expect((await page.getByLabel("Ideia de app", { exact: true }).inputValue()) === "App de treinos em casa", "ideia de app não ficou salva");
      await page.getByRole("combobox", { name: "Plano de interesse" }).getByText("Setup 7k").waitFor();
    });

    await step(page, "Reagendar a reunião", async () => {
      await page.getByLabel("Hora (Brasília)", { exact: true }).fill("17:00");
      await page.getByRole("button", { name: "Reagendar" }).click();
      await page.getByText("Reunião reagendada.").waitFor();
      await page.getByText(`${day}/${month}/${year}, 17:00 · com Teste Automatizado`).waitFor();
    });

    await step(page, "Marcar como realizada move o lead", async () => {
      await page.getByRole("button", { name: "Marcar como realizada" }).click();
      await page.getByText("Realizada", { exact: true }).filter(visible).waitFor();
      expect((await stageKey()) === "meeting_done", "lead deveria ir para Diagnóstico realizado");
      await open(page, "/agenda");
      await page.getByRole("region", { name: "Anteriores (últimos 30 dias)" }).getByText("Agenda UI E2E", { exact: false }).waitFor();
    });
  } finally {
    await browser.close();
    await sql.end();
  }
  process.exit(report() ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
