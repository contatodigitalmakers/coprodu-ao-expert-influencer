// Testes da Etapa 6 (variáveis de template).
// Uso: npx tsx --env-file=.env.local tests/db/etapa6.ts
import { renderTemplate, splitEmailSubject, unknownVariables } from "@/lib/templates/render";

function main() {
  const results: { name: string; pass: boolean; detail: string }[] = [];
  const check = (name: string, pass: boolean, detail = "") => results.push({ name, pass, detail });
  const data = { name: "Ana", niche: "Fitness", handle: "ana.fit", followers: 48000, sdrName: "Joshuan" };

  let out = renderTemplate("Oi, {nome}! Vi seu conteúdo de {nicho} ({@}, {seguidores} seguidores). Abraço, {nome_sdr}", data);
  check(
    "Todas as variáveis preenchidas",
    out.text === "Oi, Ana! Vi seu conteúdo de Fitness (@ana.fit, 48 mil seguidores). Abraço, Joshuan" && out.missing.length === 0,
    out.text,
  );
  out = renderTemplate("{nome}, {nome}!", data);
  check("Variável repetida é trocada em todos os lugares", out.text === "Ana, Ana!", out.text);
  out = renderTemplate("Conteúdo de {nicho} com {seguidores}", { ...data, niche: null, followers: null });
  check("Dado faltando vira vazio e é avisado", out.text === "Conteúdo de  com " && out.missing.join() === "Nicho,Seguidores", JSON.stringify(out));
  check("Variável desconhecida é detectada", unknownVariables("Oi {nomee} e {nome} {xyz}").join() === "{nomee},{xyz}");
  check("Texto sem variáveis não acusa nada", unknownVariables("Oi, tudo bem?").length === 0);
  const email = splitEmailSubject("Assunto: Um app com a sua marca\n\nOi, Ana!");
  check("Assunto do e-mail separado do corpo", email.subject === "Um app com a sua marca" && email.body === "Oi, Ana!", JSON.stringify(email));
  check("E-mail sem assunto mantém o texto", splitEmailSubject("Oi").subject === "");

  for (const r of results) console.log(`${r.pass ? "OK     " : "FALHOU "} ${r.name}${r.detail && !r.pass ? `  (${r.detail})` : ""}`);
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} testes passaram`);
  process.exit(failed ? 1 : 0);
}

main();
