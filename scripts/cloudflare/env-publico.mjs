// Roda depois do `opennextjs-cloudflare build` (ver "preview" e "deploy" no package.json).
// O adaptador copia TODOS os arquivos .env* para .open-next/cloudflare/next-env.mjs,
// que vai junto com o código para a Cloudflare: isso incluiria a senha do banco.
// Este script deixa no arquivo só as variáveis NEXT_PUBLIC_, que são públicas e
// já vão no código do navegador. Os segredos (DATABASE_URL) ficam na Cloudflare,
// com `wrangler secret put`, e no .dev.vars para o `npm run preview`.
import { existsSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const file = ".open-next/cloudflare/next-env.mjs";
if (!existsSync(file)) {
  console.error(`Não encontrei ${file}. Rode antes: npx opennextjs-cloudflare build`);
  process.exit(1);
}

const modes = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
const removed = new Set();
const content = Object.entries(modes)
  .map(([mode, vars]) => {
    const kept = Object.fromEntries(
      Object.entries(vars).filter(([key]) => {
        if (key.startsWith("NEXT_PUBLIC_")) return true;
        removed.add(key);
        return false;
      }),
    );
    return `export const ${mode} = ${JSON.stringify(kept)};\n`;
  })
  .join("");
writeFileSync(file, content);
console.log(
  removed.size
    ? `Variáveis retiradas do pacote da Cloudflare: ${[...removed].join(", ")}.`
    : "Nenhuma variável secreta no pacote da Cloudflare.",
);
