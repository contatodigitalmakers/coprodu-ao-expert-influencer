// Testes de tela da Etapa 10 (propostas, página pública e Ganho).
// Uso: BASE_URL=http://localhost:3200 npx tsx --env-file=.env.local tests/e2e/etapa10.ts
import postgres from "postgres";
import { BASE_URL, choose, createRunner, expect, login, open } from "./helpers";

const visible = { visible: true } as const;

async function main() {
  const sql = postgres(process.env.DATABASE_URL_MIGRATIONS!, { max: 1, onnotice: () => {} });
  const [meetingDone] = await sql`select id from public.stages where key = 'meeting_done'`;
  const [lead] = await sql`insert into public.experts (name, handle, platform, stage_id) values ('Proposta UI E2E', 'e2e.propostaui', 'instagram', ${meetingDone.id}) returning id`;
  const stageKey = async () => (await sql`select s.key from public.experts e join public.stages s on s.id = e.stage_id where e.id = ${lead.id}`)[0].key;
  const proposalRow = async () => (await sql`select * from public.proposals where expert_id = ${lead.id}`)[0];

  const { start, step, report } = createRunner("etapa10");
  const { browser, context, page } = await start({ viewport: { width: 1400, height: 1000 } });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  let proposalUrl = "";
  let publicUrl = "";

  try {
    await login(page);

    await step(page, "Gerador: plano 7k + extra calcula o total", async () => {
      await open(page, `/experts/${lead.id}`);
      await page.getByRole("link", { name: "Nova proposta" }).click();
      await page.waitForURL(/\/propostas\/nova\?lead=/);
      await page.waitForLoadState("networkidle");
      await choose(page, "Plano *", "Setup 7k · R$ 7.000,00 · 70/30");
      await page.getByRole("button", { name: "Tráfego" }).click();
      await page.getByLabel("Valor do serviço extra 1", { exact: true }).fill("1.500,00");
      await page.getByTestId("form-total").getByText("R$ 8.500,00").waitFor();
      await page.getByRole("button", { name: "Criar proposta (rascunho)" }).click();
      await page.waitForURL(/\/propostas\/[0-9a-f-]{36}$/);
      await page.waitForLoadState("networkidle");
      proposalUrl = page.url();
      await page.getByText("Rascunho", { exact: true }).filter(visible).waitFor();
    });

    await step(page, "Proposta mostra divisão 70/30 e a regra de recuperação do setup", async () => {
      await page.getByTestId("proposal-split").getByText("70% para você · 30% para nós").waitFor();
      const rule = (await page.getByTestId("proposal-rule").innerText()).replace(/\u00a0/g, " ");
      expect(rule.includes("100% da receita do app até recuperar o valor do setup (R$ 7.000,00)"), `regra: ${rule}`);
      await page.getByTestId("proposal-total").getByText("R$ 8.500,00").waitFor();
    });

    await step(page, "Rascunho não abre na página pública", async () => {
      const token = (await proposalRow()).public_token;
      const anon = await browser.newContext();
      const anonPage = await anon.newPage();
      await anonPage.goto(`${BASE_URL}/p/${token}`);
      await anonPage.getByRole("heading", { name: "Página não encontrada" }).waitFor();
      expect((await anonPage.getByText("Proposta UI E2E").count()) === 0, "o rascunho não pode aparecer");
      await anon.close();
    });

    await step(page, "Editar rascunho: tirar o extra", async () => {
      await page.getByRole("link", { name: "Editar" }).filter(visible).click();
      await page.waitForURL(/\/editar$/);
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Remover serviço extra 1" }).click();
      await page.getByTestId("form-total").getByText("R$ 7.000,00").waitFor();
      await page.getByRole("button", { name: "Salvar rascunho" }).click();
      await page.waitForURL(proposalUrl);
      await page.waitForLoadState("networkidle");
      await page.getByTestId("proposal-total").getByText("R$ 7.000,00").waitFor();
    });

    await step(page, "Marcar como enviada: lead vai para Proposta enviada", async () => {
      await page.getByRole("button", { name: "Marcar como enviada" }).click();
      await page.getByText("Enviada", { exact: true }).filter(visible).waitFor();
      expect((await stageKey()) === "proposal_sent", "lead deveria estar em Proposta enviada");
      await page.getByRole("button", { name: "Copiar link público" }).click();
      publicUrl = await page.evaluate(() => navigator.clipboard.readText());
      expect(publicUrl.startsWith(`${BASE_URL}/p/`), `link: ${publicUrl}`);
    });

    await step(page, "Página pública sem login registra a visualização", async () => {
      const anon = await browser.newContext();
      const anonPage = await anon.newPage();
      await anonPage.goto(publicUrl);
      await anonPage.getByTestId("proposal-split").getByText("70% para você · 30% para nós").waitFor();
      await anonPage.getByRole("button", { name: "Aceitar proposta" }).waitFor();
      const row = await proposalRow();
      expect(row.status === "viewed" && row.viewed_at !== null, `status ${row.status}`);

      // Recusar pede confirmação; aceitar move o lead para Negociação.
      await anonPage.getByRole("button", { name: "Recusar" }).click();
      await anonPage.getByRole("button", { name: "Voltar" }).click();
      await anonPage.getByRole("button", { name: "Aceitar proposta" }).click();
      await anonPage.getByRole("status").getByText(/Proposta aceita em/).waitFor();
      expect((await anonPage.getByRole("button", { name: "Aceitar proposta" }).count()) === 0, "não deveria aceitar de novo");
      await anon.close();
      expect((await proposalRow()).status === "accepted", "proposta deveria estar aceita");
      expect((await stageKey()) === "negotiation", "lead deveria estar em Negociação");
    });

    await step(page, "Equipe vê a proposta aceita e a linha do tempo", async () => {
      await open(page, proposalUrl);
      await page.getByText("Aceita", { exact: true }).filter(visible).waitFor();
      await page.getByText(/Visualizada pelo expert:/).waitFor();
      await open(page, `/experts/${lead.id}`);
      await page.getByText("Proposta aceita pelo expert na página pública.").filter(visible).waitFor();
    });

    await step(page, "Ganho pelo pipeline cria o Projeto \"Aguardando kickoff\"", async () => {
      await choose(page, "Mover etapa", "Ganho");
      const dialog = page.getByRole("dialog");
      await dialog.getByText("Setup 7k · R$ 7.000,00").waitFor();
      await dialog.getByRole("button", { name: "Confirmar Ganho" }).click();
      await page.getByText("Projeto criado com status “Aguardando kickoff”.").filter(visible).waitFor();
      const [project] = await sql`select status from public.projects where expert_id = ${lead.id}`;
      expect(project?.status === "awaiting_kickoff", `projeto: ${JSON.stringify(project)}`);
      expect((await stageKey()) === "won", "lead deveria estar em Ganho");
    });

    await step(page, "Configurações mostram planos e parâmetros", async () => {
      await open(page, "/configuracoes");
      expect((await page.getByLabel("Setup do plano Setup 7k", { exact: true }).inputValue()) === "7000", "setup do 7k");
      await page.getByRole("combobox", { name: "Proposta aceita leva para" }).getByText("Negociação").waitFor();
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
