// Hook PostToolUse (WebSearch e WebFetch): registra cada busca e leitura de
// página em tmp/pesquisa/buscas.jsonl. O /pesquisa usa esse registro para
// provar que o perfil de cada lead apareceu de fato numa busca (a IA não
// consegue "inventar" um @ que passe nessa checagem).
// Ativado em .claude/settings.json (hooks.PostToolUse, matcher "WebSearch|WebFetch").
// Nunca falha: um erro aqui não pode atrapalhar a ferramenta.
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const event = JSON.parse(input);
    const dir = join(process.env.CLAUDE_PROJECT_DIR ?? event.cwd ?? ".", "tmp", "pesquisa");
    mkdirSync(dir, { recursive: true });
    const line = {
      data: new Date().toISOString(),
      ferramenta: event.tool_name,
      entrada: event.tool_input,
      resposta: event.tool_response,
    };
    appendFileSync(join(dir, "buscas.jsonl"), JSON.stringify(line) + "\n");
  } catch {
    // sem registro desta vez
  }
  process.exit(0);
});
