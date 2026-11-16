// Testes de tela das apresentações (gerador, link curto, edição e exclusão).
// Uso: BASE_URL=http://localhost:3200 npx tsx --env-file=.env.local tests/e2e/apresentacoes.ts
import postgres from "postgres";
import { BASE_URL, createRunner, expect, login, open } from "./helpers";

const visible = { visible: true } as const;

async function main() {
  const sql = postgres(process.env.DATABASE_URL_MIGRATIONS!, { max: 1, onnotice: () => {} });
  const [stage] = await sql`select id from public.stages where key = 'new'`;
  const [lead] = await sql`insert into public.experts (name, handle, platform, followers, whatsapp, stage_id)
    values ('Apresentação UI E2E', 'e2e.apresentacaoui', 'instagram', 200000, '5511999990000', ${stage.id}) returning id`;
  const [firstPlan] = await sql`select expert_share, setup_value from public.plans where active order by setup_value limit 1`;
  const row = async () => (await sql`select * from public.presentations where expert_id = ${lead.id} order by created_at desc limit 1`)[0];

  const { start, step, report } = createRunner("apresentacoes");
  const { browser, context, page } = await start({ viewport: { width: 1400, height: 1000 } });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const preview = () => page.frameLocator('iframe[title="Prévia da apresentação"]').first();
  let shortUrl = "";
  let detailUrl = "";

  try {
    await login(page);

    await step(page, "Ficha do lead → Nova apresentação já vem preenchida", async () => {
      await open(page, `/experts/${lead.id}`);
      await page.getByRole("link", { name: "Nova apresentação" }).click();
      await page.waitForURL(/\/apresentacoes\/nova\?lead=/);
      await page.waitForLoadState("networkidle");
      expect((await page.locator("#f-expert").inputValue()) === "Apresentação UI E2E", "nome do expert");
      expect((await page.locator("#f-seguidores").inputValue()) === "200000", "seguidores");
      expect((await page.locator("#f-rede").inputValue()) === "Instagram", "rede");
      const voce = await page.locator("#f-plano1_voce").inputValue();
      expect(voce === String(firstPlan.expert_share), `plano 1 vem do CRM: ${voce}`);
    });

    await step(page, "Prévia ao vivo mostra o nome do lead", async () => {
      await preview().locator('[data-slide="1"] .slide-for').getByText("Para Apresentação UI E2E").waitFor();
      await page.locator("#f-expert").fill("Ana Prévia E2E");
      await preview().locator('[data-slide="1"] .slide-for').getByText("Para Ana Prévia E2E").waitFor();
      await page.getByRole("button", { name: "Próximo slide" }).click();
      await page.getByTestId("preview-count").getByText(/^02 \//).waitFor();
    });

    await step(page, "Campo inválido mostra o erro e não salva", async () => {
      await page.locator("#f-foto").fill("http://inseguro.com/foto.jpg");
      await page.getByText("Use um link https://").filter(visible).waitFor();
      await page.getByRole("button", { name: "Salvar e gerar link" }).click();
      await page.getByRole("alert").getByText('Corrija o campo "Foto do expert".').waitFor();
      await page.locator("#f-foto").fill("");
    });

    await step(page, "Salvar gera o link curto", async () => {
      await page.locator("#f-dor").fill("Todo mês eu começo do zero");
      await page.locator("#f-plano1_caucao").fill("4500");
      await page.getByRole("button", { name: "Salvar e gerar link" }).click();
      await page.waitForURL(/\/apresentacoes\/[0-9a-f-]{36}$/);
      await page.waitForLoadState("networkidle");
      detailUrl = page.url();
      const saved = await row();
      expect(/^[a-z0-9]{8}$/.test(saved.code), `código: ${saved.code}`);
      expect(saved.data.dor === "Todo mês eu começo do zero" && saved.data.plano1_caucao === "4500", JSON.stringify(saved.data));
      await page.getByRole("button", { name: `Copiar link /a/${saved.code}` }).click();
      shortUrl = await page.evaluate(() => navigator.clipboard.readText());
      expect(shortUrl === `${BASE_URL}/a/${saved.code}`, `link copiado: ${shortUrl}`);
      const wa = await page.getByRole("link", { name: "Enviar no WhatsApp do lead" }).getAttribute("href");
      expect(wa?.startsWith("https://wa.me/5511999990000?text=") === true, `whatsapp: ${wa}`);
    });

    await step(page, "Link curto abre sem login e conta a abertura", async () => {
      const anon = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const anonPage = await anon.newPage();
      const response = await anonPage.goto(shortUrl);
      expect(response?.status() === 200, `status ${response?.status()}`);
      expect(response?.headers()["x-frame-options"] === "DENY", "o link público não pode ser embutido");
      await anonPage.locator(".slide.is-active .slide-for").getByText("Para Ana Prévia E2E").waitFor();
      expect((await anonPage.title()).startsWith("O app de Ana Prévia E2E"), await anonPage.title());
      await anonPage.keyboard.press("ArrowRight");
      await anonPage.waitForURL(/#\/02$/);
      await anonPage.goto(`${shortUrl}?modo=apresentador`);
      await anonPage.locator("#presenter").waitFor();
      const video = await anonPage.request.get(`${BASE_URL}/apresentacao/assets/cases/vendas-3.mp4`, { maxRedirects: 0 });
      expect(video.status() === 200, `vídeo sem login: ${video.status()}`);
      await anon.close();
      const saved = await row();
      expect(saved.views === 1, `aberturas: ${saved.views} (a janela do apresentador não conta)`);
    });

    await step(page, "Prévia só abre dentro do CRM", async () => {
      const response = await page.request.get(`${BASE_URL}/apresentacoes/previa`);
      expect(response.headers()["x-frame-options"] === "SAMEORIGIN", `x-frame-options: ${response.headers()["x-frame-options"]}`);
      const anon = await browser.newContext();
      const anonResponse = await anon.request.get(`${BASE_URL}/apresentacoes/previa`, { maxRedirects: 0 });
      expect(anonResponse.status() >= 300 && anonResponse.status() < 400, `sem login: ${anonResponse.status()}`);
      await anon.close();
    });

    await step(page, "Editar mantém o mesmo link", async () => {
      const before = await row();
      await open(page, detailUrl);
      await page.getByText("Aberta 1 vez").filter(visible).waitFor();
      await page.getByRole("link", { name: "Editar" }).filter(visible).click();
      await page.waitForURL(/\/editar$/);
      await page.waitForLoadState("networkidle");
      expect((await page.locator("#f-dor").inputValue()) === "Todo mês eu começo do zero", "dados salvos no formulário");
      await page.locator("#f-nicho").fill("Fitness E2E");
      await page.getByRole("button", { name: "Salvar alterações" }).click();
      await page.waitForURL(detailUrl);
      const after = await row();
      expect(after.code === before.code && after.data.nicho === "Fitness E2E", JSON.stringify({ before: before.code, after: after.code }));
    });

    await step(page, "Ficha e lista mostram a apresentação", async () => {
      await open(page, `/experts/${lead.id}`);
      await page.getByRole("list", { name: "Apresentações do lead" }).getByText("1 abertura").waitFor();
      await page.getByText(/Apresentação criada \(link \/a\//).filter(visible).waitFor();
      await open(page, "/apresentacoes?busca=Ana Prévia");
      await page.getByRole("link", { name: "Ana Prévia E2E" }).filter(visible).waitFor();
    });

    await step(page, "Excluir desativa o link", async () => {
      await open(page, detailUrl);
      await page.getByRole("button", { name: "Excluir" }).filter(visible).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Excluir" }).click();
      await page.waitForURL(`${BASE_URL}/apresentacoes`);
      const anon = await browser.newContext();
      const anonPage = await anon.newPage();
      const response = await anonPage.goto(shortUrl);
      expect(response?.status() === 404, `status ${response?.status()}`);
      await anonPage.getByRole("heading", { name: "Apresentação não encontrada" }).waitFor();
      await anon.close();
    });

    await step(page, "Nova apresentação sem lead: busca o lead", async () => {
      await open(page, "/apresentacoes/nova?busca=e2e.apresentacaoui");
      await page.getByRole("list", { name: "Leads" }).getByRole("link", { name: "Criar apresentação" }).click();
      await page.waitForURL(new RegExp(`/apresentacoes/nova\\?lead=${lead.id}`));
    });
  } finally {
    await browser.close();
    await sql`delete from public.presentations where expert_id = ${lead.id}`;
    await sql`delete from public.activities where expert_id = ${lead.id}`;
    await sql`delete from public.experts where id = ${lead.id}`;
    await sql.end();
  }
  process.exit(report() ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
