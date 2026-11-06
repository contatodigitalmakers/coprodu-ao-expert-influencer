# Escopo — Central Comercial (CRM + SDR)

Nov 6, 2026 · @Joshuan Souza Ceccon

## 1. Visão geral

A Central Comercial é o sistema interno que organiza a prospecção de experts, do primeiro contato até o contrato assinado e o setup pago. A primeira versão cobre CRM e processo de SDR; o módulo de entrega de projetos entra depois, conectado ao mesmo banco.

**Objetivos do MVP**

- Centralizar todos os experts prospectados num só lugar, sem planilhas.
- Dar ao SDR uma fila diária de tarefas: quem abordar, por qual canal e com qual mensagem.
- Mostrar o funil em tempo real: quantos leads em cada etapa e onde se perde mais.
- Gerar propostas com os planos de setup e divisão (5k, 7k, 9k) em poucos cliques.
- Registrar cada interação, para qualquer sócio assumir uma negociação sem perder contexto.

**Fora do MVP:** automação de DMs no Instagram (proibida pelos termos da Meta), gestão de projetos de entrega e financeiro de recorrência.

## 2. Perfis de usuário

Três perfis bastam no início; um usuário pode acumular perfis (os sócios provavelmente serão Admin e Closer).

| Perfil | O que faz | Acesso |
| --- | --- | --- |
| Admin (sócios) | Configura o sistema, vê tudo, gerencia usuários | Total |
| SDR | Prospecta, executa cadências, qualifica e agenda diagnóstico | Leads atribuídos a ele + fila de tarefas + templates |
| Closer | Conduz diagnóstico, envia proposta, negocia e fecha | Leads a partir de “Diagnóstico agendado” + propostas |

Regra: SDR não vê valores de propostas fechadas de outros usuários nem o dashboard financeiro.

## 3. Módulos do MVP

São nove módulos; os quatro primeiros formam o núcleo e devem existir antes de qualquer outro.

### 3.1 Experts (leads)

- Cadastro manual com: nome, @ principal, plataforma (Instagram, YouTube, TikTok, outra), link do perfil, nicho, seguidores, taxa de engajamento estimada, WhatsApp, e-mail, cidade, origem do lead, responsável, tags e observações.
- Campos de qualificação: já vende produto digital? (sim/não + qual), tem método estruturado?, problema é recorrente?, produz conteúdo com frequência?
- Importação via CSV com mapeamento de colunas.
- Bloqueio de duplicidade pelo @ + plataforma, com aviso ao cadastrar.
- Ficha do expert com linha do tempo de todas as interações, tarefas, propostas e mudanças de etapa.
- Busca e filtros por nicho, etapa, responsável, tags, score e faixa de seguidores.

### 3.2 Score de qualificação (ICP)

- Nota de 0 a 100 calculada a partir dos campos de qualificação, com pesos configuráveis pelo Admin.
- Pesos iniciais sugeridos: engajamento 30, já vende produto 25, problema recorrente 20, método estruturado 15, frequência de conteúdo 10.
- Classificação automática: A (70+), B (40–69), C (abaixo de 40), exibida como selo na ficha e no Kanban.

### 3.3 Pipeline (Kanban)

Etapas padrão, editáveis pelo Admin:

1. Novo lead
2. Em cadência (SDR prospectando)
3. Respondeu
4. Qualificado
5. Diagnóstico agendado
6. Diagnóstico realizado
7. Proposta enviada
8. Negociação
9. Ganho (contrato assinado + setup pago)
10. Perdido (motivo obrigatório)

- Arrastar e soltar entre etapas, com registro automático na linha do tempo.
- Card mostra: nome, @, nicho, seguidores, score, responsável e dias parado na etapa.
- Alerta visual quando o lead fica parado além do limite da etapa (configurável, ex.: 3 dias em "Respondeu").
- Visão em lista como alternativa ao Kanban.

### 3.4 Cadências de SDR

- Cadência = sequência de passos com dia, canal e template. Exemplo: D0 seguir e interagir, D1 DM Instagram, D3 follow-up DM, D5 WhatsApp, D8 e-mail, D12 mensagem de encerramento.
- Ao inscrever um lead numa cadência, o sistema gera as tarefas com datas.
- Canais no MVP são assistidos, não automáticos: o sistema mostra a mensagem com variáveis preenchidas, botão de copiar e link direto (perfil do Instagram, wa.me, mailto). O SDR envia e marca como feito.
- Resultado de cada passo: enviado, respondeu, sem resposta, número inválido.
- Se o lead responder, a cadência pausa e o lead vai para "Respondeu".
- Ao fim da cadência sem resposta, o lead vai para "Perdido — sem resposta" ou volta para uma fila de reativação em 60 dias.

### 3.5 Fila do dia (tela inicial do SDR)

- Lista das tarefas do dia e atrasadas, agrupadas por canal.
- Executar tarefa sem sair da tela: ver mensagem, copiar, abrir link, registrar resultado.
- Meta diária configurável (ex.: 40 toques) com barra de progresso.

