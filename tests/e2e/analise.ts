// Testes de tela do cadastro pelo link (Novo expert) + análise da IA.
// Uso: npx tsx --env-file=.env.local tests/e2e/analise.ts
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { runAsUser } from "@/db";
import { users } from "@/db/schema";
import { parseResearchConfig } from "@/lib/research/config";
import { saveAnalyses } from "@/lib/research/analysis";
import { BASE_URL, createRunner, credentials, expect, login, open } from "./helpers";

async function main() {
  const { start, step, report } = createRunner("analise");
  const { browser, page } = await start();
  const linkInput = () => page.getByLabel("Link do perfil", { exact: true }).filter({ visible: true });
  const submit = () => page.getByRole("button", { name: "Cadastrar e analisar" }).filter({ visible: true });

  try {
    await login(page);

    await step(page, "Novo expert mostra o cadastro pelo link", async () => {
      await open(page, `${BASE_URL}/experts/novo`);
      await page.getByText("Cadastrar pelo link").filter({ visible: true }).waitFor();
      await page.getByText("ou preencha à mão").filter({ visible: true }).waitFor();
      await page.getByLabel("Nome *", { exact: true }).filter({ visible: true }).waitFor();
    });

    await step(page, "Link de post mostra erro e mantém o texto", async () => {
      await linkInput().fill("https://www.instagram.com/p/abc123/");
      await submit().click();
      await page.getByText("Cole o link de um perfil do Instagram, TikTok ou YouTube").filter({ visible: true }).waitFor();
      expect((await linkInput().inputValue()) === "https://www.instagram.com/p/abc123/", "o campo foi limpo");
    });

    let expertUrl = "";
    await step(page, "Link de perfil cria o lead e abre a ficha com o aviso", async () => {
      await linkInput().fill("https://www.instagram.com/Link.Teste.E2E/?hl=pt-br");
      await submit().click();
      await page.waitForURL(/\/experts\/[0-9a-f-]{36}$/);
      expertUrl = page.url();
      await page.waitForLoadState("networkidle");
      await page.getByRole("heading", { name: "@link.teste.e2e" }).filter({ visible: true }).waitFor();
      await page.getByText("@link.teste.e2e · Instagram").filter({ visible: true }).waitFor();
      await page.getByText("Aguardando a análise da IA.", { exact: true }).filter({ visible: true }).waitFor();
      await page.getByText("analisar-ia").filter({ visible: true }).first().waitFor();
      await page.getByText(/aguardando a análise da IA\.$/).filter({ visible: true }).first().waitFor();
    });

    await step(page, "Novo expert mostra quantos aguardam análise", async () => {
      await open(page, `${BASE_URL}/experts/novo`);
      await page.getByRole("link", { name: /aguardando análise$/ }).filter({ visible: true }).waitFor();
    });

    await step(page, "Mesmo link de novo: erro com o link do lead", async () => {
      await linkInput().fill("instagram.com/link.teste.e2e");
      await submit().click();
      await page.getByText(/Esse perfil já está no sistema/).filter({ visible: true }).waitFor();
      await page.getByRole("link", { name: "Abrir o lead" }).filter({ visible: true }).click();
      await page.waitForURL(expertUrl);
    });

    await step(page, "Depois da análise, a ficha mostra os dados e sai da fila", async () => {
      const expertId = expertUrl.split("/").pop()!;
      const fake = { sub: "00000000-0000-0000-0000-000000000000", role: "authenticated" } as never;
      const [user] = await runAsUser(fake, (tx) => tx.select({ id: users.id }).from(users).where(eq(users.email, credentials.email)));
      const claims = { sub: user.id, role: "authenticated" } as never;
      const config = parseResearchConfig(readFileSync("pesquisa/config.md", "utf8"));
      const result = await runAsUser(claims, (tx) =>
        saveAnalyses(
          tx,
          [{ id: expertId, nome: "Link Teste E2E", nicho: "Nutrição", seguidores: "48K", vendeProduto: "sim", resumo: "Perfil de teste." }],
          { config, userId: user.id, searchKeys: new Set(["instagram:link.teste.e2e"]) },
        ),
      );
      expect(result.updated.length === 1, `análise não gravada: ${JSON.stringify(result)}`);
      await open(page, expertUrl);
      await page.getByRole("heading", { name: "Link Teste E2E" }).filter({ visible: true }).waitFor();
      await page.getByText("48 mil").filter({ visible: true }).first().waitFor();
      await page.getByText(/Perfil analisado pela IA\. Preenchido: nome, nicho, seguidores/).filter({ visible: true }).waitFor();
      expect((await page.getByText("Aguardando a análise da IA.", { exact: true }).filter({ visible: true }).count()) === 0, "o aviso continua na ficha");
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
