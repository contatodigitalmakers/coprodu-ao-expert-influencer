// Testes de tela da Etapa 7 (cadências).
// Uso: BASE_URL=http://localhost:3200 npx tsx --env-file=.env.local tests/e2e/etapa7.ts
import postgres from "postgres";
import { choose, createRunner, expect, login, open } from "./helpers";

const visible = { visible: true } as const;

async function main() {
  const sql = postgres(process.env.DATABASE_URL_MIGRATIONS!, { max: 1, onnotice: () => {} });
  const [stageNew] = await sql`select id from public.stages where key = 'new'`;
  const leads = await sql`insert into public.experts ${sql([
    { name: "Cadência UI A E2E", handle: "e2e.cadui.a", platform: "instagram", stage_id: stageNew.id },
    { name: "Cadência UI B E2E", handle: "e2e.cadui.b", platform: "instagram", stage_id: stageNew.id },
  ])} returning id, name`;
  const leadUrl = (name: string) => `/experts/${leads.find((lead) => lead.name === name)!.id}`;

  const { start, step, report } = createRunner("etapa7");
  const { browser, page } = await start();

  try {
    await login(page);

    await step(page, "Lista mostra a cadência padrão com os passos", async () => {
      await open(page, "/cadencias");
      const row = page.getByRole("row").filter({ hasText: "Cadência padrão (12 dias)" });
      await row.getByText("D0, D1, D3, D5, D8, D12").waitFor();
    });

    await step(page, "Cadência sem passos é recusada", async () => {
      await open(page, "/cadencias/nova");
      await page.getByLabel("Nome *", { exact: true }).fill("Cadência E2E");
      await page.getByRole("button", { name: "Criar cadência" }).click();
      await page.getByText("A cadência precisa de pelo menos um passo.").waitFor();
    });

    await step(page, "Criar cadência com passos e templates do canal", async () => {
      await page.getByRole("button", { name: "Adicionar passo" }).click();
      await choose(page, "Canal do passo 1", "WhatsApp");
      await choose(page, "Template do passo 1", "D5 · Contato por WhatsApp");
      await page.getByRole("button", { name: "Adicionar passo" }).click();
      await page.getByLabel("Dia do passo 2", { exact: true }).fill("2");
      await choose(page, "Canal do passo 2", "E-mail");
      // Só templates de e-mail aparecem no passo de e-mail.
      await page.getByRole("combobox", { name: "Template do passo 2" }).click();
      const whatsappOption = await page.getByRole("option", { name: "D5 · Contato por WhatsApp" }).count();
      expect(whatsappOption === 0, "template de WhatsApp não deveria aparecer no passo de e-mail");
      await page.getByRole("option", { name: "D8 · E-mail" }).click();
      await page.getByRole("button", { name: "Criar cadência" }).click();
      await page.waitForURL(/\/cadencias$/);
      await page.getByRole("row").filter({ hasText: "Cadência E2E" }).getByText("D0, D2").waitFor();
    });

    await step(page, "Inscrever lead gera as tarefas e move para Em cadência", async () => {
      await open(page, leadUrl("Cadência UI A E2E"));
      await choose(page, "Cadência", "Cadência padrão (12 dias)");
      await page.getByRole("button", { name: "Inscrever na cadência" }).click();
      const list = page.getByRole("list", { name: "Tarefas da cadência" });
      await list.getByText("Pendente").first().waitFor();
      expect((await list.getByRole("listitem").count()) === 6, "deveria haver 6 tarefas");
      await page.getByText("Ativa", { exact: true }).filter(visible).waitFor();
      await page.getByText("Inscrito na cadência “Cadência padrão (12 dias)” (6 passos).").filter(visible).waitFor();
      await page.getByText('Etapa alterada de "Novo lead" para "Em cadência".').filter(visible).waitFor();
    });

    await step(page, "Mover para Respondeu pausa a cadência", async () => {
      await choose(page, "Mover etapa", "Respondeu");
      await page.getByText("Pausada (lead respondeu)").filter(visible).waitFor();
      const list = page.getByRole("list", { name: "Tarefas da cadência" });
      expect((await list.getByText("Pulada").count()) === 6, "as 6 tarefas deveriam estar puladas");
    });

    await step(page, "Encerrar cadência manualmente", async () => {
      await open(page, leadUrl("Cadência UI B E2E"));
      await choose(page, "Cadência", "Cadência E2E");
      await page.getByRole("button", { name: "Inscrever na cadência" }).click();
      await page.getByRole("button", { name: "Encerrar cadência" }).waitFor();
      await page.getByRole("button", { name: "Encerrar cadência" }).click();
      await page.getByText("Encerrada", { exact: true }).filter(visible).waitFor();
      await page.getByText("Cadência encerrada manualmente.").filter(visible).waitFor();
    });

    await step(page, "Cadência inativa some da inscrição", async () => {
      await open(page, "/cadencias");
      await page.getByRole("link", { name: "Cadência E2E" }).click();
      await page.waitForURL(/\/cadencias\/[0-9a-f-]{36}$/);
      await page.waitForLoadState("networkidle");
      await page.getByLabel("Ativa (aparece para inscrição)").filter(visible).uncheck();
      await page.getByRole("button", { name: "Salvar cadência" }).click();
      await page.waitForURL(/\/cadencias$/);
      await page.getByRole("row").filter({ hasText: "Cadência E2E" }).getByText("Inativa").waitFor();
      await open(page, leadUrl("Cadência UI B E2E"));
      await page.getByRole("combobox", { name: "Cadência" }).click();
      const inactive = await page.getByRole("option", { name: "Cadência E2E" }).count();
      expect(inactive === 0, "cadência inativa não deveria aparecer");
      await page.keyboard.press("Escape");
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
