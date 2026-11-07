// Utilitários dos testes de tela. O app precisa estar rodando em BASE_URL
// (padrão http://localhost:3000): npm run dev
import { mkdirSync, readFileSync } from "node:fs";
import { chromium, type Page } from "playwright-core";

export const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
export const credentials = JSON.parse(readFileSync("tmp/e2e/test-user.json", "utf8")) as {
  id: string;
  email: string;
  password: string;
};

type Result = { name: string; pass: boolean; detail: string };

export function createRunner(suite: string) {
  const results: Result[] = [];
  const pageErrors: string[] = [];
  mkdirSync("tmp/e2e/screens", { recursive: true });

  async function start() {
    const browser = await chromium.launch({ channel: "chrome", headless: true });
    const context = await browser.newContext({ locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
    context.setDefaultTimeout(15_000);
    const page = await context.newPage();
    page.on("pageerror", (error) => pageErrors.push(`${page.url()}: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") pageErrors.push(`${page.url()}: ${message.text()}`);
    });
    return { browser, context, page };
  }

  // Executa um passo; se falhar, registra e tira um print.
  async function step(page: Page, name: string, fn: () => Promise<string | void>) {
    try {
      const detail = await fn();
      results.push({ name, pass: true, detail: detail ?? "" });
    } catch (error) {
      const file = `tmp/e2e/screens/${suite}-${results.length + 1}.png`;
      await page.screenshot({ path: file, fullPage: true }).catch(() => {});
      results.push({ name, pass: false, detail: `${(error as Error).message.split("\n")[0]} [print: ${file}]` });
    }
  }

  function report() {
    for (const r of results) {
      console.log(`${r.pass ? "OK     " : "FALHOU "} ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
    }
    const ignored = /Download the React DevTools|\[HMR\]|\[Fast Refresh\]/;
    const errors = pageErrors.filter((error) => !ignored.test(error));
    if (errors.length) {
      console.log(`\nErros no navegador (${errors.length}):`);
      for (const error of [...new Set(errors)].slice(0, 15)) console.log("  - " + error.slice(0, 300));
    }
    const failed = results.filter((r) => !r.pass).length;
    console.log(`\n${suite}: ${results.length - failed}/${results.length} passos OK`);
    return failed === 0 && errors.length === 0;
  }

  return { start, step, report, results };
}

// Abre a página e espera o React terminar de carregar (senão cliques se perdem).
export async function open(page: Page, path: string) {
  await page.goto(path.startsWith("http") ? path : `${BASE_URL}${path}`);
  await page.waitForLoadState("networkidle");
}

export async function login(page: Page) {
  await open(page, "/login");
  await page.getByLabel("E-mail").filter({ visible: true }).fill(credentials.email);
  await page.getByLabel("Senha").filter({ visible: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Entrar" }).filter({ visible: true }).click();
  await page.waitForURL(`${BASE_URL}/`);
  await page.waitForLoadState("networkidle");
}

export function expect(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// Escolhe uma opção num Select (Base UI) pelo nome acessível do campo.
export async function choose(page: Page, field: string, option: string) {
  await page.getByRole("combobox", { name: field }).filter({ visible: true }).click();
  await page.getByRole("option", { name: option, exact: true }).filter({ visible: true }).click();
}
