# Central Comercial (CRM + SDR)

Sistema interno para prospectar experts e vender co-produção de apps.

## Contexto do negócio

A empresa faz co-produção de apps e sistemas com experts (influenciadores de
diversos nichos). Cobra um setup pelo desenvolvimento e depois recebe uma
participação na receita recorrente. A Central Comercial organiza a prospecção
desses experts: do primeiro contato do SDR até o contrato fechado e o setup pago.

**Escopo completo: [docs/escopo.md](docs/escopo.md).** Leia antes de qualquer
etapa. Siga a ordem de implementação da seção 8.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Postgres, Auth, Row Level Security)
- Drizzle ORM (schema, migrations e consultas)
- Deploy na Vercel

@AGENTS.md

## Comandos

- `npm run dev`: servidor local em http://localhost:3000
- `npm run typecheck`, `npm run lint`, `npm run build`: verificações
- `npm run db:generate -- --name=<nome>`: gera migration a partir de `src/db/schema/`
- `npx drizzle-kit generate --custom --name=<nome>`: migration SQL escrita à mão
  (triggers, funções)
- `npm run db:migrate`: aplica as migrations no Supabase (usa `DATABASE_URL_MIGRATIONS`)

## Arquitetura

- **Next.js 16**: o antigo middleware agora é `src/proxy.ts`. O Cache Components
  está ligado, então todo componente que lê sessão ou cookies fica dentro de um
  `<Suspense>`, ou o build falha.
- **Acesso a dados sempre via `queryAsUser()`** ([src/lib/auth.ts](src/lib/auth.ts)):
  ele roda as consultas como o usuário logado, e a RLS vale. A conexão direta em
  [src/db/index.ts](src/db/index.ts) ignora a RLS e por isso não é exportada.
- **RLS**: toda tabela nova define suas políticas no próprio schema, com `pgPolicy`.
- **Server Actions** revalidam a sessão por conta própria. O proxy só faz o
  redirecionamento rápido e não protege dados.
- **Login**: Supabase Auth com e-mail e senha, sem cadastro aberto. O trigger
  `on_auth_user_created` cria a linha em `users` quando um login é criado.
- Schema em `src/db/schema/` (um arquivo por tabela); migrations em `drizzle/`.
- URLs em português (`/login`), pois são vistas pelo usuário; o resto do
  código fica em inglês.

## Regras de desenvolvimento

- Trabalhar **uma etapa da seção 8 por vez**. Antes de cada etapa, apresentar o
  plano e aguardar aprovação. Ao terminar, explicar como testar e aguardar
  confirmação antes de seguir para a próxima.
- Interface 100% em português do Brasil; código, tabelas e colunas em inglês.
- Seguir o modelo de dados da seção 5. Qualquer mudança precisa ser explicada e
  aprovada antes.
- Respeitar as regras de negócio da seção 4. Em especial:
  - Perdido exige motivo; Ganho exige proposta aceita, data de assinatura e
    pagamento do setup confirmado.
  - Toda mudança de etapa, tarefa concluída e proposta gera registro em
    `activities` (com usuário e data).
  - Exclusão de lead é soft delete (`deleted_at`) e restrita ao Admin.
- Permissões por perfil (admin, sdr, closer) aplicadas **no banco via RLS**, não
  só na interface.
- Nunca colocar chaves ou senhas no código nem neste arquivo: usar `.env.local`
  (fora do Git) e manter `.env.example` sem valores reais.
- Ao final de cada etapa, depois que o usuário confirmar o teste, fazer o commit
  direto, sem pedir confirmação.
- Código simples e legível; nada fora do escopo do MVP sem pedido explícito.
- Se algo no escopo estiver ambíguo, perguntar em vez de supor.

## Decisões tomadas

- **2026-11-06 — Sem gestão de usuários por enquanto.** Só os dois sócios usam
  o sistema. Não há convites, tela de usuários nem uso dos perfis SDR/Closer.
  Os logins são criados direto no painel do Supabase. O modelo de dados mantém
  `users.role` e `owner_id` para os perfis entrarem depois sem retrabalho.
  Todo login novo entra como `admin` (definido no trigger).
- **2026-11-06 — RLS sem distinção de perfil por enquanto.** Todas as tabelas
  ficam com RLS ligada e só usuários logados (papel `authenticated`) acessam.
  As políticas por perfil (ex.: SDR vê só os seus leads) entram quando houver
  SDRs e Closers.

## Progresso (seção 8)

- [x] 1. Setup do projeto + login (concluída em 2026-11-06)
- [ ] 2. Banco: tabelas, migrations e seed
- [ ] 3. Experts
- [ ] 4. Score
- [ ] 5. Pipeline
- [ ] 6. Templates
- [ ] 7. Cadências
- [ ] 8. Fila do dia
- [ ] 9. Agenda e diagnóstico
- [ ] 10. Propostas
- [ ] 11. Dashboard
- [ ] 12. Revisão de permissões (RLS), segurança e deploy
