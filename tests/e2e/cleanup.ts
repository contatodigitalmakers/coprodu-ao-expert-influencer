// Apaga os dados criados pelos testes (leads de teste, suas atividades,
// tarefas, reuniões, propostas, projetos e as tags/nicho de teste).
// Uso: npx tsx --env-file=.env.local tests/e2e/cleanup.ts
import postgres from "postgres";

const TEST_HANDLES = ["teste.expert%", "%.e2e", "e2e.%"];
const TEST_TAGS = ["teste-importacao", "quente", "teste-e2e"];
const TEST_NICHES = ["Yoga"];

async function main() {
  const sql = postgres(process.env.DATABASE_URL_MIGRATIONS!, { max: 1, onnotice: () => {} });
  try {
    await sql.begin(async (tx) => {
      const experts = await tx`
        select id from public.experts
        where handle like any(${TEST_HANDLES}) or name like '% E2E%'`;
      const ids = experts.map((row) => row.id);
      if (ids.length) {
        await tx`delete from public.projects where expert_id = any(${ids})`;
        await tx`delete from public.proposals where expert_id = any(${ids})`;
        await tx`delete from public.meetings where expert_id = any(${ids})`;
        await tx`delete from public.tasks where expert_id = any(${ids})`;
        await tx`delete from public.cadence_enrollments where expert_id = any(${ids})`;
        await tx`delete from public.activities where expert_id = any(${ids})`;
        await tx`delete from public.experts where id = any(${ids})`;
      }
      await tx`delete from public.tags where name = any(${TEST_TAGS})`;
      await tx`delete from public.niches n where name = any(${TEST_NICHES})
               and not exists (select 1 from public.experts e where e.niche_id = n.id)`;
      // Etapas: desfaz renomeações/limites de teste e remove etapas de teste.
      await tx`update public.stages set name = 'Qualificado', max_days = 3 where key = 'qualified'`;
      await tx`delete from public.stages s where s.key is null and s.name like '%E2E%'
               and not exists (select 1 from public.experts e where e.stage_id = s.id)`;
      console.log(`Limpeza: ${ids.length} lead(s) de teste apagado(s).`);
    });
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
