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
- **Schema** em `src/db/schema/`, um arquivo por área:
  - `enums.ts`: valores fixos;
  - `common.ts`: `id()`, `timestamps`, `deletedAt()` e `authenticatedCan()`, para as políticas de RLS;
  - `catalog.ts`: cadastros e `settings`;
  - `experts.ts`: experts, tags e activities;
  - `cadences.ts`: cadências e tarefas;
  - `deals.ts`: reuniões, propostas e projetos.
- **Migrations** em `drizzle/`. Os dados iniciais (etapas, planos, nichos,
  templates etc.) ficam em `drizzle/0003_seed_defaults.sql`.
- **Regras garantidas pelo próprio banco:**
  - @ + plataforma único entre leads não excluídos;
  - uma cadência ativa por lead;
  - sem exclusão definitiva de experts, templates, propostas e projetos;
  - `activities` só aceita leitura e inclusão;
  - divisão de receita soma 100%;
  - `settings` tem uma linha só.
- URLs em português (`/login`, `/experts/novo`), pois são vistas pelo usuário;
  o resto do código fica em inglês.
- **Organização por módulo:**
  - telas em `src/app/(app)/<módulo>/`, com `actions.ts` (Server Actions) e
    `_components/`;
  - lógica em `src/lib/<módulo>/`:
    - `queries.ts`: leituras;
    - `mutations.ts`: gravações que recebem a transação;
    - `validation.ts`: schemas zod;
    - `normalize.ts`: limpeza de dados.
  - Textos em português dos valores fixos ficam em `src/lib/labels.ts`, e a
    formatação de números e datas em `src/lib/format.ts`.
- **Padrões do Next 16 com Cache Components:**
  - `params` e `searchParams` são Promises: passe-os para um componente dentro
    de `<Suspense>`.
  - Hooks que leem a URL (`useSearchParams`, `useSelectedLayoutSegment`) também
    ficam dentro de `<Suspense>`, ou o build falha.
  - Depois de gravar sem redirecionar, chame `refresh()` (de `next/cache`).
- **Formulários** com `useActionState` enviam via `onSubmit` + `startTransition`,
  para não limpar os campos quando há erro de validação.
- **Selects:** use `SimpleSelect` (`src/components/simple-select.tsx`). O Select
  do shadcn usa o Base UI, que precisa da lista de opções para mostrar o
  nome em vez do id.
## Testes

- **`tests/db/etapaN.ts`:** lógica e regras do banco. Testam contra o banco real
  dentro de uma transação desfeita no final.
  Rodar: `npx tsx --env-file=.env.local tests/db/etapaN.ts`.
- **`tests/e2e/etapaN.ts`:** testes de tela com Playwright (`playwright-core`
  usando o Chrome do Mac). Rode contra um build de produção, que é mais confiável
  que o servidor de desenvolvimento (este às vezes fica com módulos antigos em
  cache): `npm run build`, depois `npx next start -p 3200`, e
  `BASE_URL=http://localhost:3200` nos comandos abaixo. Sem `BASE_URL`, o padrão
  é o `npm run dev` na porta 3000.
  1. `npx tsx --env-file=.env.local tests/e2e/test-user.ts create`: cria um
     login de teste (admin) direto no Supabase. A senha fica em
     `tmp/e2e/test-user.json`. Use `delete` para apagar.
  2. `npx tsx --env-file=.env.local tests/e2e/etapaN.ts`: roda os testes. Os
     prints das falhas vão para `tmp/e2e/screens/`.
  3. `npx tsx --env-file=.env.local tests/e2e/cleanup.ts`: apaga os dados de
     teste (leads `teste.expert*`, `*.e2e`, nomes com "E2E").
- **Cuidados com o Cache Components:**
  - Ele mantém a página anterior montada e escondida. Nos testes, use só
    elementos visíveis (`.filter({ visible: true })`) e espere `networkidle` ao
    abrir uma página (o helper `open()` já faz isso).
  - Não apague `.next`: o servidor de desenvolvimento do usuário usa `.next/dev`.
