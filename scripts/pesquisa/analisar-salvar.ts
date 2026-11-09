// /analisar, passo final: grava a análise dos leads (só preenche campos vazios).
// Uso: npm run analisar-salvar -- tmp/pesquisa/analise-<data>.json [--simular]
//   --simular    valida e mostra o relatório sem gravar nada
import { readFileSync } from "node:fs";
import { z } from "zod";
import { runAsUser } from "@/db";
import { saveAnalyses, type AnalysisReport } from "@/lib/research/analysis";
import { readSearchLog } from "@/lib/research/search-log";
import { fail, loadConfig, researchUserClaims } from "./shared";

class Simulation extends Error {
  constructor(readonly report: AnalysisReport) {
    super("simulação");
  }
}

const fileSchema = z.object({ analise: z.string().default(""), leads: z.array(z.unknown()) });

function readFile(file: string) {
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
  const parsed = fileSchema.safeParse(json);
  if (!parsed.success) throw new Error('O arquivo precisa ter o formato { "analise": "...", "leads": [ ... ] }.');
  return parsed.data;
}

function print(report: AnalysisReport, simulate: boolean) {
  const appUrl = process.env.PESQUISA_APP_URL ?? "http://localhost:3000";
  console.log(simulate ? "SIMULAÇÃO (nada foi gravado)" : "ANÁLISE GRAVADA");
  console.log(
    `Leads recebidos: ${report.received} · ${simulate ? "seriam atualizados" : "atualizados"}: ${report.updated.length} · sem dados públicos: ${report.notFound.length} · descartados: ${report.discarded.length}`,
  );
  if (report.updated.length) {
    console.log(simulate ? "\nSeriam atualizados:" : "\nAtualizados:");
    for (const lead of report.updated) {
      console.log(`- ${lead.name} (${lead.filled.join(", ")}) → ${appUrl}/experts/${lead.id}`);
    }
  }
  if (report.notFound.length) {
    console.log("\nSem dados públicos (saíram da fila, preencher à mão):");
    for (const lead of report.notFound) console.log(`- ${lead.name} → ${appUrl}/experts/${lead.id}`);
  }
  if (report.discarded.length) {
    console.log("\nDescartados (continuam na fila):");
    for (const item of report.discarded) console.log(`- ${item.label}: ${item.reason}`);
  }
  if (report.warnings.length) {
    console.log("\nAvisos:");
    for (const warning of report.warnings) console.log(`- ${warning}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const simulate = args.includes("--simular");
  const file = args.find((arg) => !arg.startsWith("--"));
  if (!file) throw new Error("Informe o arquivo da análise: npm run analisar-salvar -- tmp/pesquisa/analise-<data>.json");

  const data = readFile(file);
  const config = loadConfig();
  const searchKeys = readSearchLog();
  const { userId, claims } = await researchUserClaims();

  try {
    const report = await runAsUser(claims, async (tx) => {
      const result = await saveAnalyses(tx, data.leads, { config, userId, searchKeys });
      if (simulate) throw new Simulation(result); // desfaz a transação
      return result;
    });
    print(report, false);
  } catch (error) {
    if (error instanceof Simulation) print(error.report, true);
    else throw error;
  }
}

main().then(() => process.exit(0), fail);
