# Central Comercial (CRM + SDR)

Sistema interno para prospectar experts e vender co-produção de apps: experts,
score de qualificação, pipeline, cadências, fila do dia do SDR, templates,
agenda de diagnóstico, propostas com página pública e dashboard.

Escopo completo em [docs/escopo.md](docs/escopo.md). As regras do projeto, as
decisões tomadas e a arquitetura estão em [CLAUDE.md](CLAUDE.md).

**Stack:** Next.js 16 (App Router) + TypeScript, Tailwind CSS 4 + shadcn/ui,
Supabase (Postgres, Auth e Row Level Security), Drizzle ORM e Vercel.

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

## Deploy na Vercel

1. **GitHub.** Envie o código para um repositório **privado**:

   ```bash
   git push -u origin main
   ```

   O repositório remoto configurado hoje (`contatodigitalmakers/coprodu-ao-expert-influencer`)
   tem duas pendências:
   - ele é **público**: deixe-o privado em *Settings → General → Danger Zone →
     Change visibility*, ou crie um repositório novo e privado;
   - a conta `joshceccon` tem só permissão de leitura nele: dê permissão de
     escrita a essa conta, ou envie o código com uma conta que já tenha.
2. **Vercel.** Em [vercel.com](https://vercel.com), clique em *Add New → Project*
   e importe o repositório. A Vercel reconhece o Next.js sozinha.
3. **Variáveis de ambiente** (em *Settings → Environment Variables*), com os
   mesmos valores do `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `DATABASE_URL`: o pooler de **transação**, porta 6543.

   O `DATABASE_URL_MIGRATIONS` não é necessário na Vercel.
4. **Deploy.** As funções rodam em São Paulo (`vercel.json` → `gru1`), perto do
   banco.
5. **Supabase.** Em *Authentication → URL Configuration*, troque o **Site URL**
   pelo endereço da Vercel (ex.: `https://central-comercial.vercel.app`) e
   adicione esse mesmo endereço em **Redirect URLs**.
6. **Teste.** Entre com o seu login, crie uma proposta, marque como enviada e
   abra o link público numa janela anônima.

Quando uma mudança trouxer migration nova, rode `npm run db:migrate` (com o
`.env.local`) antes ou junto do deploy.

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
  a origem "Pesquisa IA", o score e, nas observações, o resumo do perfil, as
  provas (links) e uma mensagem sugerida para a primeira DM.
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
     resumo e mensagem sugerida.
3. Confira a ficha:
   - só os campos vazios são preenchidos, e o que você digitou fica como está;
   - a linha do tempo diz o que a IA preencheu;
   - se o perfil não aparece no buscador, o lead sai da fila com o aviso
     "preencha à mão".

Por baixo, o comando chama `npm run analisar-pendentes` e
`npm run analisar-salvar -- tmp/pesquisa/analise-<data>.json [--simular]`.

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
