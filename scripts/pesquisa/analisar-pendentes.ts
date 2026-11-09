// /analisar, passo 1: lista os leads cadastrados pelo link que aguardam análise.
// Uso: npm run analisar-pendentes
import { runAsUser } from "@/db";
import { listPendingAnalyses } from "@/lib/research/analysis";
import { fail, loadConfig, researchUserClaims } from "./shared";

async function main() {
  const config = loadConfig();
  const { claims } = await researchUserClaims();
  const pending = await runAsUser(claims, (tx) => listPendingAnalyses(tx));

  console.log(`Nichos da configuração: ${config.niches.map((niche) => niche.name).join(", ")} (outros nichos já cadastrados no sistema também valem).`);
  if (!pending.length) {
    console.log("Nenhum lead aguardando análise.");
    return;
  }
  console.log(`${pending.length} lead(s) aguardando análise:`);
  for (const lead of pending) {
    const filled = [
      lead.name !== `@${lead.handle}` ? `nome: ${lead.name}` : "",
      lead.nicheName ? `nicho: ${lead.nicheName}` : "",
      lead.followers !== null ? `seguidores: ${lead.followers}` : "",
    ].filter(Boolean);
    console.log(`- id ${lead.id} · ${lead.platform} · @${lead.handle} · ${lead.profileUrl ?? "(sem link)"}${filled.length ? ` · já preenchido: ${filled.join(", ")}` : ""}`);
  }
}

main().then(() => process.exit(0), fail);
