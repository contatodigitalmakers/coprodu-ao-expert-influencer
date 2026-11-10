---
description: Analisa os perfis cadastrados pelo link em "Novo expert" (fila "analisar-ia") e preenche os dados do lead no sistema, usando só o buscador e páginas públicas fora das redes sociais.
argument-hint: "[quantidade]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - WebSearch
  - WebFetch
  - Read
  - Write(/tmp/pesquisa/**)
  - Edit(/tmp/pesquisa/**)
  - Bash(npm run analisar-pendentes)
  - Bash(npm run analisar-pendentes *)
  - Bash(npm run analisar-salvar *)
---

# Análise de perfis cadastrados pelo link

Argumentos: `$ARGUMENTS` (opcional: quantos leads analisar nesta vez; padrão 10).

O usuário encontrou estes perfis à mão e cadastrou cada um pelo link, na tela
"Novo expert". O lead já existe no sistema, só com o @ e a plataforma. Seu
trabalho é pesquisar cada perfil e devolver os dados para preencher a ficha.
O sistema só preenche os campos que estão vazios: nada que o usuário digitou é
apagado.

## Regras que nunca podem ser quebradas

1. **Nunca abra as redes sociais**: instagram.com, tiktok.com, youtube.com,
   facebook.com e threads.net, nem por WebFetch nem de outro jeito. Sobre o
   perfil, use só o que o buscador (WebSearch) mostra: título, link e resumo.
2. **Não invente nada**: nome, seguidores, produto, cidade ou contato. Sem
   fonte, deixe o campo vazio (`""`). O sistema descarta a análise de um perfil
   que não apareceu numa busca registrada.
3. **Só grave pelos scripts** abaixo. Nunca mude etapa nem responsável, nunca
   inscreva em cadência, nunca mande mensagem para ninguém.
4. **Orçamento**: no máximo 3 buscas e 2 leituras de página por lead.
5. **Dados pessoais (LGPD)**: WhatsApp e e-mail só se estiverem publicados para
   contato profissional, e sempre com a página onde estavam (`fonteContato`).

## Passos

1. **Rode `npm run analisar-pendentes`.** Se não houver nenhum, diga ao usuário
   para cadastrar pelo link em "Novo expert" e pare. Analise no máximo a
   quantidade dos argumentos (padrão 10), começando pelos mais antigos.
2. **Ache o perfil no buscador**, com WebSearch, `mode: "standard"` e o
   `allowed_domains` da plataforma do lead. O operador `site:` não funciona.

   | Plataforma | `allowed_domains` | `query` |
   | --- | --- | --- |
   | Instagram | `["instagram.com"]` | `<handle> instagram` |
   | TikTok | `["tiktok.com"]` | `@<handle> tiktok` |
   | YouTube | `["youtube.com"]` | `<handle> canal youtube` |

   - O perfil certo é o resultado cujo link é o do lead. Do título e do resumo
     saem o nome, a bio e, no Instagram, os seguidores ("22K followers").
   - Se não achar, tente uma segunda busca com o nome provável ou com o @ sem
     pontos e sublinhados.
   - Se o perfil não aparecer em nenhuma das buscas, marque
     `"encontrado": false` e não preencha mais nada.
3. **Complemente (opcional, dentro do orçamento):**
   - WebSearch `<nome> <handle> curso OR mentoria OR hotmart OR linktree`, sem
     `allowed_domains`;
   - WebFetch em páginas públicas **fora das redes** (Linktree, site, página de
     venda), para descobrir produto, método e contato profissional.
4. **Monte a análise.** Responda `sim` ou `nao` só com evidência; sem
   evidência, deixe `""`.

   | Campo | Quando é `sim` |
   | --- | --- |
   | `vendeProduto` | há link ou menção a curso, mentoria, e-book ou consultoria (diga qual em `produto` e a fonte em `fonteProduto`) |
   | `temMetodo` | o método tem nome ou há um programa em etapas |
   | `problemaRecorrente` | o público tem uma dor contínua (peso, treino, fé, renda) |
   | `frequenciaConteudo` | o resumo mostra publicações recentes e regulares |

   - `nome`: o nome da pessoa, como aparece no título do resultado.
   - `nicho`: um dos nichos que o `analisar-pendentes` listou ou outro que já
     exista no sistema. Na dúvida, deixe `""`.
   - `seguidores`: como apareceram ("48K", "12,5 mil"). Não descarte por
     faixa: quem escolheu o lead foi o usuário.
   - `resumo`: 2 a 3 frases sobre quem é, o que ensina e o que pesa a favor ou
     contra para a co-produção de app.
   - `ideiaApp`: o app em 1 ou 2 frases, com um nome sugerido e 2 ou 3 telas.
   - `mensagens`: as 3 mensagens da sequência de prospecção, prontas para o SDR
     copiar e enviar conforme a conversa avança. **Leia antes
     `.claude/skills/pesquisa/mensagens.md`** (Read) e siga os modelos e as
     regras de lá: `prospeccao`, `amostra` e `convite`.
5. **Escreva o arquivo** `tmp/pesquisa/analise-AAAA-MM-DD-HHMM.json`, com a data
   e a hora atuais, neste formato (um item por lead, com o `id` que o script
   mostrou):

   ```json
   {
     "analise": "2026-11-09T22:00",
     "leads": [
       {
         "id": "<id do lead>",
         "encontrado": true,
         "nome": "Ana Souza",
         "nicho": "Nutrição",
         "seguidores": "48K",
         "cidade": "",
         "whatsapp": "",
         "email": "",
         "fonteContato": "",
         "vendeProduto": "sim",
         "produto": "Curso Emagrece 30",
         "fonteProduto": "https://hotmart.com/...",
         "temMetodo": "",
         "problemaRecorrente": "sim",
         "frequenciaConteudo": "",
         "resumo": "Nutricionista que ensina reeducação alimentar...",
         "ideiaApp": "App Emagrece 30: cardápio do dia, registro de refeições e peso, evolução semanal.",
         "mensagens": {
           "prospeccao": "Boa tarde, Ana, tudo bem? Acompanhei seu conteúdo e gostei muito de...\n\nFiquei curioso: ... ou você já tem algum sistema ou app próprio?",
           "amostra": "Entendi, Ana! Pergunto porque a gente desenvolve apps próprios para experts, em parceria: ...",
           "convite": "Ana, esse foi só um rascunho pra você visualizar como o Emagrece 30 poderia virar um app próprio, ..."
         },
         "provas": [
           { "url": "https://www.instagram.com/ana.nutri/", "trecho": "Ana Souza · 48K Followers · Nutricionista..." }
         ]
       },
       { "id": "<id de um lead não encontrado>", "encontrado": false }
     ]
   }
   ```

6. **Simule:** `npm run analisar-salvar -- <arquivo> --simular`.
   - Corrija só erros de formato e rode a simulação no máximo mais uma vez.
   - Nunca "conserte" um descarte por prova inventando dado.
7. **Grave:** `npm run analisar-salvar -- <arquivo>`.
8. **Resuma para o usuário, em português:**
   - os atualizados: nome, @, o que foi preenchido e uma linha sobre o perfil;
   - os sem dados públicos, que saíram da fila e precisam ser preenchidos à mão;
   - os descartados, que continuam na fila, com o motivo;
   - os avisos.
