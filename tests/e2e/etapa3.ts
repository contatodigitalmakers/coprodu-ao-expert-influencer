// Testes de tela da Etapa 1 (login) e Etapa 3 (experts).
// Uso: npx tsx --env-file=.env.local tests/e2e/etapa3.ts
import { BASE_URL, choose, createRunner, credentials, expect, login, open } from "./helpers";

async function main() {
  const { start, step, report } = createRunner("etapa3");
  const { browser, page } = await start();

  try {
    await step(page, "Sem login, / redireciona para /login", async () => {
      await open(page, `${BASE_URL}/experts`);
      await page.waitForURL(`${BASE_URL}/login`);
    });

    await step(page, "Senha errada mostra mensagem", async () => {
      await page.getByLabel("E-mail", { exact: true }).filter({ visible: true }).fill(credentials.email);
      await page.getByLabel("Senha", { exact: true }).filter({ visible: true }).fill("senha-errada");
      await page.getByRole("button", { name: "Entrar" }).filter({ visible: true }).click();
      await page.getByText("E-mail ou senha incorretos.").filter({ visible: true }).waitFor();
    });

    await step(page, "Login certo mostra Olá e o menu", async () => {
      await login(page);
      await page.getByRole("heading", { name: "Olá, Teste!" }).filter({ visible: true }).waitFor();
      await page.getByRole("link", { name: "Experts" }).filter({ visible: true }).waitFor();
    });

    await step(page, "Lista vazia mostra mensagem", async () => {
      await page.getByRole("link", { name: "Experts" }).filter({ visible: true }).click();
      await page.waitForLoadState("networkidle");
      await page.getByText("Nenhum expert cadastrado ainda").filter({ visible: true }).waitFor();
    });

    let expertUrl = "";
    await step(page, "Cadastro de expert com tag nova", async () => {
      await page.getByRole("link", { name: "Novo expert" }).filter({ visible: true }).click();
      await page.waitForURL(/novo$/);
      await page.waitForLoadState("networkidle");
      await page.getByLabel("Nome *", { exact: true }).filter({ visible: true }).fill("Fulana Teste E2E");
      await page.getByLabel("@ principal *", { exact: true }).filter({ visible: true }).fill("@Fulana.E2E");
      await choose(page, "Nicho", "Nutrição");
      await page.getByLabel("Seguidores", { exact: true }).filter({ visible: true }).fill("12,5 mil");
      await page.getByLabel("Engajamento (%)", { exact: true }).filter({ visible: true }).fill("3,5");
      await page.getByLabel("WhatsApp", { exact: true }).filter({ visible: true }).fill("(11) 99999-8888");
      await page.getByRole("button", { name: "Tag" }).filter({ visible: true }).click();
      await page.getByPlaceholder("Buscar ou criar tag").filter({ visible: true }).fill("teste-e2e");
      await page.getByRole("option", { name: "Criar “teste-e2e”" }).filter({ visible: true }).click();
      await page.keyboard.press("Escape");
      await page.getByRole("radio", { name: "Sim" }).filter({ visible: true }).first().click();
      await page.getByRole("button", { name: "Cadastrar expert" }).filter({ visible: true }).click();
      await page.waitForURL(/\/experts\/[0-9a-f-]{36}$/);
      expertUrl = page.url();
      await page.waitForLoadState("networkidle");
      await page.getByRole("heading", { name: "Fulana Teste E2E" }).filter({ visible: true }).waitFor();
      await page.getByText("@fulana.e2e · Instagram").filter({ visible: true }).waitFor();
      await page.getByText("12,5 mil").filter({ visible: true }).waitFor();
      await page.getByText("+55 11 99999-8888").filter({ visible: true }).waitFor();
      await page.getByText('Lead cadastrado na etapa "Novo lead".').filter({ visible: true }).waitFor();
      await page.getByText("teste-e2e").filter({ visible: true }).first().waitFor();
    });

    await step(page, "Aviso e bloqueio de @ repetido", async () => {
      await open(page, `${BASE_URL}/experts/novo`);
      await page.getByLabel("Nome *", { exact: true }).filter({ visible: true }).fill("Outra E2E");
      await page.getByLabel("@ principal *", { exact: true }).filter({ visible: true }).fill("FULANA.E2E");
      await page.getByLabel("Link do perfil", { exact: true }).filter({ visible: true }).click(); // sai do campo @
      await page.getByText("Já existe um lead com esse @ nesta plataforma:").filter({ visible: true }).waitFor();
      await page.getByRole("button", { name: "Cadastrar expert" }).filter({ visible: true }).click();
      await page.getByText("Corrija os campos destacados.").filter({ visible: true }).waitFor();
      expect(page.url().endsWith("/experts/novo"), "não deveria sair da página");
      const nameValue = await page.getByLabel("Nome *", { exact: true }).filter({ visible: true }).inputValue();
      expect(nameValue === "Outra E2E", `campo Nome perdeu o valor: "${nameValue}"`);
    });

    await step(page, "Validação de campos inválidos", async () => {
      await page.getByLabel("@ principal *", { exact: true }).filter({ visible: true }).fill("outra.e2e");
      await page.getByLabel("Seguidores", { exact: true }).filter({ visible: true }).fill("muitos");
      await page.getByLabel("E-mail", { exact: true }).filter({ visible: true }).fill("email-invalido");
      await page.getByRole("button", { name: "Cadastrar expert" }).filter({ visible: true }).click();
      await page.getByText("Número de seguidores inválido.").filter({ visible: true }).waitFor();
      await page.getByText("E-mail inválido.").filter({ visible: true }).waitFor();
    });

    await step(page, "Edição salva e volta para a ficha", async () => {
      await open(page, `${expertUrl}/editar`);
      await page.getByLabel("Cidade", { exact: true }).filter({ visible: true }).fill("Campinas");
      await page.getByRole("button", { name: "Salvar alterações" }).filter({ visible: true }).click();
      await page.waitForURL(expertUrl);
      await page.waitForLoadState("networkidle");
      await page.getByText("Campinas").filter({ visible: true }).waitFor();
    });

    await step(page, "Registrar interação aparece na linha do tempo", async () => {
      await choose(page, "Tipo", "DM");
      await page.getByPlaceholder(/O que aconteceu/).filter({ visible: true }).fill("Mandei DM de teste E2E");
      await page.getByRole("button", { name: "Registrar interação" }).filter({ visible: true }).click();
      await page.getByText("Mandei DM de teste E2E").filter({ visible: true }).waitFor();
      const value = await page.getByPlaceholder(/O que aconteceu/).filter({ visible: true }).inputValue();
      expect(value === "", "texto deveria ser limpo após salvar");
    });

    await step(page, "Importação CSV: prévia 100/3/2 e importação", async () => {
      await open(page, `${BASE_URL}/experts/importar`);
      await page.locator('input[type="file"]').setInputFiles("tests/fixtures/teste-importacao-105-linhas.csv");
      await page.getByText("105 linha(s)").filter({ visible: true }).waitFor();
      await page.getByRole("button", { name: "Analisar planilha" }).filter({ visible: true }).click();
      await page.getByText("3. Confira antes de importar").filter({ visible: true }).waitFor();
      const stat = async (label: string) =>
        (await page.getByText(label, { exact: true }).filter({ visible: true }).locator("xpath=..").innerText()).split("\n")[0];
      const ready = await stat("Serão criados");
      const repeated = await stat("Repetidos na planilha");
      const withError = await stat("Com erro");
      expect(ready === "100" && repeated === "3" && withError === "2", `prévia: ${ready}/${repeated}/${withError}`);
      await page.getByText("Yoga").filter({ visible: true }).waitFor();
      await page.getByRole("button", { name: "Importar 100 lead(s)" }).filter({ visible: true }).click();
      await page.getByText("Importação concluída").filter({ visible: true }).waitFor();
      return `${ready} criados, ${repeated} repetidos, ${withError} com erro`;
    });

    await step(page, "Reimportação: nada duplicado", async () => {
      await page.getByRole("button", { name: "Importar outra planilha" }).filter({ visible: true }).click();
      await page.getByText("1. Envie a planilha").filter({ visible: true }).waitFor();
      await page.locator('input[type="file"]').setInputFiles("tests/fixtures/teste-importacao-105-linhas.csv");
      await page.getByRole("button", { name: "Analisar planilha" }).filter({ visible: true }).click();
      await page.getByText("3. Confira antes de importar").filter({ visible: true }).waitFor();
      await page.getByRole("button", { name: "Importar 0 lead(s)" }).filter({ visible: true }).waitFor();
      const already = (await page.getByText("Já cadastrados", { exact: true }).filter({ visible: true }).locator("xpath=..").innerText()).split("\n")[0];
      expect(already === "100", `já cadastrados: ${already}`);
    });

    await step(page, "Lista paginada com 101 experts", async () => {
      await open(page, `${BASE_URL}/experts`);
      await page.getByText("1–50 de 101 experts").filter({ visible: true }).waitFor();
      await page.getByRole("link", { name: "Próxima" }).filter({ visible: true }).click();
      await page.getByText("51–100 de 101 experts").filter({ visible: true }).waitFor();
    });

    await step(page, "Busca por @", async () => {
      await open(page, `${BASE_URL}/experts`);
      await page.getByPlaceholder("Buscar por nome ou @").filter({ visible: true }).fill("@teste.expert007");
      await page.waitForURL(/busca=/);
      await page.getByText("1–1 de 1 experts").filter({ visible: true }).waitFor();
      await page.getByRole("link", { name: "Expert Teste 007" }).filter({ visible: true }).waitFor();
    });

    await step(page, "Filtro por nicho e tag", async () => {
      await open(page, `${BASE_URL}/experts`);
      await choose(page, "Nicho", "Yoga");
      await page.waitForURL(/nicho=/);
      await page.getByText("1–10 de 10 experts").filter({ visible: true }).waitFor();
      await choose(page, "Tag", "quente");
      await page.waitForURL(/tag=/);
      const text = await page.getByText(/de \d+ experts/).filter({ visible: true }).innerText();
      await page.getByRole("button", { name: "Limpar filtros" }).filter({ visible: true }).click();
      await page.getByText("1–50 de 101 experts").filter({ visible: true }).waitFor();
      return `Yoga + quente: ${text}`;
    });

    await step(page, "Filtros de responsável e seguidores", async () => {
      await choose(page, "Responsável", "Meus leads");
      await page.waitForURL(/responsavel=meus/);
      await page.getByText("1–50 de 101 experts").filter({ visible: true }).waitFor(); // importados ficaram com quem importou
      await choose(page, "Responsável", "Não atribuídos");
      await page.getByText("Nenhum expert encontrado com esses filtros.").filter({ visible: true }).waitFor();
      await choose(page, "Responsável", "Todos os responsáveis");
      await choose(page, "Seguidores", "Mais de 1 milhão");
      await page.waitForURL(/seguidores=1m-mais/);
      return await page.getByText(/de \d+ experts/).filter({ visible: true }).innerText();
    });

    await step(page, "Exclusão lógica pelo admin", async () => {
      await open(page, expertUrl);
      await page.getByRole("button", { name: "Excluir" }).filter({ visible: true }).click();
      await page.getByRole("alertdialog").filter({ visible: true }).getByRole("button", { name: "Excluir" }).click();
      await page.waitForURL(`${BASE_URL}/experts`);
      await page.getByText("1–50 de 100 experts").filter({ visible: true }).waitFor();
      await open(page, expertUrl);
      await page.getByText(/404|não encontrad/i).filter({ visible: true }).first().waitFor();
    });
  } finally {
    await browser.close();
  }
  process.exit(report() ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