- **Depois de uma ação que grava**, espere a resposta do POST
  (`page.waitForResponse`) antes de recarregar a página. O
  `waitForLoadState("networkidle")` volta na hora se a página já estava ociosa.
- **`tmp/`** é local (ignorado pelo Git), para credenciais, prints e logs.

## Regras de desenvolvimento

- Trabalhar **uma etapa da seção 8 por vez**, na ordem.
- **Modo autônomo (pedido do usuário em 2026-11-06):** executar as etapas sem
  perguntar e sem esperar aprovação. Para cada etapa:
  1. planejar;
  2. implementar;
  3. testar por conta própria: `typecheck`, `lint`, `build`, scripts em `tmp/` e
     testes de tela com Playwright (ver "Testes" abaixo);
  4. registrar as decisões em "Decisões tomadas";
  5. commitar.

  Em caso de ambiguidade, escolher a opção mais simples dentro do escopo e
  registrar a escolha.
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
- **2026-11-06 — Ajustes no modelo da seção 5 (Etapa 2):**
  - `experts` ganhou `loss_reason_id` e `loss_note` (motivo da perda; a nota
    serve para o motivo "Outro").
  - Sem `settings.stage_limits`: o limite de dias parado fica só em `stages.max_days`.
  - `templates.stage` é a categoria da mensagem (abordagem, follow-up, quebra de
    objeção, convite para diagnóstico, encerramento, script), não a etapa do
    pipeline. Os scripts de ligação e o roteiro de diagnóstico usam o canal `call`.
  - Novo canal e tipo de atividade `interaction` (seguir e interagir).
  - `content_frequency` é sim/não, como as outras perguntas de qualificação.
  - `settings` é linha única com `score_weights`, `accepted_proposal_stage_id`
    (padrão: Negociação) e `reactivation_days` (60).
  - Valores em reais com centavos. Soft delete também em `templates`.
  - Status de reunião: agendada, realizada, cancelada e não compareceu.
- **2026-11-06 — Templates (Etapa 6):**
  - Biblioteca em `/templates`, com filtro por canal e agrupada por categoria.
  - Variáveis renderizadas em `src/lib/templates/render.ts`. Dado faltando vira
    vazio e entra em `missing`, para a tela avisar.
  - Variável desconhecida bloqueia o salvamento.
  - Em templates de e-mail, "Assunto: ..." na primeira linha vira o assunto.
  - Exclusão lógica.
- **2026-11-07 — Dashboard (Etapa 11):**
  - Página `/dashboard`; as consultas ficam em `src/lib/dashboard/queries.ts`.
  - **Filtros**, numa linha acima de tudo e valendo para todos os números:
    - período: 7, 30 ou 90 dias, ou mês atual, em dias inteiros de São Paulo;
    - SDR: o responsável pelo lead; nos toques e tarefas, quem executou;
    - nicho;
    - cadência: leads que já foram inscritos nela.
  - **Funil:** dos leads criados no período, quantos chegaram a cada etapa (a
    etapa mais adiantada já alcançada, pelo histórico de `stage_change`; Perdido
    fica de fora), com a conversão em relação à etapa anterior.
  - **Motivos de perda:** leads que foram para Perdido no período.
  - **Toques:** atividades de contato.
  - **Taxa de resposta:** respondeu ÷ (enviado + respondeu + sem resposta) das
    tarefas concluídas no período.
  - **Resultado:** projetos criados no período (contratos ganhos), soma do
    setup das propostas deles e o plano mais vendido.
  - **Gráficos em HTML/CSS** (em vez do Recharts sugerido), seguindo o guia de
    dataviz:
    - uma cor só (`--viz-series-1`, validada), porque a escala de 9 tons do funil
      reprovou na validação;
    - barras de 16px com a ponta arredondada;
    - dica no hover e no foco;
    - "Ver dados em tabela" em cada gráfico;
    - o valor de setup fechado como número de destaque.
