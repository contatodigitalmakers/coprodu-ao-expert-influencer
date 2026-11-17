# Central Comercial (CRM + SDR)

Sistema interno para prospectar experts e vender co-produção de apps: experts,
score de qualificação, pipeline, cadências, fila do dia do SDR, templates,
agenda de diagnóstico, apresentações com link curto, propostas com página
pública e dashboard. A Central Financeira acompanha o resultado de cada app em
coprodução e da empresa.

Escopo completo em [docs/escopo.md](docs/escopo.md). As regras do projeto, as
decisões tomadas e a arquitetura estão em [CLAUDE.md](CLAUDE.md).

**Stack:** Next.js 16 (App Router) + TypeScript, Tailwind CSS 4 + shadcn/ui,
Supabase (Postgres, Auth e Row Level Security), Drizzle ORM e Cloudflare Workers
(com o adaptador [OpenNext](https://opennext.js.org/cloudflare)).

## Rodar no computador

1. Copie `.env.example` para `.env.local` e preencha com os dados do seu projeto
   no Supabase (o próprio arquivo explica de onde vem cada valor).
2. Instale as dependências e aplique as migrations:

   ```bash
   npm install
   npm run db:migrate
   ```

3. Suba o servidor e abra http://localhost:3000:

   ```bash
   npm run dev
   ```

Os logins são criados em **Supabase → Authentication → Users → Add user**,
marcando *Auto Confirm User*. O cadastro aberto fica desligado.

## Deploy na Cloudflare

O app roda em **Cloudflare Workers**, em
https://central-comercial.contatodigitalmakerss.workers.dev, com o adaptador
`@opennextjs/cloudflare`. A
configuração está em `wrangler.jsonc` e `open-next.config.ts`. O pacote tem
cerca de 2,3 MiB comprimido e cabe no plano grátis, que aceita até 3 MiB.

**Primeira vez:**

1. **Login.** Rode `npx wrangler login`, que abre o navegador para você
   autorizar a sua conta da Cloudflare. Para conferir: `npx wrangler whoami`.
2. **Deploy.** Rode `npm run deploy`. O comando:
   - faz o build com o adaptador;
   - tira do pacote tudo que não é `NEXT_PUBLIC_`
     (`scripts/cloudflare/env-publico.mjs`), porque o adaptador copia o
     `.env.local` inteiro, com a senha do banco;
   - envia o resultado.

   No fim aparece o endereço, ex.: `https://central-comercial.<sua-conta>.workers.dev`.
3. **Segredo do banco.** O `DATABASE_URL` (pooler de **transação**, porta
   6543) fica guardado na Cloudflare como segredo, e não no código. Para
   enviá-lo direto do `.env.local`, sem copiar a senha:

   ```bash
   grep '^DATABASE_URL=' .env.local | cut -d= -f2- | npx wrangler secret put DATABASE_URL
   ```

   Também dá para cadastrar no painel: *Workers & Pages → central-comercial →
   Settings → Variables and Secrets*, com o tipo *Secret*. O
   `DATABASE_URL_MIGRATIONS` não é necessário na Cloudflare.
4. **Supabase.** Em *Authentication → URL Configuration*, troque o **Site URL**
   pelo endereço da Cloudflare e adicione esse mesmo endereço em
   **Redirect URLs**.
5. **Teste.** Entre com o seu login, crie uma proposta, marque como enviada e
   abra o link público numa janela anônima.

**Próximos deploys:** `npm run deploy`. Quando uma mudança trouxer migration
nova, rode `npm run db:migrate` (com o `.env.local`) antes do deploy.

**Testar no runtime da Cloudflare, no computador:**
1. Copie `.dev.vars.example` para `.dev.vars` e preencha o `DATABASE_URL`.
2. Rode `npm run preview` e abra http://localhost:8787.

O `npm run dev` continua sendo o jeito do dia a dia.

**Diferenças em relação ao Node:**
- **Banco:** na Cloudflare, cada consulta abre e fecha a própria conexão, porque
  os Workers não deixam reaproveitar conexões entre requisições.
  No computador, a conexão continua compartilhada (`src/db/index.ts`).
- **Proxy:** o `src/proxy.ts` (login) roda em Node, o que no adaptador ainda é
  experimental. O build avisa disso, e os testes de tela passaram no
  `npm run preview`.

**Git (opcional, para deploy automático):** a Cloudflare pode fazer o build a
cada push (*Workers & Pages → Create → Import a repository*). O repositório
remoto atual (`contatodigitalmakers/coprodu-ao-expert-influencer`) tem duas
pendências:
- ele é **público**: deixe-o privado ou crie um repositório novo e privado;
- a conta `joshceccon` só tem permissão de leitura nele.

## Pesquisa de experts (`/pesquisa`)

O comando `/pesquisa`, digitado no Claude Code dentro desta pasta, procura
experts na internet e cadastra os novos como leads. Ele usa só as ferramentas
do Claude Code (busca na web e leitura de páginas públicas), sem API paga:
gasta o limite da sua assinatura.

**Como rodar:**

- `/pesquisa`: uma rodada com todos os nichos e a quantidade do config (10).
- `/pesquisa Nutrição 5`: só um nicho e/ou outra quantidade.

**O que ele faz e o que não faz:**

- Nunca abre Instagram, TikTok, YouTube, Facebook nem Threads. Sobre os perfis,
  usa só o que o buscador mostra (título, link e resumo). Pode abrir páginas
  públicas fora das redes, como Linktree, site e página de venda.
- Cada lead entra em "Novo lead", **sem responsável**, com a tag `pesquisa-ia`,
  a origem "Pesquisa IA", o score e, nas observações, o resumo do perfil, a ideia
  do app, as provas (links) e as **3 mensagens da sequência de prospecção**:
  prospecção, proposta de amostra e envio da amostra com o convite para a call.
  Copie a da etapa em que a conversa estiver. Os modelos e as regras estão em
  [.claude/skills/pesquisa/mensagens.md](.claude/skills/pesquisa/mensagens.md).
- Não inscreve em cadência, não atribui responsável e não manda mensagem.
- Descarta (com o motivo, no resumo da rodada):
  - perfil que já está no sistema;
  - perfil que você **excluiu** antes;
  - link que não é de perfil;
  - nicho fora do config e seguidores fora da faixa;
  - perfil que não apareceu numa busca registrada (ver "Prova" abaixo).
- WhatsApp e e-mail só entram com a página onde estavam publicados.

**Para rejeitar um lead, exclua-o.** Ele não volta nas próximas pesquisas.

**Configuração** em [pesquisa/config.md](pesquisa/config.md): nichos e
palavras-chave, faixa de seguidores, quantidade por rodada, plataformas e
orçamento de buscas. Pode editar à vontade, mantendo o formato das seções
"Parâmetros" e "Nichos". No `.env.local`, `PESQUISA_USER_EMAIL` é o login em
nome de quem os leads são gravados.

**Prova (anti-invenção):** o hook `.claude/hooks/registrar-busca.mjs` registra
cada busca em `tmp/pesquisa/buscas.jsonl`. Um perfil só é gravado se o link dele
apareceu na resposta de uma busca das últimas 24 horas. O hook é ativado em
`.claude/settings.json`. Sem esse registro, os leads são gravados com um aviso
para conferir o perfil antes de prospectar.

**Por baixo, os scripts que o comando chama** (também dá para rodar à mão):

```bash
npm run pesquisa-existentes                      # config, nichos e perfis já cadastrados
npm run pesquisa-existentes -- <link1> <link2>   # NOVO, EXISTE, EXCLUÍDO ou INVÁLIDO
npm run pesquisa-salvar -- tmp/pesquisa/<rodada>.json --simular   # valida sem gravar
npm run pesquisa-salvar -- tmp/pesquisa/<rodada>.json             # grava
```

**Limites conhecidos:**

- Os seguidores são aproximados (vêm do resumo do buscador). No YouTube e no
  TikTok o número quase nunca aparece e o lead entra com "seguidores não
  confirmados".
- Sem engajamento: não dá para medir sem abrir o perfil. Por isso o score chega
  a no máximo 70 até alguém preencher o engajamento.
- **LGPD:** se alguém pedir para ser removido, excluir não basta (os dados
  continuam no banco, só escondidos). É preciso apagar ou anonimizar o cadastro.

## Cadastro pelo link (`/analisar`)

Para um perfil que você encontrou por conta própria:

1. Em **Experts → Novo expert**, cole o link do perfil (Instagram, TikTok ou
   YouTube) em "Cadastrar pelo link" e clique em **Cadastrar e analisar**.
   - O lead é criado na hora em "Novo lead", com você como responsável e a tag
     `analisar-ia`.
   - A ficha mostra "Aguardando a análise da IA".
2. No Claude Code, dentro desta pasta, digite `/analisar`. Para limitar a
   quantidade, use `/analisar 5`.
   - A IA pesquisa cada perfil da fila do mesmo jeito do `/pesquisa`: sem abrir
     as redes sociais.
   - Ela preenche nome, nicho, seguidores, cidade, qualificação, produto,
     resumo, ideia do app e as 3 mensagens da sequência.
3. Confira a ficha:
   - só os campos vazios são preenchidos, e o que você digitou fica como está;
   - a linha do tempo diz o que a IA preencheu;
   - se o perfil não aparece no buscador, o lead sai da fila com o aviso
     "preencha à mão".

Por baixo, o comando chama `npm run analisar-pendentes` e
`npm run analisar-salvar -- tmp/pesquisa/analise-<data>.json [--simular]`.

## Apresentações (link curto)

É a apresentação da call de diagnóstico: 22 slides com os dados de cada lead.
Cada apresentação fica salva no CRM e tem um link curto, `/a/<código>`, para
enviar ao lead.

**Como usar:**

1. Na ficha do lead, clique em **Nova apresentação**. Também dá para ir em
   **Apresentações → Nova apresentação** e buscar o lead.
2. O formulário já vem preenchido com:
   - nome, nicho, seguidores e rede do lead;
   - o que o diagnóstico registrou (produtos, audiência e plano de interesse);
   - a data da reunião;
   - o seu nome;
   - os 3 planos de Configurações.

   Complete o resto (a dor, o objetivo e as funcionalidades do app, por
   exemplo). A prévia ao lado atualiza enquanto você digita. "Mostrar campos
   vazios" destaca o que falta.
3. **Salvar e gerar link**. Depois, **Copiar link** ou **Enviar no WhatsApp do
   lead**.

**Regras:**

- **Editar** não muda o link: quem já recebeu vê a versão nova.
- **Excluir** desativa o link, que passa a mostrar "Apresentação não
  encontrada".
- **Aberturas:** a tela da apresentação mostra quantas vezes o link foi aberto
  e quando foi a última. Isso inclui quando você mesmo abre na call. A janela do
  apresentador não conta.
- **Planos:** cada apresentação pode ter valores próprios (% do expert e
  caução). Os valores ficam gravados nela, e mudar os planos em Configurações
  não altera as apresentações já feitas.
- **Campos vazios** nunca aparecem como `[__]`: a frase muda, a linha some ou o
  slide inteiro some.
- **Links do site antigo:** use "Carregar de um link antigo" no formulário para
  trazer os dados de um link `?d=...` já enviado.

**Atalhos durante a apresentação:**

| Tecla | Ação |
|---|---|
| `→` `espaço` `PageDown` | próximo slide |
| `←` `PageUp` | slide anterior |
| `Home` / `End` | primeiro / último |
| `F` | tela cheia |
| `O` | visão geral com todos os slides (`Esc` fecha) |
| `P` | janela do apresentador: próximo slide, notas e cronômetro de 40 min |

As duas janelas ficam sincronizadas. Na call, compartilhe só a aba da
apresentação. No celular, a apresentação vira uma página de rolagem. Para o
PDF, use `Ctrl/Cmd + P` → "Salvar como PDF".

**Onde mudar as coisas:**

- **Textos fixos e notas dos slides:**
  [src/lib/presentations/deck-html.ts](src/lib/presentations/deck-html.ts). Cada
  slide é um `<section data-slide="N">`, e as notas ficam no
  `<aside class="notes">`.
- **Padrões e prova social:**
  [public/apresentacao/js/config.js](public/apresentacao/js/config.js). É onde
  ficam empresa, seu WhatsApp e @, a mensagem pronta, o faturamento de 2026 e as
  listas `cases`, `prints` e `videos` (lista vazia = o slide some). Os arquivos
  ficam em `public/apresentacao/assets/cases/`.
- **Depois de mudar um CSS ou JS** de `public/apresentacao/`, troque o
  `VERSION` em `deck-html.ts`, para o navegador não usar a versão antiga.
- **Campo novo no formulário:** entra em
  [src/lib/presentations/fields.ts](src/lib/presentations/fields.ts) e em
  `public/apresentacao/js/params.js`, que precisam ficar iguais.

**Privacidade:** a página tem `noindex` e não pode ser embutida em outro site.
Quem tem o link vê a apresentação, então não publique links em lugares
abertos.

## Central Financeira

É o controle financeiro dos apps em coprodução. Veio da planilha
`Controle_Apps_Coproducao.xlsx`, com as mesmas contas. Fica no menu, abaixo
da Central Comercial, e só o Admin vê.

| Página | O que mostra |
| --- | --- |
| **Resumo** | resultado de cada app e da empresa no período: receita, custos, tráfego, IA, acerto, lucro, margem, CPA, ROAS e IA por assinante |
| **Mês a mês** | evolução da empresa no ano, com o resultado acumulado e o gráfico "Receita da empresa x Resultado" |
| **Apps** | cadastro de cada app: influenciador, % da empresa, status, plataforma e datas |
| **Vendas** | uma linha por app por mês, com os números do relatório da plataforma |
| **Custos** | uma linha por despesa, do app ou Geral (da empresa) |

**Como usar no mês:**

1. **Apps:** cadastre cada app uma vez. "Lead do CRM" é opcional: escolher o
   lead preenche o influenciador, o @, o nicho, o % da proposta aceita e a data
   do contrato. Sem lead, o % sugerido é 40% para a empresa.
2. **Vendas:** no começo do mês, lance o mês anterior de cada app, com os
   números do relatório da Hotmart, Kiwify etc.:
   - vendas novas;
   - assinantes ativos no fim do mês;
   - cancelamentos;
   - faturamento bruto;
   - taxas da plataforma;
   - reembolsos e chargebacks.

   O formulário mostra a comissão líquida e a parte de cada um enquanto você
   digita.
3. **Custos:** lance cada despesa no dia em que ela aconteceu.
   - **Custo do app** vai no app; **custo da empresa** vai em Geral, incluindo
     os impostos.
   - **IA no app (API)** vai no app que consumiu (use uma chave de API por app).
     **IA de desenvolvimento** vai em Geral.
   - **Rateado com o influenciador?** Marque nos custos que o contrato manda
     dividir, como o tráfego. O influenciador devolve a parte dele, que aparece
     como "acerto a receber".
4. **Resumo** e **Mês a mês:** escolha o período e confira os números.

**Contas** (as mesmas da planilha):

- **Comissão líquida** = faturamento bruto − taxas − reembolsos.
- **Receita da empresa** = comissão líquida × % da empresa.
- **Lucro do app** = receita da empresa − custos do app + acerto a receber.
- **Resultado da empresa** = lucro de todos os apps − custos gerais.
- **Assinantes ativos** e **IA por assinante** usam o último mês do período.

**Regras:**

- **O % fica gravado em cada lançamento.** Mudar o % do app vale para os
  próximos lançamentos; os antigos não mudam. Dá para ajustar o % de um
  lançamento no próprio formulário.
- **Um lançamento de vendas por app por mês.** Para corrigir, edite o que já
  existe.
- **App com lançamentos não pode ser excluído.** Mude o status para
  "Encerrado": sem lançamentos no período, ele some do Resumo.
- **Listas fixas:** as categorias de custo e os status do app são os da
  planilha. Para incluir uma categoria, peça a mudança no código
  ([src/lib/finance/labels.ts](src/lib/finance/labels.ts) e o enum
  `cost_category`).
- **Divisão:** é o % fixo do app desde a primeira venda, como na planilha. A
  regra do escopo de recuperar o setup primeiro não é usada aqui.

## Testes

- **Verificações:**

  ```bash
  npm run typecheck && npm run lint && npm run build
  ```

- **Regras e banco**, contra o banco real, numa transação desfeita no final:

  ```bash
  npx tsx --env-file=.env.local tests/db/etapaN.ts
  ```

  O `tests/db/etapa12.ts` é a auditoria de segurança: RLS, políticas, funções e
  API pública.
- **Telas**, com Playwright e o Chrome do computador, contra um build de produção:

  ```bash
  npx tsx --env-file=.env.local tests/e2e/test-user.ts create   # cria login de teste
  npm run build && npx next start -p 3200                        # em outro terminal
  BASE_URL=http://localhost:3200 npx tsx --env-file=.env.local tests/e2e/etapaN.ts
  npx tsx --env-file=.env.local tests/e2e/cleanup.ts             # apaga dados de teste
  npx tsx --env-file=.env.local tests/e2e/test-user.ts delete    # apaga o login de teste
  ```
