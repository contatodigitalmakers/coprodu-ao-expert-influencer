// /pesquisa, passo 2: o que já existe no sistema.
// Uso:
//   npm run pesquisa-existentes                 → configuração e totais
//   npm run pesquisa-existentes -- <links...>   → diz quais perfis são novos
import { count, inArray, sql } from "drizzle-orm";
import { runAsUser } from "@/db";
import { experts, niches } from "@/db/schema";
import { normalizeForCompare } from "@/lib/experts/normalize";
import { profileFromUrl, profileKey } from "@/lib/research/profile-url";
import { fail, loadConfig, researchUserClaims } from "./shared";

async function main() {
  const links = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const config = loadConfig();
  const { claims } = await researchUserClaims();

  await runAsUser(claims, async (tx) => {
    if (!links.length) {
      const nicheRows = await tx.select({ name: niches.name }).from(niches);
      const existing = new Set(nicheRows.map((row) => normalizeForCompare(row.name)));
      const totals = await tx
        .select({ platform: experts.platform, total: count(), active: sql<number>`count(*) filter (where ${experts.deletedAt} is null)::int` })
        .from(experts)
        .groupBy(experts.platform);
      console.log(`Configuração: ${config.quantity} leads por rodada, ${config.followersMin.toLocaleString("pt-BR")} a ${config.followersMax.toLocaleString("pt-BR")} seguidores, plataformas: ${config.platforms.join(", ")}.`);
      console.log("Nichos:");
      for (const niche of config.niches) {
        const status = existing.has(normalizeForCompare(niche.name)) ? "" : " (novo: será criado na primeira gravação)";
        console.log(`- ${niche.name}${status}: ${niche.keywords.join(", ")}`);
      }
      console.log("Perfis já no sistema (ativos / total, incluindo excluídos):");
      for (const row of totals) console.log(`- ${row.platform}: ${row.active} / ${row.total}`);
      if (!totals.length) console.log("- nenhum");
      console.log("Para checar perfis específicos: npm run pesquisa-existentes -- <link1> <link2> ...");
      return;
    }

    const profiles = links.map((link) => ({ link, profile: profileFromUrl(link) }));
    const handles = profiles.flatMap(({ profile }) => (profile ? [profile.handle] : []));
    const known = handles.length
      ? await tx
          .select({ platform: experts.platform, handle: experts.handle, deletedAt: experts.deletedAt })
          .from(experts)
          .where(inArray(sql`lower(${experts.handle})`, handles))
      : [];
    const knownByKey = new Map(known.map((row) => [profileKey(row), row.deletedAt !== null]));
    for (const { link, profile } of profiles) {
      if (!profile) {
        console.log(`INVÁLIDO  ${link} (não é link de perfil)`);
        continue;
      }
      const deleted = knownByKey.get(profileKey(profile));
      const status = deleted === undefined ? "NOVO     " : deleted ? "EXCLUÍDO " : "EXISTE   ";
      console.log(`${status} ${profile.platform}:@${profile.handle}`);
    }
  });
  process.exit(0);
}

main().catch(fail);