### 3.6 Templates e scripts

- Biblioteca de mensagens por canal e por etapa (abordagem, follow-up, quebra de objeção, convite para diagnóstico).
- Variáveis: {nome}, {nicho}, {@}, {seguidores}, {nome_sdr}.
- Scripts de ligação e roteiro da reunião de diagnóstico com perguntas-padrão.
- Métrica por template: vezes usado e taxa de resposta.

### 3.7 Agenda e diagnóstico

- Agendar reunião de diagnóstico vinculada ao lead, com data, hora, link da chamada e responsável (Closer).
- Formulário de diagnóstico preenchido durante a reunião: audiência, produtos atuais, faturamento aproximado, ideia de app, plano de interesse, objeções.

### 3.8 Propostas

- Gerador de proposta a partir da ficha: escolhe o plano e os serviços extras, o sistema calcula valores.
- Planos configuráveis; padrão inicial: Setup 5k → 60% expert / 40% nós; Setup 7k → 70/30; Setup 9k → 80/20.
- Regra exibida na proposta: o expert recebe 100% da receita até recuperar o valor do setup; depois vale a divisão do plano.
- Serviços extras de co-produção (estratégia de marketing, tráfego, lançamento) com valor livre.
- Saída como página pública com link único e opção de PDF; status: rascunho, enviada, visualizada, aceita, recusada.
- Proposta aceita move o lead para "Negociação" ou "Ganho", conforme configuração.

### 3.9 Dashboard

- Funil: quantidade por etapa e taxa de conversão entre etapas.
- Por período, por SDR, por nicho e por cadência.
- Atividade: toques por dia, taxa de resposta, reuniões agendadas e realizadas.
- Resultado: propostas enviadas, contratos ganhos, valor de setup fechado e plano mais vendido.
- Motivos de perda mais frequentes.

## 4. Regras de negócio

1. Todo lead tem um responsável; leads sem responsável aparecem numa fila "Não atribuídos" para o Admin distribuir.
2. Um lead só pode estar em uma cadência ativa por vez.
3. Mover para "Perdido" exige motivo (sem resposta, sem interesse, sem budget, timing, não qualificado, outro).
4. Mover para "Ganho" exige proposta aceita vinculada, data de assinatura do contrato e confirmação do pagamento do setup.
5. Ao marcar "Ganho", o sistema cria um registro de Projeto (status "Aguardando kickoff"), base para o futuro módulo de entrega.
6. Lead perdido pode ser reativado; o histórico é mantido e a reativação fica registrada.
7. Toda mudança de etapa, tarefa concluída e proposta gera evento na linha do tempo, com usuário e data.
8. Divisão de receita gravada na proposta aceita fica congelada, mesmo que os planos padrão mudem depois.
9. Exclusão de lead é lógica (soft delete) e restrita ao Admin.

## 5. Modelo de dados

Todas as tabelas têm id (uuid), created_at, updated_at e, quando aplicável, deleted_at. Nomes em inglês facilitam o trabalho no Claude Code.

| Tabela | Campos principais | Relações |
| --- | --- | --- |
| users | name, email, role (admin, sdr, closer), active, daily_goal | — |
| niches | name, active | — |
| experts | name, handle, platform, profile_url, niche_id, followers, engagement_rate, whatsapp, email, city, source, owner_id, stage_id, score, score_tier, sells_product, product_description, has_method, recurring_problem, content_frequency, notes, stage_entered_at | niches, users, stages |
| tags / expert_tags | name, color | N:N com experts |
| stages | name, order, max_days, is_won, is_lost | — |
| loss_reasons | name | — |
| activities | expert_id, user_id, type (note, stage_change, call, dm, whatsapp, email, meeting, proposal), description, metadata (json) | experts, users |
| cadences | name, active | — |
| cadence_steps | cadence_id, day_offset, channel, template_id, order | cadences, templates |
| cadence_enrollments | expert_id, cadence_id, status (active, paused, finished), started_at | experts, cadences |
| tasks | expert_id, user_id, enrollment_id, step_id, due_date, channel, status (pending, done, skipped), outcome | experts, users, enrollments |
| templates | name, channel, stage, body, times_used, times_replied | — |
| meetings | expert_id, user_id, scheduled_at, link, status, diagnosis (json) | experts, users |
| plans | name, setup_value, expert_share, our_share, active | — |
| proposals | expert_id, plan_id, setup_value, expert_share, our_share, extras (json), total, status, public_token, sent_at, viewed_at, accepted_at | experts, plans |
| projects | expert_id, proposal_id, status, setup_paid_at, contract_signed_at | experts, proposals |
| settings | score_weights (json), stage_limits, outros parâmetros | — |

## 6. Stack e integrações

A stack sugerida prioriza velocidade com Claude Code e custo baixo no início; ela também serve de base para os apps dos experts depois.

