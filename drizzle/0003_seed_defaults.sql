-- Dados iniciais do sistema (seções 3.2, 3.3, 3.6, 3.8 e regra 3 do escopo).
-- Tudo pode ser editado depois pelas telas de configuração.

-- Etapas do pipeline. max_days = limite de dias parado antes do alerta.
INSERT INTO public.stages (name, "order", max_days, is_won, is_lost) VALUES
  ('Novo lead',             1,  3,    false, false),
  ('Em cadência',           2,  14,   false, false),
  ('Respondeu',             3,  3,    false, false),
  ('Qualificado',           4,  3,    false, false),
  ('Diagnóstico agendado',  5,  7,    false, false),
  ('Diagnóstico realizado', 6,  3,    false, false),
  ('Proposta enviada',      7,  5,    false, false),
  ('Negociação',            8,  7,    false, false),
  ('Ganho',                 9,  NULL, true,  false),
  ('Perdido',               10, NULL, false, true);
--> statement-breakpoint
INSERT INTO public.loss_reasons (name) VALUES
  ('Sem resposta'),
  ('Sem interesse'),
  ('Sem budget'),
  ('Timing'),
  ('Não qualificado'),
  ('Outro');
--> statement-breakpoint
INSERT INTO public.plans (name, setup_value, expert_share, our_share) VALUES
  ('Setup 5k', 5000, 60, 40),
  ('Setup 7k', 7000, 70, 30),
  ('Setup 9k', 9000, 80, 20);
--> statement-breakpoint
INSERT INTO public.niches (name) VALUES
  ('Fitness'),
  ('Nutrição'),
  ('Finanças pessoais'),
  ('Marketing digital'),
  ('Beleza'),
  ('Maternidade'),
  ('Psicologia'),
  ('Culinária'),
  ('Idiomas'),
  ('Desenvolvimento pessoal');
--> statement-breakpoint
-- Pesos do score (somam 100) e etapa para onde vai a proposta aceita.
INSERT INTO public.settings (score_weights, accepted_proposal_stage_id, reactivation_days)
SELECT
  '{"engagement": 30, "sellsProduct": 25, "recurringProblem": 20, "hasMethod": 15, "contentFrequency": 10}'::jsonb,
  id,
  60
FROM public.stages
WHERE name = 'Negociação';
--> statement-breakpoint
-- Templates de exemplo, seguindo a cadência da seção 3.4 (D0 seguir e
-- interagir não tem mensagem). Variáveis: {nome}, {nicho}, {@}, {seguidores}, {nome_sdr}.
INSERT INTO public.templates (name, channel, stage, body) VALUES
(
  'D1 · Abordagem por DM', 'dm', 'approach',
$t$Oi, {nome}! Tudo bem? Aqui é {nome_sdr}.

Acompanho seu conteúdo sobre {nicho} e gosto muito da forma como você ensina. A gente faz co-produção de apps com experts: você entra com o conhecimento e a audiência, nós com a tecnologia, e dividimos a receita recorrente.

Faz sentido uma conversa rápida de 15 minutos para eu te mostrar como funciona?$t$
),
(
  'D3 · Follow-up por DM', 'dm', 'follow_up',
$t$Oi, {nome}! Passando para saber se você viu minha mensagem.

Com {seguidores} seguidores acompanhando seu trabalho, um app com o seu método pode virar uma receita recorrente que não depende de lançamento. Posso te explicar em poucos minutos?$t$
),
(
  'D5 · Contato por WhatsApp', 'whatsapp', 'follow_up',
$t$Oi, {nome}, tudo bem? Aqui é {nome_sdr}. Te mandei uma mensagem no Instagram ({@}), mas achei melhor falar por aqui.

Trabalho com co-produção de apps para experts de {nicho}. Você teria 15 minutos esta semana para eu te mostrar a ideia?$t$
),
(
  'D8 · E-mail', 'email', 'follow_up',
$t$Assunto: Um app com a sua marca, {nome}

Oi, {nome}!

Sou {nome_sdr} e trabalho com co-produção de apps para experts de {nicho}.

Funciona assim: nós desenvolvemos um app com o seu método e a sua marca, e a receita recorrente é dividida entre nós. Você recebe 100% da receita até recuperar o valor do setup; depois vale a divisão combinada.

Se fizer sentido, me responda com o melhor dia e horário para uma conversa de 15 minutos.

Abraço,
{nome_sdr}$t$
),
(
  'D12 · Mensagem de encerramento', 'dm', 'breakup',
$t$Oi, {nome}! Vou parar de te mandar mensagens para não incomodar.

Se em algum momento fizer sentido ter um app próprio com o seu método de {nicho}, é só me chamar por aqui. Sucesso com o seu trabalho!$t$
),
(
  'Objeção · Sem dinheiro para investir agora', 'whatsapp', 'objection_handling',
$t$Entendo, {nome}! Por isso o nosso modelo é de co-produção: o setup é o único investimento, e você recebe 100% da receita do app até recuperar esse valor. Depois disso, a receita é dividida conforme o plano escolhido.

Quer que eu te mostre uma simulação com os números?$t$
),
(
  'Convite para diagnóstico', 'whatsapp', 'diagnosis_invite',
$t$Que bom que você gostou da ideia, {nome}!

O próximo passo é uma reunião de diagnóstico de 30 minutos: entendemos sua audiência e seus produtos e desenhamos juntos a ideia do app. Qual o melhor dia e horário para você?$t$
),
(
  'Script de ligação', 'call', 'script',
$t$1. Apresentação: "Oi, {nome}, aqui é {nome_sdr}. Tudo bem? Você tem 2 minutos?"
2. Motivo do contato: "Acompanho seu trabalho com {nicho} e trabalho com co-produção de apps para experts."
3. Perguntas rápidas:
   - Você já vende algum produto digital hoje?
   - Seu público tem um problema que se repete no dia a dia?
   - Você já tem um método estruturado?
4. Proposta de valor: "Nós desenvolvemos um app com o seu método e dividimos a receita recorrente."
5. Fechamento: convidar para a reunião de diagnóstico e combinar dia e horário.$t$
),
(
  'Roteiro da reunião de diagnóstico', 'call', 'script',
$t$1. Audiência: quem é o seu público, em quais redes ele está e quanto engaja?
2. Produtos atuais: o que você vende hoje (cursos, mentorias, consultorias)?
3. Faturamento aproximado: quanto você fatura por mês com o digital?
4. Ideia de app: que problema do seu público um app resolveria no dia a dia?
5. Plano de interesse: apresentar os planos de setup (5k, 7k e 9k) e a divisão de receita.
6. Objeções: o que te impediria de começar agora?
7. Próximos passos: combinar o envio da proposta.$t$
);
