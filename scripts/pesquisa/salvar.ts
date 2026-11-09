// /pesquisa, passo final: grava os candidatos de uma rodada.
// Uso: npm run pesquisa-salvar -- tmp/pesquisa/<rodada>.json [--simular] [--quantidade N]
//   --simular    valida e mostra o relatório sem gravar nada
//   --quantidade limita a rodada (padrão: quantidade_por_rodada do config)
import { readFileSync } from "node:fs";
import { runAsUser } from "@/db";
import { roundFileSchema } from "@/lib/research/candidate";
import { saveResearch, type ResearchReport } from "@/lib/research/save";
import { readSearchLog } from "@/lib/research/search-log";
import { fail, loadConfig, researchUserClaims } from "./shared";

class Simulation extends Error {
  constructor(readonly report: ResearchReport) {
    super("simulação");
  }
}

function print(report: ResearchReport, simulate: boolean) {
  const appUrl = process.env.PESQUISA_APP_URL ?? "http://localhost:3000";
  console.log(simulate ? "SIMULAÇÃO (nada foi gravado)" : "RODADA GRAVADA");
  console.log(`Candidatos recebidos: ${report.received} · ${simulate ? "seriam criados" : "criados"}: ${report.created.length} · descartados: ${report.discarded.length}`);
  if (report.created.length) {
    console.log(simulate ? "\nSeriam criados:" : "\nCriados:");
    for (const lead of report.created) {
      console.log(`- ${lead.name} (@${lead.handle} · ${lead.platform})${simulate ? "" : ` → ${appUrl}/experts/${lead.id}`}`);
    }
  }
  if (report.discarded.length) {
    console.log("\nDescartados:");
    for (const item of report.discarded) console.log(`- ${item.label}: ${item.reason}`);
  }
  if (report.warnings.length) {
    console.log("\nAvisos:");
    for (const warning of report.warnings) console.log(`- ${warning}`);
  }
  if (!simulate && report.tagId) console.log(`\nLista para revisar: ${appUrl}/experts?tag=${report.tagId}&responsavel=sem`);
}

function readRound(file: string) {
  let content: string;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    throw new Error(`Arquivo não encontrado: ${file}`);
  }
  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch (error) {
    throw new Error(`O arquivo não é um JSON válido (${error instanceof Error ? error.message : error}).`);
  }
  const round = roundFileSchema.safeParse(json);
  if (!round.success) throw new Error('O arquivo precisa ter o formato { "rodada": "...", "candidatos": [ ... ] }.');
  return round.data;
}

async function main() {
  const args = process.argv.slice(2);
  const simulate = args.includes("--simular");
  const quantityIndex = args.indexOf("--quantidade");
  let limit: number | undefined;
  if (quantityIndex >= 0) {
    limit = Number(args[quantityIndex + 1]);
    if (!Number.isInteger(limit) || limit < 1) throw new Error("--quantidade precisa de um número inteiro maior que zero.");
  }
  const file = args.find((arg, index) => !arg.startsWith("--") && (quantityIndex < 0 || index !== quantityIndex + 1));
  if (!file) throw new Error("Informe o arquivo da rodada: npm run pesquisa-salvar -- tmp/pesquisa/<rodada>.json");

  const round = readRound(file);
  const config = loadConfig();
  const searchKeys = readSearchLog();
  const { userId, claims } = await researchUserClaims();

  try {
    const report = await runAsUser(claims, async (tx) => {
      const result = await saveResearch(tx, round.candidatos, {
        config,
        userId,
        searchKeys,
        limit,
      });
      if (simulate) throw new Simulation(result); // desfaz a transação
      return result;
    });
    print(report, false);
  } catch (error) {
    if (!(error instanceof Simulation)) throw error;
    print(error.report, true);
  }
  process.exit(0);
}

main().catch(fail);