| Camada | Escolha sugerida | Motivo |
| --- | --- | --- |
| Front + back | Next.js (App Router) + TypeScript | Um projeto só, ótimo suporte do Claude Code |
| UI | Tailwind CSS + shadcn/ui + dnd-kit (Kanban) | Componentes prontos e consistentes |
| Banco e auth | Supabase (Postgres, Auth, Row Level Security, Storage) | Permissões por perfil direto no banco |
| ORM | Drizzle ou Prisma | Tipagem e migrations |
| E-mail | Resend | Envio de propostas e notificações |
| PDF | react-pdf ou Puppeteer | Proposta em PDF |
| Hospedagem | Vercel | Deploy automático pelo GitHub |
| Gráficos | Recharts | Dashboard |

**Integrações por fase**

- MVP: links diretos (Instagram, wa.me, mailto), importação CSV, e-mail transacional.
- Fase 2: Google Calendar (agendamento), WhatsApp Business API oficial ou provedor como Z-API/Evolution (envio e registro de mensagens), assinatura eletrônica (Clicksign, ZapSign ou Autentique), gateway para cobrança do setup (Asaas ou Pagar.me).
- Fase 3: enriquecimento de perfis via APIs oficiais e IA para sugerir mensagens personalizadas a partir do perfil do expert.

Atenção: automação de DMs e scraping do Instagram violam os termos da Meta e podem banir a conta; mantenha o envio manual assistido.

## 7. Fases

O MVP comercial vem primeiro; cada fase só começa quando a anterior está em uso real pelo time.

1. **Fase 1 — MVP comercial:** experts, score, pipeline, cadências, fila do dia, templates, agenda, propostas e dashboard básico.
2. **Fase 2 — Integrações:** Google Calendar, WhatsApp API, assinatura eletrônica, cobrança do setup e notificações.
3. **Fase 3 — Entrega:** módulo de projetos com as etapas do processo de entrega (kickoff, coleta, escopo, desenvolvimento, testes, lançamento).
4. **Fase 4 — Financeiro da co-produção:** controle da recuperação do setup por expert, início automático da comissão e relatório de recorrência (MRR, churn, repasses).

## 8. Implementação no Claude Code

Construa em etapas pequenas, uma por sessão, testando cada uma antes de seguir. Salve este documento no repositório (ex.: docs/escopo.md) e crie um CLAUDE.md com o resumo abaixo.

**Ordem sugerida**

1. Setup do projeto: Next.js + TypeScript + Tailwind + shadcn/ui + Supabase; login e perfis (admin, sdr, closer).
2. Banco: tabelas da seção 5, migrations, seed com etapas, nichos, motivos de perda, planos e templates de exemplo.
3. Experts: Banco: tabelas da seção 5, migrations, seed com etapas, nichos, motivos de perda, planos e templates de exemplo.lista com filtros, cadastro, edição, ficha com linha do tempo, importação CSV e bloqueio de duplicidade.
4. Score: cálculo automático ao salvar e tela de pesos nas configurações.
5. Pipeline: Kanban com arrastar e soltar, regras de Perdido/Ganho e alerta de lead parado.
6. Templates com variáveis.
7. Cadências: criação, inscrição de lead, geração de tarefas, pausa ao responder.
8. Fila do dia do SDR com execução de tarefa e meta diária.
9. Agenda e formulário de diagnóstico.
10. Propostas: gerador, página pública, PDF, status e criação de Projeto ao ganhar.
11. Dashboard.
12. Permissões (RLS), revisão de segurança e deploy na Vercel.

**Sugestão de CLAUDE.md**

```
# Central Comercial (CRM + SDR)
Sistema interno para prospectar experts e vender co-produção de apps.
Stack: Next.js App Router, TypeScript, Tailwind, shadcn/ui, Supabase
(Postgres + Auth + RLS), Drizzle.
Escopo completo: docs/escopo.md. Siga a ordem da seção 8.
Regras: interface em português; código e banco em inglês; soft delete;
toda mudança de etapa gera registro em activities; permissões via RLS por
role.
Antes de cada etapa, proponha o plano e espere aprovação.
```

**Critérios de aceite do MVP**

- [ ] SDR faz login e vê só seus leads e sua fila do dia.
- [ ] Importar um CSV com 100 experts cria os registros sem duplicar @ já existentes.
- [ ] Inscrever um lead numa cadência gera as tarefas nas datas certas e pausa quando ele responde.
- [ ] Mover para Perdido sem motivo é bloqueado; mover para Ganho sem proposta aceita é bloqueado.
- [ ] Proposta do plano 7k mostra divisão 70/30 e a regra de recuperação do setup; o link público registra a visualização.
- [ ] Ganhar um lead cria um Projeto em "Aguardando kickoff".
- [ ] Dashboard mostra o funil com conversão entre etapas filtrável por período, SDR e nicho.

**Perguntas em aberto**

- Quantos SDRs e closers vão usar o sistema no início?
- A cadência padrão terá quantos dias e quais canais?
- A proposta precisa de identidade visual própria da empresa (nome e logo já definidos?).
