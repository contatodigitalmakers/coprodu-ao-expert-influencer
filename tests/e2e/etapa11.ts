// Testes de tela da Etapa 11 (dashboard), com dados conhecidos.
// Uso: BASE_URL=http://localhost:3200 npx tsx --env-file=.env.local tests/e2e/etapa11.ts
import postgres from "postgres";
import { choose, createRunner, credentials, expect, login, open } from "./helpers";


async function main() {
  const sql = postgres(process.env.DATABASE_URL_MIGRATIONS!, { max: 1, onnotice: () => {} });
  const stageRows = await sql`select id, key from public.stages`;
  const stage = (key: string) => stageRows.find((row) => row.key === key)!.id as string;
  const [fitness] = await sql`select id from public.niches where name = 'Fitness'`;
  const [nutricao] = await sql`select id from public.niches where name = 'Nutrição'`;
  const [semInteresse] = await sql`select id from public.loss_reasons where name = 'Sem interesse'`;
  const [plan7k] = await sql`select id from public.plans where name = 'Setup 7k'`;
  const owner = credentials.id;

  // 4 leads do usuário de teste, com históricos diferentes.
  const lead = async (name: string, handle: string, stageKey: string, nicheId: string, lossReasonId: string | null = null) =>
    (await sql`insert into public.experts (name, handle, platform, stage_id, owner_id, niche_id, loss_reason_id)
               values (${name}, ${handle}, 'instagram', ${stage(stageKey)}, ${owner}, ${nicheId}, ${lossReasonId}) returning id`)[0].id as string;
  const l1 = await lead("Dash Ganho E2E", "e2e.dash.1", "won", fitness.id);
  const l2 = await lead("Dash Negociação E2E", "e2e.dash.2", "negotiation", fitness.id);
  const l3 = await lead("Dash Perdido E2E", "e2e.dash.3", "lost", nutricao.id, semInteresse.id);
  const l4 = await lead("Dash Novo E2E", "e2e.dash.4", "new", nutricao.id);
  const path = ["new", "in_cadence", "replied", "qualified", "meeting_scheduled", "meeting_done", "proposal_sent", "negotiation", "won"];
  const history = async (expertId: string, keys: string[]) => {
    for (const key of keys) {
      await sql`insert into public.activities (expert_id, user_id, type, description, metadata)
                values (${expertId}, ${owner}, 'stage_change', 'teste', ${sql.json({ toStageId: stage(key) })})`;
    }
  };
  await history(l1, path);
  await history(l2, path.slice(0, 8));
  await history(l3, ["new", "in_cadence", "lost"]);
  await history(l4, ["new"]);
  // 5 toques (3 DM + 2 WhatsApp).
  for (const type of ["dm", "dm", "dm", "whatsapp", "whatsapp"]) {
    await sql`insert into public.activities (expert_id, user_id, type, description) values (${l2}, ${owner}, ${type}, 'toque')`;
  }
  // Tarefas: 3 enviadas, 1 respondeu, 1 sem resposta → 1 de 5 = 20%.
  for (const outcome of ["sent", "sent", "sent", "replied", "no_response"]) {
    await sql`insert into public.tasks (expert_id, user_id, due_date, channel, status, outcome)
              values (${l2}, ${owner}, current_date, 'dm', 'done', ${outcome})`;
  }
  await sql`insert into public.meetings (expert_id, user_id, scheduled_at, status) values (${l1}, ${owner}, now(), 'done'), (${l2}, ${owner}, now() + interval '1 day', 'scheduled')`;
  const [accepted] = await sql`insert into public.proposals (expert_id, plan_id, setup_value, expert_share, our_share, total, status, sent_at, accepted_at)
                               values (${l1}, ${plan7k.id}, 7000, 70, 30, 7000, 'accepted', now(), now()) returning id`;
  await sql`insert into public.proposals (expert_id, plan_id, setup_value, expert_share, our_share, total, status, sent_at)
            values (${l2}, ${plan7k.id}, 7000, 70, 30, 7000, 'sent', now())`;
  await sql`insert into public.projects (expert_id, proposal_id, setup_paid_at, contract_signed_at) values (${l1}, ${accepted.id}, current_date, current_date)`;

  const { start, step, report } = createRunner("etapa11");
  const { browser, page } = await start({ viewport: { width: 1400, height: 1100 } });
  const stat = async (label: string) =>
    (await page.getByRole("group", { name: label, exact: true }).locator('[data-slot="stat-value"]').innerText()).trim();
  const row = (label: string) => page.getByRole("listitem", { name: new RegExp(`^${label}:`) });

  try {
    await login(page);

    await step(page, "Resultado: setup fechado, contratos e plano mais vendido", async () => {
      await open(page, `/dashboard?responsavel=${owner}`);
      await page.getByTestId("setup-closed").getByText("R$ 7.000,00").waitFor();
      expect((await stat("Contratos ganhos")) === "1", "contratos");
      expect((await stat("Plano mais vendido")) === "Setup 7k", "plano");
    });

    await step(page, "Atividade: leads, toques, taxa de resposta, reuniões, propostas", async () => {
      const read = stat;
      const values = {
        leads: await read("Leads novos"),
        touches: await read("Toques"),
        rate: await read("Taxa de resposta"),
        scheduled: await read("Reuniões agendadas"),
        done: await read("Reuniões realizadas"),
        proposals: await read("Propostas enviadas"),
      };
      expect(
        values.leads === "4" && values.touches === "5" && values.rate === "20%" && values.scheduled === "2" && values.done === "1" && values.proposals === "2",
        JSON.stringify(values),
      );
    });

    await step(page, "Funil com conversão entre etapas", async () => {
      await row("Novo lead").filter({ hasText: "4" }).waitFor();
      const inCadence = await row("Em cadência").getAttribute("aria-label");
      const won = await row("Ganho").getAttribute("aria-label");
      expect(inCadence === "Em cadência: 3 (75% da anterior)", `em cadência: ${inCadence}`);
      expect(won === "Ganho: 1 (50% da anterior)", `ganho: ${won}`);
    });

    await step(page, "Motivos de perda e toques por dia", async () => {
      const loss = await row("Sem interesse").getAttribute("aria-label");
      expect(loss === "Sem interesse: 1", `perda: ${loss}`);
      const today = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(new Date());
      await page.getByLabel(`${today}: 5 toques`, { exact: true }).waitFor();
    });

    await step(page, "Dica aparece no foco (teclado) e tabela equivalente existe", async () => {
      await row("Em cadência").focus();
      await page.getByRole("tooltip").getByText("75% da anterior").waitFor();
      await page.getByText("Ver dados em tabela").first().click();
      await page.getByRole("cell", { name: "75% da anterior" }).waitFor();
      await page.screenshot({ path: "tmp/e2e/screens/dashboard.png", fullPage: true });
    });

    await step(page, "Filtro de nicho afeta todos os números", async () => {
      await choose(page, "Nicho", "Fitness");
      await page.waitForURL(/nicho=/);
      await page.getByRole("group", { name: "Leads novos", exact: true }).getByText("2", { exact: true }).waitFor();
      const won = await row("Ganho").getAttribute("aria-label");
      expect(won === "Ganho: 1 (50% da anterior)", `ganho com Fitness: ${won}`);
      expect((await page.getByText("Sem dados no período e filtros escolhidos.").count()) === 1, "motivos de perda deveriam ficar vazios");
    });

    await step(page, "Período e filtros juntos (7 dias + SDR)", async () => {
      await choose(page, "Período", "Últimos 7 dias");
      await page.waitForURL(/periodo=7d/);
      expect(page.url().includes(`responsavel=${owner}`) && page.url().includes("nicho="), `url: ${page.url()}`);
      await page.getByTestId("setup-closed").getByText("R$ 7.000,00").waitFor();
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