- **2026-11-06 — Propostas (Etapa 10):**
  - A lógica fica em `src/lib/proposals/`.
  - **Valores:** setup, divisão e extras são copiados do plano para a proposta.
    O gatilho `proposals_freeze_accepted` congela os valores depois de aceita
    (regra 8).
  - **Status:**
    - rascunho (editável), enviada, visualizada, aceita e recusada;
    - "Enviada" leva o lead para "Proposta enviada";
    - "Aceita" leva o lead para `settings.accepted_proposal_stage_id`, que por
      padrão é Negociação e nunca é Ganho, porque Ganho exige contrato e
      pagamento e é marcado no pipeline.
  - **Página pública `/p/<token>`:**
    - abre sem login (o proxy libera `/p/`) e usa `runAsAnon()`;
    - só chama as funções `get_public_proposal` (que registra a visualização) e
      `respond_to_proposal`, ambas `security definer` (migration 0010);
    - o visitante sem login continua sem ler nenhuma tabela;
    - rascunho não abre: mostra "Página não encontrada". O status HTTP é 200
      por causa do streaming, mas o conteúdo não aparece;
    - o PDF é a impressão do navegador ("Baixar PDF" chama `window.print()`).
  - O envio por e-mail (Resend) não foi feito: o link é copiado e enviado pelo
    canal que a equipe preferir.
  - **Configurações:** planos (setup e % do expert) e parâmetros gerais (etapa da
    proposta aceita e dias até a reativação).
  - `src/app/not-found.tsx` é a página de "não encontrado", em português.
- **2026-11-06 — Agenda e diagnóstico (Etapa 9):**
  - A lógica fica em `src/lib/meetings/mutations.ts`.
  - **Agendamento pela ficha:** data, hora e responsável (Closer), no horário de
    Brasília (`-03:00`, sem horário de verão). Leva o lead para "Diagnóstico
    agendado", se ele estiver antes dessa etapa e não estiver ganho nem perdido.
  - **`/agenda`:** próximas reuniões e as dos últimos 30 dias, com filtro
    "Minhas" ou "Todas".
  - **`/agenda/[id]`:** formulário de diagnóstico (`meetings.diagnosis`, tipo
    `DiagnosisForm`), roteiros (templates da categoria "script") e reagendamento.
  - **Status:** "Realizada" leva o lead para "Diagnóstico realizado"; "Não
    compareceu" e "Cancelada" só ficam registrados. Tudo vai para a linha do tempo.
- **2026-11-06 — Fila do dia (Etapa 8):**
  - A tela inicial ("/") é a fila do dia: tarefas pendentes de hoje e
    atrasadas do usuário, agrupadas por canal (`src/lib/queue/queries.ts`).
  - Na mensagem, `{nome}` e `{nome_sdr}` usam o primeiro nome.
  - **Links diretos:**
    - DM e interação abrem o perfil;
    - WhatsApp abre wa.me com o texto;
    - e-mail abre mailto com assunto e corpo;
    - ligação abre tel:.
  - **Toques do dia:** atividades de contato (interaction, dm, whatsapp, email,
    call) do usuário desde 0h em São Paulo, registradas pela fila ou pela ficha.
  - **Meta diária:** `users.daily_goal`; vazio = 40. Editável em Configurações,
    o que exigiu a política `users_update_admin` com a função `is_admin()`
    (migrations 0008 e 0009).
  - **Fila de reativação:** perdidos com o motivo `no_reply` há mais de
    `reactivation_days`, do usuário ou sem responsável. "Reativar" volta o lead
    para "Novo lead".
  - O Admin vê um aviso com a quantidade de leads sem responsável.
