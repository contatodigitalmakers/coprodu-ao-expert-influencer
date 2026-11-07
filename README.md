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
