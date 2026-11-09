---
description: Pesquisa experts na internet (resultados de buscador e páginas públicas fora das redes sociais) e cadastra os novos no sistema como leads para prospectar.
argument-hint: "[nicho] [quantidade]"
model: sonnet
disable-model-invocation: true
allowed-tools:
  - WebSearch
  - WebFetch
  - Read
  - Write(/tmp/pesquisa/**)
  - Edit(/tmp/pesquisa/**)
  - Bash(npm run pesquisa-existentes)
  - Bash(npm run pesquisa-existentes *)
  - Bash(npm run pesquisa-salvar *)
---

# Pesquisa de experts para prospectar

Argumentos: `$ARGUMENTS` (opcionais: um nicho e/ou uma quantidade, ex.: `Nutrição 5`).

Você encontra experts (pessoas que ensinam algo na internet) para a Central
Comercial prospectar. A empresa faz co-produção de apps com experts: o bom
candidato ensina, tem audiência fiel e, de preferência, já vende curso ou mentoria.
Os leads que você encontra entram no sistema em "Novo lead", sem responsável, para
um humano revisar e prospectar um a um.

## Regras que nunca podem ser quebradas

1. **Nunca abra as redes sociais**: instagram.com, tiktok.com, youtube.com,
   facebook.com e threads.net, nem por WebFetch nem de outro jeito. Sobre esses
   perfis, use só o que o buscador (WebSearch) mostra no resultado: título, link
   e resumo. As páginas das redes também estão bloqueadas nas permissões.
2. **Não invente nada**: URL, @, número de seguidores, produto ou contato. Copie
   cada URL **exatamente** como veio no resultado da busca. O sistema descarta o
   perfil que não apareceu numa busca registrada. Sem fonte, deixe o campo vazio.
3. **Só grave pelos scripts** abaixo. Nunca atribua responsável, nunca inscreva
   em cadência, nunca mande mensagem para ninguém.
4. **Respeite o orçamento do `pesquisa/config.md`**: `max_buscas_por_rodada`
   buscas e `max_leituras_de_pagina_por_rodada` leituras de página. Pare quando
   atingir a quantidade.
5. **Dados pessoais (LGPD)**: WhatsApp e e-mail só se estiverem publicados para
   contato profissional, e sempre com a página onde estavam (`fonteContato`).

## Passos

1. **Leia `pesquisa/config.md`** (Read) e interprete os argumentos:
   - um nicho, que precisa ser o nome de um dos `### Nichos`;
   - e/ou um número, que é a quantidade.

   Sem argumentos, use todos os nichos e o `quantidade_por_rodada`.
2. **Rode `npm run pesquisa-existentes`** para ver a configuração, os nichos e
   quantos perfis já existem.
3. **Planeje a rodada.** Divida a quantidade entre os nichos (ex.: 10 em 4
   nichos = 3, 3, 2, 2) e alterne Instagram, YouTube e TikTok. Procure uns 50% a
   mais de candidatos do que a meta, porque parte será descartada.
4. **Busque com WebSearch**, usando as palavras-chave do nicho e o parâmetro
   `allowed_domains` com o domínio da plataforma. O operador `site:` **não
   funciona** neste buscador: use sempre `allowed_domains`. Modelos:

   | Plataforma | `allowed_domains` | `query` |
   | --- | --- | --- |
   | Instagram | `["instagram.com"]` | `<palavra-chave> curso OR mentoria instagram` |
   | TikTok | `["tiktok.com"]` | `<palavra-chave> dicas tiktok` |
   | YouTube | `["youtube.com"]` | `canal <palavra-chave> aula youtube` |

   - Use `mode: "standard"`.
   - Varie as palavras-chave entre as buscas e não repita a mesma busca.
   - O resultado traz links com títulos e um resumo. No Instagram, o resumo
     costuma ter os seguidores ("22K followers"). No YouTube e no TikTok, em
     geral não tem: deixe `seguidores` vazio, a não ser que uma fonte mostre.
   - Muitos nutricionistas e personais têm menos de 10 mil seguidores. Busque
     termos de quem já é maior: "curso", "mentoria", "método", "programa".
5. **Separe só links de PERFIL.** Use o link de perfil que veio no resultado:
   - `https://www.instagram.com/<usuario>/` (posts `/p/` e reels não servem);
   - `https://www.tiktok.com/@<usuario>`. Se só veio um vídeo
     (`/@<usuario>/video/...`), use `https://www.tiktok.com/@<usuario>`, que é
     o perfil de quem postou;
   - `https://www.youtube.com/@<canal>`, `/c/<nome>` ou `/channel/<id>` (vídeos
     e playlists não servem).

   Pelo título e pelo resumo, fique só com quem é **pessoa**, **ensina**, está
   na **faixa de seguidores** (ou sem número) e não cai em "Descartar" do
   config. Clínicas, lojas e perfis genéricos ("Treino em casa") ficam de fora.
6. **Confira quem é novo:** `npm run pesquisa-existentes -- <link1> <link2> ...`
   com os links escolhidos. Siga só com os `NOVO`. `EXISTE` e `EXCLUÍDO` já foram
   analisados antes.
7. **Complemente os melhores (opcional, dentro do orçamento):**
   - WebSearch `<nome> <@> curso hotmart OR kiwify OR linktree` (sem
     `allowed_domains`, ou com `["linktr.ee", "hotmart.com", "kiwify.com.br"]`);
   - WebFetch em páginas públicas **fora das redes** (Linktree, site, página de
     venda), para descobrir produto, método e contato profissional.
8. **Monte o perfil.** Responda `sim` ou `nao` só com evidência; sem evidência,
   deixe `""`.

   | Campo | Quando é `sim` |
   | --- | --- |
   | `vendeProduto` | há link ou menção a curso, mentoria, e-book ou consultoria (diga qual em `produto` e a fonte em `fonteProduto`) |
   | `temMetodo` | o método tem nome ou há um programa em etapas |
   | `problemaRecorrente` | o público tem uma dor contínua (peso, treino, fé, renda) |
   | `frequenciaConteudo` | o trecho mostra publicações recentes e regulares |

   - `resumo`: 2 a 3 frases sobre quem é, o que ensina e por que é um bom
     candidato.
   - `mensagemSugerida`: a primeira DM. Curta, com o primeiro nome, citando algo
     específico do perfil, apresentando a co-produção de app sem prometer ganhos.
9. **Escreva o arquivo da rodada** em `tmp/pesquisa/AAAA-MM-DD-HHMM.json`, com a
   data e a hora atuais, neste formato. Seguidores vão como texto, como
   apareceram: "48K", "12,5 mil", "1.2M".

   ```json
   {
     "rodada": "2026-11-09T22:00",
     "candidatos": [
       {
         "nome": "Ana Souza",
         "handle": "ana.nutri",
         "plataforma": "instagram",
         "profileUrl": "https://www.instagram.com/ana.nutri/",
         "nicho": "Nutrição",
         "seguidores": "48K",
         "cidade": "",
         "whatsapp": "",
         "email": "",
         "fonteContato": "",
         "vendeProduto": "sim",
         "produto": "Curso Emagrece 30",
         "fonteProduto": "https://hotmart.com/...",
         "temMetodo": "sim",
         "problemaRecorrente": "sim",
         "frequenciaConteudo": "",
         "resumo": "Nutricionista que ensina reeducação alimentar para mulheres...",
         "mensagemSugerida": "Oi, Ana! Vi seu conteúdo sobre...",
         "provas": [
           { "url": "https://www.instagram.com/ana.nutri/", "trecho": "48K Followers · Nutricionista..." }
         ]
       }
     ]
   }
   ```

10. **Simule:** `npm run pesquisa-salvar -- <arquivo> --simular`. Se você recebeu
    uma quantidade nos argumentos, acrescente `--quantidade <N>`.
    - Corrija só erros de formato e rode a simulação no máximo mais uma vez.
    - Nunca "conserte" um descarte por prova ou nicho inventando dado.
11. **Grave:** `npm run pesquisa-salvar -- <arquivo>`, com os mesmos parâmetros.
12. **Resuma para o usuário, em português:**
    - os criados: nome, @, plataforma e uma linha do porquê;
    - os descartados, com o motivo;
    - os avisos;
    - o link "Lista para revisar" que o script mostrou.

    Lembre ao usuário que os leads entram sem responsável, em "Novo lead", e que
    **excluir** um lead o tira das próximas pesquisas.