- **2026-11-06 — Cadências (Etapa 7):**
  - A lógica fica em `src/lib/cadences/mutations.ts` (`enrollExpert`,
    `completeTask`, `skipTask`).
  - **Inscrição:**
    - gera uma tarefa por passo (data = hoje em São Paulo + dia do passo);
    - a tarefa vai para o responsável do lead ou, sem responsável, para quem
      inscreveu;
    - "Novo lead" ou um lead perdido vai para "Em cadência".
  - **Resultados:**
    - "respondeu" pausa a cadência, pula as tarefas pendentes e move o lead para
      "Respondeu";
    - o fim sem resposta leva o lead a Perdido com o motivo "Sem resposta", e ele
      volta na fila de reativação depois de `settings.reactivation_days`.
  - **Contadores do template:** "usado" conta enviado, respondeu e sem resposta;
    "resposta" conta só respondeu.
  - **Pipeline:** ir para Respondeu ou além pausa a cadência; Ganho ou Perdido a
    encerram (`closeActiveEnrollment`).
  - Pausar pula as tarefas restantes, sem opção de retomar: o lead pode ser
    inscrito de novo.
  - A cadência padrão de 12 dias é criada pela migration 0007.
- **2026-11-06 — Score (Etapa 4):**
  - Cálculo em `src/lib/score.ts`: a nota é a soma dos pesos dos critérios atendidos.
  - Sim/não: "sim" ganha o peso cheio; "não" ou não informado ganha 0.
  - O engajamento vale proporcionalmente até 5% e ganha o peso cheio a partir daí.
  - Os pesos precisam somar 100.
  - O score é calculado ao salvar ou importar e recalculado em todos os leads
    quando os pesos mudam (`/configuracoes`, só Admin).
- **2026-11-06 — Pipeline (Etapa 5):**
  - **Regras de etapa em gatilhos do banco** (migration 0005):
    - Perdido exige motivo; ao sair de Perdido, o motivo é apagado.
    - Ganho exige proposta aceita e um Projeto criado na mesma transação
      (checagem DEFERRABLE).
    - Toda mudança de etapa gera um registro em `activities` com `auth.uid()`;
      sair de Perdido é registrado como "Lead reativado".
    - `stage_entered_at` é atualizado sozinho.
  - **A função `moveExpert`** (`src/lib/pipeline/move.ts`) valida antes, para dar
    mensagens claras, e cria o Projeto no Ganho.
  - **Identificadores fixos:** `stages.key` (new, in_cadence, replied, qualified,
    meeting_scheduled, meeting_done, proposal_sent, negotiation, won, lost) e
    `loss_reasons.key` (no_reply, other). As automações acham a etapa pela key;
    o nome é livre.
  - **Motivo "Outro"** exige descrição (`loss_note`).
  - **`activities.created_at`** usa `clock_timestamp()`, para a ordem ficar
    certa dentro de uma mesma transação.
  - **Edição de etapas** em `/configuracoes`: nome, limite de dias, ordem,
    adicionar e remover. Não dá para remover etapas do sistema nem etapas com leads.

## Progresso (seção 8)

- [x] 1. Setup do projeto + login (concluída em 2026-11-06)
- [x] 2. Banco: tabelas, migrations e seed (concluída em 2026-11-06)
- [x] 3. Experts (concluída em 2026-11-06)
- [x] 4. Score (concluída em 2026-11-06)
- [x] 5. Pipeline (concluída em 2026-11-06)
- [x] 6. Templates (concluída em 2026-11-06)
- [x] 7. Cadências (concluída em 2026-11-06)
- [x] 8. Fila do dia (concluída em 2026-11-06)
- [x] 9. Agenda e diagnóstico (concluída em 2026-11-06)
- [x] 10. Propostas (concluída em 2026-11-06)
- [x] 11. Dashboard (concluída em 2026-11-07)
- [ ] 12. Revisão de permissões (RLS), segurança e deploy
