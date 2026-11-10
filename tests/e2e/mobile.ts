// Telas no tamanho de celular: sem rolagem horizontal, menu em gaveta e menu reduzido no computador.
// Uso: BASE_URL=http://localhost:3200 npx tsx --env-file=.env.local tests/e2e/mobile.ts
import { BASE_URL, createRunner, expect, login, open } from "./helpers";

async function main() {
  const { start, step, report } = createRunner("mobile");
  const { browser, page } = await start({ viewport: { width: 390, height: 844 } });
  const overflow = () =>
    page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      const wide = [...document.querySelectorAll<HTMLElement>("body *")]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.right > width + 1 && !el.closest("[data-allow-scroll]") && getComputedStyle(el).position !== "fixed";
        })
        .slice(0, 3)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)}`);
      return { scroll: document.documentElement.scrollWidth - width, wide };
    });

  try {
    await login(page);
    const routes = ["/", "/experts", "/experts/novo", "/experts/importar", "/pipeline", "/agenda", "/propostas", "/propostas/nova", "/cadencias", "/templates", "/templates/novo", "/dashboard", "/configuracoes"];
    for (const route of routes) {
      await step(page, `Celular ${route}: sem rolagem horizontal`, async () => {
        await open(page, `${BASE_URL}${route}`);
        await page.screenshot({ path: `tmp/e2e/screens/mobile${route.replace(/\//g, "_") || "_home"}.png`, fullPage: true });
        const { scroll, wide } = await overflow();
        expect(scroll <= 1, `página ${scroll}px mais larga que a tela; elementos: ${wide.join(" | ")}`);
      });
    }
    await step(page, "Celular: ficha do expert sem rolagem horizontal", async () => {
      await open(page, `${BASE_URL}/experts`);
      const href = await page.evaluate(
        () => [...document.querySelectorAll("a")].map((a) => a.getAttribute("href") ?? "").find((h) => /^\/experts\/[0-9a-f-]{36}$/.test(h)) ?? "",
      );
      expect(Boolean(href), "nenhuma ficha na lista");
      await open(page, `${BASE_URL}${href}`);
      await page.screenshot({ path: "tmp/e2e/screens/mobile_ficha.png", fullPage: true });
      const { scroll, wide } = await overflow();
      expect(scroll <= 1, `página ${scroll}px mais larga; ${wide.join(" | ")}`);
    });

    await step(page, "Celular: menu abre como gaveta, navega e fecha", async () => {
      await open(page, `${BASE_URL}/`);
      expect((await page.getByRole("link", { name: "Pipeline" }).filter({ visible: true }).count()) === 0, "o menu deveria começar fechado");
      await page.getByRole("button", { name: "Abrir menu" }).click();
      await page.getByRole("link", { name: "Pipeline" }).filter({ visible: true }).waitFor();
      await page.screenshot({ path: "tmp/e2e/screens/mobile_menu_aberto.png" });
      await page.getByRole("link", { name: "Pipeline" }).filter({ visible: true }).click();
      await page.waitForURL(/\/pipeline$/);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      expect((await page.getByRole("link", { name: "Pipeline" }).filter({ visible: true }).count()) === 0, "o menu deveria fechar ao navegar");
    });

    await step(page, "Celular: tocar fora fecha o menu", async () => {
      await page.getByRole("button", { name: "Abrir menu" }).click();
      await page.getByRole("link", { name: "Agenda" }).filter({ visible: true }).waitFor();
      await page.mouse.click(380, 400);
      await page.waitForTimeout(400);
      expect((await page.getByRole("link", { name: "Agenda" }).filter({ visible: true }).count()) === 0, "o menu continua aberto");
    });

    // Computador
    await page.setViewportSize({ width: 1280, height: 800 });
    await step(page, "Computador: menu reduz para só ícones e expande de novo", async () => {
      await open(page, `${BASE_URL}/experts`);
      const aside = page.locator("aside").filter({ visible: true });
      const full = (await aside.boundingBox())!.width;
      expect(full > 200, `largura do menu aberto: ${full}`);
      await page.getByRole("button", { name: "Reduzir menu" }).click();
      await page.waitForTimeout(400);
      const small = (await aside.boundingBox())!.width;
      expect(small < 80, `largura do menu reduzido: ${small}`);
      expect((await page.getByText("Central Comercial", { exact: true }).filter({ visible: true }).count()) === 0, "o título deveria sumir");
      await page.screenshot({ path: "tmp/e2e/screens/desktop_menu_reduzido.png" });
      // os links continuam clicáveis e com nome para leitores de tela
      await page.getByRole("link", { name: "Pipeline" }).filter({ visible: true }).click();
      await page.waitForURL(/\/pipeline$/);
      await page.reload();
      await page.waitForLoadState("networkidle");
      const afterReload = (await page.locator("aside").filter({ visible: true }).boundingBox())!.width;
      expect(afterReload < 80, `o menu reduzido não foi lembrado (${afterReload}px)`);
      await page.getByRole("button", { name: "Expandir menu" }).click();
      await page.waitForTimeout(400);
      const back = (await page.locator("aside").filter({ visible: true }).boundingBox())!.width;
      expect(back > 200, `largura ao expandir: ${back}`);
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
