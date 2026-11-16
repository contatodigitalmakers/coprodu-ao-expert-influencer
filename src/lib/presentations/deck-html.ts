// Página da apresentação (22 slides), usada pelo link curto (/a/<código>) e pela
// prévia do gerador (/apresentacoes/previa). Veio do index.html do antigo site
// ppt_influenciadores.
//
// Para mudar um texto fixo de um slide, edite o <section data-slide="N"> em BODY.
// As notas do apresentador ficam no <aside class="notes"> de cada slide.
// CSS, JS, logotipo e vídeos ficam em public/apresentacao/ (padrões em js/config.js).

const ASSETS = "/apresentacao";
// Troque ao mudar um CSS ou JS de public/apresentacao, para o navegador não usar o antigo.
const VERSION = "crm1";

export type DeckData = Record<string, string>;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

// JSON seguro dentro de <script>: nenhum valor consegue fechar a tag.
function scriptJson(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// data = dados salvos da apresentação (link curto). Sem dados, a apresentação
// lê a URL (?d=...), como na prévia do gerador.
export function renderDeckHtml({ data, origin }: { data: DeckData | null; origin: string }) {
  const company = data?.empresa || "Digital Makerss";
  const title = data?.expert ? `O app de ${data.expert} · ${company}` : `${company} · Co-produção de apps`;
  const asset = (path: string) => `${ASSETS}/${path}?v=${VERSION}`;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<meta name="description" content="Seu método dentro de um app próprio: uma assinatura com a sua marca.">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="Seu conhecimento virando uma assinatura com a sua marca.">
<meta property="og:image" content="${escapeHtml(origin)}${ASSETS}/assets/og.png">
<meta name="theme-color" content="#050706">
<link rel="icon" href="${ASSETS}/assets/logo/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="${asset("css/tokens.css")}">
<link rel="stylesheet" href="${asset("css/nexo.css")}">
<link rel="stylesheet" href="${asset("css/deck.css")}">
${data ? `<script>window.DM_DADOS = ${scriptJson(data)};</script>\n` : ""}<script defer src="${asset("js/config.js")}"></script>
<script defer src="${asset("js/params.js")}"></script>
<script defer src="${asset("js/render.js")}"></script>
<script defer src="${asset("js/viz.js")}"></script>
<script defer src="${asset("js/deck.js")}"></script>
</head>
${BODY}`;
}

const BODY = `<body>

<!-- Ícones lineares (estilo Lucide: 24px, traço 1.75, pontas arredondadas) -->
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-users" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></symbol>
  <symbol id="i-chats" viewBox="0 0 24 24"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/></symbol>
  <symbol id="i-power" viewBox="0 0 24 24"><path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/></symbol>
  <symbol id="i-bag" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></symbol>
  <symbol id="i-calendar" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/></symbol>
  <symbol id="i-chart" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></symbol>
  <symbol id="i-phone" viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></symbol>
  <symbol id="i-repeat" viewBox="0 0 24 24"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></symbol>
  <symbol id="i-book" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></symbol>
  <symbol id="i-card" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/></symbol>
  <symbol id="i-bell" viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></symbol>
  <symbol id="i-sparkle" viewBox="0 0 24 24"><path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/><path d="M19 3v4M21 5h-4"/></symbol>
  <symbol id="i-star" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></symbol>
  <symbol id="i-blocks" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></symbol>
  <symbol id="i-megaphone" viewBox="0 0 24 24"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></symbol>
  <symbol id="i-undo" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></symbol>
  <symbol id="i-pie" viewBox="0 0 24 24"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></symbol>
  <symbol id="i-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></symbol>
  <symbol id="i-zap" viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></symbol>
  <symbol id="i-rocket" viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></symbol>
  <symbol id="i-down" viewBox="0 0 24 24"><path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/></symbol>
  <symbol id="i-key" viewBox="0 0 24 24"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></symbol>
  <symbol id="i-shield" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></symbol>
  <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
  <symbol id="i-chat" viewBox="0 0 24 24"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></symbol>
  <symbol id="i-flag" viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/></symbol>
</svg>

<noscript><p style="padding:24px;font-family:sans-serif">Ative o JavaScript para ver a apresentação.</p></noscript>

<div class="progress" aria-hidden="true"><i id="progress-bar"></i></div>

<main class="viewport" id="viewport">
<div class="stage" id="stage">

  <!-- ============ 01 · CAPA ============ -->
  <section class="slide s-01 nx-grid-bg" data-slide="1" data-foot="Conversa de diagnóstico · {data}" aria-label="Capa">
    <div class="nx-orb" style="top:-140px;right:-160px"></div>
    <div class="nx-scanline"></div>
    <div class="slide-body">
      <div class="s01-cols">
        <div>
          <span class="nx-badge"><span class="nx-dot"></span>Co-produção de apps</span>
          <h1 class="nx-headline nx-reveal h-cover" data-words="O método de {expert} / dentro de um / *app próprio*" data-need="expert" data-alt="O seu método / dentro de um / *app próprio*" data-caret></h1>
          <p class="nx-sub">Seu conhecimento virando uma assinatura com a sua marca.</p>
        </div>
        <div class="phone-col">
          <div class="phone-wrap" data-phone="splash"></div>
        </div>
      </div>
    </div>
    <aside class="notes">
      <p>Agradeça o tempo e diga que esta conversa foi preparada especialmente para <span data-f="expert" data-fallback="o expert"></span>.</p>
      <p>Mostre o celular: “esse é um primeiro rascunho do seu app, com o seu nome”.</p>
    </aside>
  </section>

  <!-- ============ 02 · AGENDA ============ -->
  <section class="slide s-02" data-slide="2" aria-label="O que vamos fazer">
    <div class="slide-body">
      <span class="nx-eyebrow">01 — Abertura</span>
      <h2 class="nx-headline nx-reveal h-lg" data-words="O que vamos fazer nos / próximos *40 minutos*"></h2>
      <div class="nx-steps s02-steps" style="--n:3">
        <div class="nx-step"><div class="nx-step-num" style="--i:0">01</div><h4>Entender seu momento</h4><p>Retomar o que você nos contou e o que quer construir.</p></div>
        <div class="nx-step"><div class="nx-step-num" style="--i:1">02</div><h4>Mostrar o caminho</h4><p>Como seu método vira um app de assinatura, com casos reais.</p></div>
        <div class="nx-step"><div class="nx-step-num" style="--i:2">03</div><h4>Decidir juntos</h4><p>Se fizer sentido, qual modelo de parceria encaixa melhor.</p></div>
      </div>
    </div>
    <aside class="notes">
      <p>Combine o combinado: 40 minutos, três partes.</p>
      <p>Deixe claro que a decisão é no fim e só se fizer sentido. Isso baixa a guarda.</p>
    </aside>
  </section>

  <!-- ============ 03 · O QUE VOCÊ NOS CONTOU ============ -->
  <section class="slide s-03" data-slide="3" data-require="audiencia vendas acompanha dor objetivo" aria-label="O que você nos contou">
    <div class="slide-body">
      <span class="nx-eyebrow">01 — Abertura</span>
      <h2 class="nx-headline nx-reveal h-lg" data-words="O que você nos *contou* até aqui"></h2>
      <div class="ficha">
        <div class="ficha-head"><span>Tema</span><span>Sua realidade hoje</span></div>
        <div class="ficha-row" data-if="audiencia" style="--i:0"><span class="ficha-k"><svg><use href="#i-users"/></svg>Audiência</span><span class="ficha-v" data-f="audiencia"></span></div>
        <div class="ficha-row" data-if="vendas" style="--i:1"><span class="ficha-k"><svg><use href="#i-bag"/></svg>O que você vende</span><span class="ficha-v" data-f="vendas"></span></div>
        <div class="ficha-row" data-if="acompanha" style="--i:2"><span class="ficha-k"><svg><use href="#i-chats"/></svg>Acompanhamento dos alunos</span><span class="ficha-v" data-f="acompanha"></span></div>
        <div class="ficha-row is-pain" data-if="dor" style="--i:3"><span class="ficha-k"><svg><use href="#i-down"/></svg>O que te incomoda</span><span class="ficha-v"><q data-f="dor"></q></span></div>
        <div class="ficha-row is-goal" data-if="objetivo" style="--i:4"><span class="ficha-k"><svg><use href="#i-flag"/></svg>Onde quer chegar</span><span class="ficha-v"><span data-f="objetivo"></span><svg class="goal-arrow"><use href="#i-arrow"/></svg></span></div>
      </div>
    </div>
    <aside class="notes">
      <p>Leia em voz alta e pergunte: “é isso mesmo? mudou alguma coisa?”.</p>
      <p>Demore na dor. É ela que justifica tudo o que vem depois.</p>
    </aside>
  </section>

  <!-- ============ 04 · JEITOS DE GANHAR ============ -->
  <section class="slide s-04" data-slide="4" data-foot="{empresa} · Comparação de modelos" aria-label="Jeitos de ganhar com a audiência">
    <div class="slide-body">
      <span class="nx-eyebrow">02 — O cenário</span>
      <h2 class="nx-headline nx-reveal h-md" data-words="Quatro caminhos. / O app é o que *fica.*"></h2>
      <div class="g g-4 cards-row ways">
        <article class="nx-card c-sm">
          <div class="nx-icon"><svg><use href="#i-megaphone"/></svg></div>
          <h3 class="nx-card-title">Publis</h3>
          <p class="nx-card-text">A marca paga pela campanha. A renda existe enquanto o contrato existe.</p>
        </article>
        <article class="nx-card c-sm">
          <div class="nx-icon"><svg><use href="#i-bag"/></svg></div>
          <h3 class="nx-card-title">Afiliados</h3>
          <p class="nx-card-text">Comissão por indicar o produto de outro. O cliente e a oferta não são seus.</p>
        </article>
        <article class="nx-card c-sm">
          <div class="nx-icon"><svg><use href="#i-book"/></svg></div>
          <h3 class="nx-card-title">Curso e mentoria</h3>
          <p class="nx-card-text">A pessoa compra um ciclo. Quando o ciclo acaba, o método não tem onde continuar.</p>
        </article>
        <article class="nx-card c-sm nx-card-glow">
          <div class="nx-icon"><svg><use href="#i-phone"/></svg></div>
          <h3 class="nx-card-title">App próprio</h3>
          <p class="nx-card-text">O método vira assinatura. Uso todo dia, cobrança todo mês, base que permanece.</p>
        </article>
      </div>
      <p class="callout">Publis, afiliado e curso usam a audiência. O app transforma a audiência num produto seu.</p>
    </div>
    <aside class="notes">
      <p>Pergunte quais desses caminhos ela usa hoje. Não presuma um modelo só.</p>
      <p>Feche no app: é o único em que a audiência vira um ativo dela.</p>
    </aside>
  </section>

  <!-- ============ 05 · POR QUE TER UM APP ============ -->
  <section class="slide s-05" data-slide="5" aria-label="Por que ter um app">
    <div class="slide-body">
      <span class="nx-eyebrow">02 — O cenário</span>
      <h2 class="nx-headline nx-reveal h-lg" data-words="Por que ter um app / *muda* o jogo"></h2>
      <div class="g g-3 cards-row">
        <article class="nx-card">
          <div class="nx-icon"><svg><use href="#i-users"/></svg></div>
          <h3 class="nx-card-title">A audiência ganha um lugar</h3>
          <p class="nx-card-text">No feed, o conteúdo passa. No app, a pessoa volta e segue o método no próprio ritmo.</p>
        </article>
        <article class="nx-card">
          <div class="nx-icon"><svg><use href="#i-key"/></svg></div>
          <h3 class="nx-card-title">O produto é seu</h3>
          <p class="nx-card-text">Publi e afiliado alugam a sua atenção. O app é um produto com a sua marca e o seu nome.</p>
        </article>
        <article class="nx-card nx-card-glow">
          <div class="nx-icon"><svg><use href="#i-repeat"/></svg></div>
          <h3 class="nx-card-title">A relação continua</h3>
          <p class="nx-card-text">Quem entra permanece. Cada mês a base de antes se soma a quem chegou agora.</p>
        </article>
      </div>
    </div>
    <aside class="notes">
      <p>O ponto é posse: sem app, a audiência continua emprestada.</p>
      <p>Pergunte onde os alunos estão hoje quando querem seguir o método.</p>
    </aside>
  </section>

  <!-- ============ 06 · A VIRADA ============ -->
  <section class="slide s-06 nx-grid-bg" data-slide="6" aria-label="A virada">
    <div class="nx-orb" style="top:40px;left:300px"></div>
    <div class="nx-scanline"></div>
    <div class="slide-body is-center">
      <span class="nx-eyebrow">03 — A virada</span>
      <h2 class="nx-headline nx-reveal h-xl" data-words="E se o seu método virasse / um *aplicativo* que seus / alunos usam todo dia?" data-caret></h2>
      <p class="nx-sub">Com a sua marca, no celular deles, gerando receita todo mês.</p>
    </div>
    <aside class="notes">
      <p>Pausa. Deixe a pergunta no ar alguns segundos antes de avançar.</p>
    </aside>
  </section>

  <!-- ============ 07 · POR QUE UM APP ============ -->
  <section class="slide s-07" data-slide="7" aria-label="Por que um app">
    <div class="slide-body">
      <span class="nx-eyebrow">04 — A visão</span>
      <h2 class="nx-headline nx-reveal h-lg" data-words="O que o app faz / *melhor* que o resto"></h2>
      <div class="g g-4 cards-row">
        <article class="nx-card c-sm">
          <div class="nx-icon"><svg><use href="#i-calendar"/></svg></div>
          <h3 class="nx-card-title">Hábito diário</h3>
          <p class="nx-card-text">O aluno abre o app todo dia e segue o método. Não depende de um conteúdo que passa.</p>
        </article>
        <article class="nx-card c-sm">
          <div class="nx-icon"><svg><use href="#i-chart"/></svg></div>
          <h3 class="nx-card-title">Resultado visível</h3>
          <p class="nx-card-text">O progresso fica registrado. Quem vê resultado continua pagando.</p>
        </article>
        <article class="nx-card c-sm">
          <div class="nx-icon"><svg><use href="#i-phone"/></svg></div>
          <h3 class="nx-card-title">Sua marca no celular do aluno</h3>
          <p class="nx-card-text">Seu nome e seu método na tela inicial, não numa plataforma genérica.</p>
        </article>
        <article class="nx-card c-sm nx-card-glow">
          <div class="nx-icon"><svg><use href="#i-repeat"/></svg></div>
          <h3 class="nx-card-title">Receita que se repete</h3>
          <p class="nx-card-text">Assinatura mensal ou anual, cobrada automaticamente.</p>
        </article>
      </div>
    </div>
    <aside class="notes">
      <p>O card com a borda acesa é o que importa: receita que se repete.</p>
    </aside>
  </section>

  <!-- ============ 08 · O APP DO EXPERT ============ -->
  <section class="slide s-08" data-slide="8" aria-label="O app do expert">
    <div class="slide-body">
      <div class="s08-cols">
        <div>
          <span class="nx-eyebrow">04 — A visão</span>
          <h2 class="nx-headline nx-reveal h-lg" data-words="O app de / *{expert}*" data-need="expert" data-alt="O *seu* app"></h2>
          <p class="lead">Um rascunho feito para você, com a sua marca e o seu método.</p>
          <ul class="checks">
            <li style="--i:0"><span class="check"><svg><use href="#i-check"/></svg></span><span data-f="f1" data-fallback="A funcionalidade principal do seu nicho"></span></li>
            <li style="--i:1"><span class="check"><svg><use href="#i-check"/></svg></span><span data-f="f2" data-fallback="Conteúdo do método organizado em trilhas"></span></li>
            <li style="--i:2"><span class="check"><svg><use href="#i-check"/></svg></span><span data-f="f3" data-fallback="Comunidade e acompanhamento"></span></li>
          </ul>
        </div>
        <div class="phone-col">
          <div class="nx-orb" style="top:10px;left:-40px"></div>
          <div class="phone-wrap" data-phone="home"></div>
        </div>
      </div>
    </div>
    <aside class="notes">
      <p>É o mesmo mockup enviado na DM. Pergunte o que mudaria nele.</p>
      <p>Quanto mais o expert opinar aqui, mais o app já é “dele”.</p>
    </aside>
  </section>

  <!-- ============ 09 · O QUE VAI DENTRO DO APP ============ -->
  <section class="slide s-09" data-slide="9" aria-label="O que vai dentro do app">
    <div class="slide-body">
      <span class="nx-eyebrow">04 — A visão</span>
      <h2 class="nx-headline nx-reveal h-lg" data-words="O que vai *dentro* do app"></h2>
      <div class="mods">
        <div class="mods-head"><span>Módulo</span><span>O que faz</span><span>Tipo</span></div>
        <div class="mods-row" style="--i:0"><span class="mods-name"><span class="mini-ico"><svg><use href="#i-book"/></svg></span>Conteúdo do método</span><span>Aulas, materiais e trilhas</span><span><span class="nx-badge nx-badge-neutral">Base</span></span></div>
        <div class="mods-row" style="--i:1"><span class="mods-name"><span class="mini-ico"><svg><use href="#i-card"/></svg></span>Assinatura</span><span>Cobrança mensal ou anual automática</span><span><span class="nx-badge nx-badge-neutral">Base</span></span></div>
        <div class="mods-row" style="--i:2"><span class="mods-name"><span class="mini-ico"><svg><use href="#i-users"/></svg></span>Comunidade</span><span>Alunos interagindo entre si e com você</span><span><span class="nx-badge nx-badge-neutral">Base</span></span></div>
        <div class="mods-row" style="--i:3"><span class="mods-name"><span class="mini-ico"><svg><use href="#i-bell"/></svg></span>Notificações</span><span>Lembretes que trazem o aluno de volta</span><span><span class="nx-badge nx-badge-neutral">Base</span></span></div>
        <div class="mods-row" style="--i:4"><span class="mods-name"><span class="mini-ico"><svg><use href="#i-sparkle"/></svg></span>Assistente com IA</span><span>Tira dúvidas a partir do seu conteúdo</span><span><span class="nx-badge nx-badge-neutral">Base</span></span></div>
        <div class="mods-row is-exclusive" style="--i:5"><span class="mods-name"><span class="mini-ico"><svg><use href="#i-star"/></svg></span><span data-f="modulo" data-fallback="Módulo do seu nicho"></span></span><span data-f="modulo_desc" data-fallback="Ex.: plano alimentar, ficha de treino"></span><span><span class="nx-badge nx-badge-solid">Exclusivo</span></span></div>
      </div>
    </div>
    <aside class="notes">
      <p>Os cinco primeiros vêm em todo app. O último é feito sob medida para o nicho.</p>
    </aside>
  </section>

  <!-- ============ 10 · MARCO 2026 ============ -->
  <section class="slide s-marco nx-grid-bg" data-slide="10" data-foot="{empresa} · Faturamento de apps em 2026" aria-label="Faturamento em 2026">
    <div class="nx-orb" style="top:-80px;right:-120px"></div>
    <div class="nx-scanline"></div>
    <div class="slide-body is-center">
      <span class="nx-eyebrow">05 — Prova</span>
      <p class="marco-kicker">Faturamento vendendo apps</p>
      <p class="marco-num" data-f="faturamento_2026"></p>
      <h2 class="nx-headline nx-reveal h-lg" data-words="Em 2026. Agora estamos / *escalando* a operação."></h2>
    </div>
    <aside class="notes">
      <p>Ancore aqui: mais de R$ 1,3 milhão vendendo apps, e a operação está abrindo novas parcerias.</p>
      <p>Não prometa o número dele. O número é o nosso.</p>
    </aside>
  </section>

  <!-- ============ 11 · PARCEIROS ============ -->
  <section class="slide s-10" data-slide="11" data-require="cases" data-foot="{empresa} · Dados usados com autorização" aria-label="Quem já fez com a gente">
    <div class="slide-body">
      <span class="nx-eyebrow">05 — Prova</span>
      <h2 class="nx-headline nx-reveal h-md" data-words="Quem já colocou o método / num *app*"></h2>
      <div class="partner-grid" data-mount="cases"></div>
    </div>
    <aside class="notes">
      <p>Conte uma história de verdade: de onde a pessoa saiu e o que mudou com o app.</p>
      <p>Se o slide não aparecer, a lista cases em js/config.js ainda está vazia.</p>
    </aside>
  </section>

  <!-- ============ 12 · PRINTS ============ -->
  <section class="slide s-11" data-slide="12" data-require="prints" data-foot="{empresa} · Dados de alunos ocultados" aria-label="Resultados dentro do app">
    <div class="slide-body">
      <span class="nx-eyebrow">05 — Prova</span>
      <h2 class="nx-headline nx-reveal h-md" data-words="O resultado aparece / *dentro* do app"></h2>
      <div class="g s11-prints" data-mount="prints"></div>
    </div>
    <aside class="notes">
      <p>Mostre o print, não o discurso. Assinatura, feedback, progresso.</p>
    </aside>
  </section>

  <!-- ============ 13 · VÍDEOS ============ -->
  <section class="slide s-videos" data-slide="13" data-require="videos" data-foot="{empresa} · Resultados em vídeo" aria-label="Vídeos de resultado">
    <div class="slide-body">
      <span class="nx-eyebrow">05 — Prova</span>
      <h2 class="nx-headline nx-reveal h-md" data-words="As vendas, *ao vivo*"></h2>
      <div class="video-grid" data-mount="videos"></div>
    </div>
    <aside class="notes">
      <p>Os vídeos começam sozinhos e ficam em loop. Deixe a pessoa ver as notificações. Não narre por cima.</p>
    </aside>
  </section>

  <!-- ============ 14 · COMO FUNCIONA A CO-PRODUÇÃO ============ -->
  <section class="slide s-12" data-slide="14" aria-label="Como funciona a co-produção">
    <div class="slide-body">
      <span class="nx-eyebrow">06 — O caminho</span>
      <h2 class="nx-headline nx-reveal h-lg" data-words="Como funciona a *co-produção*"></h2>
      <div class="s12-grid">
        <article class="nx-card side">
          <span class="nx-badge nx-badge-neutral">Você entra com</span>
          <ul class="bul">
            <li>Seu método e seu conteúdo</li>
            <li>Sua audiência e sua autoridade</li>
            <li>Presença na divulgação e no lançamento</li>
          </ul>
        </article>
        <div class="s12-link" aria-hidden="true"><i class="link-line"></i><span class="link-node"><span class="nx-dot"></span></span></div>
        <article class="nx-card side is-us">
          <span class="nx-badge">Nós entramos com</span>
          <ul class="bul">
            <li>App, plataforma, IA e equipe</li>
            <li>Página de vendas, checkout e funil</li>
            <li>Roteiros e orientação de gravação</li>
            <li>Suporte técnico e melhorias contínuas</li>
          </ul>
        </article>
      </div>
      <p class="pact"><svg><use href="#i-shield"/></svg><span><b>Você não paga o app.</b> Deixa um caução, que volta inteiro. Nossa parte vem da receita — só depois disso.</span></p>
    </div>
    <aside class="notes">
      <p>O ponto verde no meio é a parceria. Antecipe: o valor não é preço, é caução.</p>
    </aside>
  </section>

  <!-- ============ 15 · DO SIM AO LANÇAMENTO ============ -->
  <section class="slide s-13" data-slide="15" aria-label="Do sim ao lançamento">
    <div class="slide-body">
      <span class="nx-eyebrow">06 — O caminho</span>
      <h2 class="nx-headline nx-reveal h-lg" data-words="Do “sim” ao lançamento / em *{semanas_txt}*" data-need="semanas_txt" data-alt="Do “sim” ao *lançamento*"></h2>
      <div class="nx-steps s13-row" style="--n:4">
        <div class="nx-step"><div class="nx-step-num" style="--i:0">01</div><h4>Kickoff</h4><p>Objetivos, prazos e responsabilidades.</p></div>
        <div class="nx-step"><div class="nx-step-num" style="--i:1">02</div><h4>Grupo de WhatsApp</h4><p>Criamos o grupo de contato do projeto.</p></div>
        <div class="nx-step"><div class="nx-step-num" style="--i:2">03</div><h4>Coleta</h4><p>Método, materiais e identidade visual.</p></div>
        <div class="nx-step"><div class="nx-step-num" style="--i:3">04</div><h4>Escopo</h4><p>O que entra na primeira versão.</p></div>
      </div>
      <div class="nx-steps s13-row is-second" style="--n:4">
        <div class="nx-step"><div class="nx-step-num" style="--i:4">05</div><h4>Desenvolvimento</h4><p>O app na sua marca, na nossa plataforma.</p></div>
        <div class="nx-step"><div class="nx-step-num" style="--i:5">06</div><h4>Página e aquecimento</h4><p>Vendas, checkout e conteúdos de divulgação.</p></div>
        <div class="nx-step"><div class="nx-step-num" style="--i:6">07</div><h4>Lançamento</h4><p>Abrimos as vendas e acompanhamos os números.</p></div>
        <div class="nx-step"><div class="nx-step-num" style="--i:7">08</div><h4>Dois encontros</h4><p>Depois do app no ar, alinhamos a venda orgânica.</p></div>
      </div>
    </div>
    <aside class="notes">
      <p>No passo 02, o grupo de WhatsApp vira o canal de contato do projeto.</p>
      <p>O passo 08, os dois encontros de venda, já está incluso. Não é um extra.</p>
    </aside>
  </section>

  <!-- ============ 16 · CALCULADORA ============ -->
  <section class="slide s-14" data-slide="16" data-foot="{empresa} · Projeção, não promessa de resultado" aria-label="Quanto isso pode representar para você">
    <div class="slide-body">
      <span class="nx-eyebrow">06 — O caminho</span>
      <h2 class="nx-headline nx-reveal h-lg" data-words="Quanto isso pode / *representar* para você"></h2>
      <div class="calc" data-calc>
        <div class="calc-row">
          <div class="calc-cell">
            <label class="calc-k" for="calc-seg">Seguidores</label>
            <output class="calc-v" data-out="seg">200 mil</output>
            <input class="calc-range" type="range" id="calc-seg" data-in="seg" min="0" max="1000" step="1" aria-label="Seguidores">
          </div>
          <span class="calc-op" aria-hidden="true">×</span>
          <div class="calc-cell">
            <label class="calc-k" for="calc-conv">% que assina</label>
            <output class="calc-v" data-out="conv">1%</output>
            <input class="calc-range" type="range" id="calc-conv" data-in="conv" min="0.1" max="5" step="0.1" aria-label="Porcentagem que assina">
          </div>
          <span class="calc-op" aria-hidden="true">×</span>
          <div class="calc-cell">
            <label class="calc-k" for="calc-preco">Preço por mês</label>
            <output class="calc-v" data-out="preco">R$ 39</output>
            <input class="calc-range" type="range" id="calc-preco" data-in="preco" min="9" max="199" step="1" aria-label="Preço por mês">
          </div>
        </div>
        <div class="calc-result">
          <span class="calc-op is-eq" aria-hidden="true">=</span>
          <div>
            <span class="calc-k">Receita por mês</span>
            <output class="calc-total" data-out="total" aria-live="polite">R$ 78 mil</output>
          </div>
          <dl class="calc-meta">
            <div><dt>Assinantes</dt><dd data-out="subs">2.000</dd></div>
            <div><dt>Por ano</dt><dd data-out="year">R$ 936 mil</dd></div>
            <div data-if="voce"><dt>Sua parte (<span data-f="voce"></span>)</dt><dd data-out="share">R$ 54,6 mil</dd></div>
          </dl>
        </div>
      </div>
      <p class="calc-example">Exemplo ilustrativo: 200 mil seguidores × 1% × R$ 39 = R$ 78 mil por mês.</p>
      <p class="calc-note" data-tpl="Até recuperar o caução de {caucao}, 100% das vendas é seu. Depois, sua parte é {voce}. Conversão e cancelamentos variam por nicho — os números reais a gente mede no lançamento." data-need="caucao voce" data-alt="Até recuperar o caução, 100% das vendas é seu. Depois, vale a divisão do plano. Os números reais a gente mede no lançamento."></p>
    </div>
    <aside class="notes">
      <p>Peça para o expert dizer um preço que ele cobraria. Mexa os controles ao vivo.</p>
      <p>Reforce: é projeção. O número real a gente mede depois do lançamento.</p>
    </aside>
  </section>

  <!-- ============ 17 · CAUÇÃO ============ -->
  <section class="slide s-15" data-slide="17" aria-label="Você não paga o app">
    <div class="slide-body">
      <span class="nx-eyebrow">06 — O caminho</span>
      <h2 class="nx-headline nx-reveal h-lg" data-words="Você não paga o app. / Mas precisamos de uma *garantia.*"></h2>
      <div class="g g-3 cards-row">
        <article class="nx-card c-sm">
          <div class="nx-icon"><svg><use href="#i-blocks"/></svg></div>
          <h3 class="nx-card-title">Para o projeto começar</h3>
          <p class="nx-card-text">IA, equipe e operação custam antes da primeira venda. O caução deixa isso viável. Não é o preço do app.</p>
        </article>
        <article class="nx-card c-sm nx-card-glow">
          <div class="nx-icon"><svg><use href="#i-shield"/></svg></div>
          <h3 class="nx-card-title">Garantia da entrega</h3>
          <p class="nx-card-text">O caução também garante você: o app será entregue. Se não entregarmos, 100% do valor volta.</p>
        </article>
        <article class="nx-card c-sm">
          <div class="nx-icon"><svg><use href="#i-undo"/></svg></div>
          <h3 class="nx-card-title">E volta com as vendas</h3>
          <p class="nx-card-text">Com o app no ar, até completar o caução, 100% das vendas fica com você. Só depois vale a divisão.</p>
        </article>
      </div>
      <p class="callout">As duas coisas ficam no contrato: a entrega do app e a devolução integral do caução se ela não acontecer.</p>
    </div>
    <aside class="notes">
      <p>O caução protege os dois lados. Para a gente, viabiliza o projeto. Para ele, garante a entrega.</p>
      <p>Se o app não for entregue, 100% volta. Isso está no contrato. Com o app no ar, o valor volta pelas vendas.</p>
    </aside>
  </section>

  <!-- ============ 18 · TRÊS PLANOS ============ -->
  <section class="slide s-16" data-slide="18" data-foot="{empresa} · O caução volta inteiro" aria-label="Três planos de parceria">
    <div class="slide-body">
      <span class="nx-eyebrow">06 — O caminho</span>
      <div class="s16-head">
        <h2 class="nx-headline nx-reveal h-lg" data-words="Três formas de *começar*"></h2>
        <p class="lead">Em todos os planos o caução volta inteiro nas primeiras vendas. Até lá, 100% é seu.</p>
      </div>
      <div class="g g-3 offers" data-mount="planos"></div>
      <p class="incl"><svg><use href="#i-check"/></svg>Nas três opções: app, página de vendas, checkout, orientação de conteúdo e 2 encontros de venda orgânica depois do lançamento.</p>
    </div>
    <aside class="notes">
      <p>Comece pelo 60% para o influenciador, 40% para a gente, caução de R$ 4 mil.</p>
      <p>Deixe claro: o caução volta antes de qualquer divisão. Pergunte qual dos três faz mais sentido.</p>
    </aside>
  </section>

  <!-- ============ 19 · TRÁFEGO OPCIONAL ============ -->
  <section class="slide s-17" data-slide="19" aria-label="Para acelerar">
    <div class="slide-body">
      <div class="eyebrow-row"><span class="nx-eyebrow">06 — O caminho</span><span class="nx-badge nx-badge-neutral">Opcional</span></div>
      <h2 class="nx-headline nx-reveal h-lg" data-words="Se quiser acelerar: / *tráfego pago*"></h2>
      <div class="g g-2 cards-row">
        <article class="nx-card">
          <div class="nx-icon"><svg><use href="#i-zap"/></svg></div>
          <h3 class="nx-card-title">Tráfego pago</h3>
          <p class="nx-card-text">Campanhas para levar novos assinantes até o app, além da sua audiência.</p>
        </article>
        <article class="nx-card">
          <div class="nx-icon"><svg><use href="#i-rocket"/></svg></div>
          <h3 class="nx-card-title">Lançamentos e relançamentos</h3>
          <p class="nx-card-text">Planejamento e execução de campanhas de abertura de vendas.</p>
        </article>
      </div>
      <p class="note">Os 2 encontros de venda orgânica já estão inclusos. Isto aqui é extra, com valor combinado à parte.</p>
    </div>
    <aside class="notes">
      <p>Só aprofunde se a pessoa perguntar de anúncio. A venda orgânica já faz parte do plano.</p>
    </aside>
  </section>

  <!-- ============ 20 · PERGUNTAS ============ -->
  <section class="slide s-18" data-slide="20" aria-label="Perguntas que costumam aparecer">
    <div class="slide-body">
      <span class="nx-eyebrow">07 — Fechamento</span>
      <h2 class="nx-headline nx-reveal h-md" data-words="Perguntas que costumam *aparecer*"></h2>
      <div class="g g-2 faq">
        <article class="faq-item" style="--i:0">
          <h3><svg><use href="#i-clock"/></svg>Quanto do meu tempo isso exige?</h3>
          <p data-tpl="Gravação de conteúdo e presença na divulgação, cerca de {horas_txt} por semana. Tecnologia e estrutura ficam com a gente." data-need="horas_txt" data-alt="Gravação de conteúdo e presença na divulgação. Tecnologia e estrutura ficam com a gente."></p>
        </article>
        <article class="faq-item" style="--i:1">
          <h3><svg><use href="#i-key"/></svg>De quem é o app?</h3>
          <p data-f="dono"></p>
        </article>
        <article class="faq-item" style="--i:2">
          <h3><svg><use href="#i-shield"/></svg>Por que um caução, se vocês ganham comissão?</h3>
          <p>Desenvolver custa IA, equipe e operação. O caução viabiliza o projeto e garante a entrega: se o app não for entregue, 100% volta, em contrato.</p>
        </article>
        <article class="faq-item" style="--i:3">
          <h3><svg><use href="#i-undo"/></svg>Quando o caução volta?</h3>
          <p data-tpl="Nas primeiras vendas. Até completar {caucao}, 100% do faturamento fica com você. Só depois começa a divisão do plano." data-need="caucao" data-alt="Nas primeiras vendas. Até completar o valor, 100% do faturamento fica com você. Só depois começa a divisão do plano."></p>
        </article>
      </div>
    </div>
    <aside class="notes">
      <p>Se a objeção do caução já apareceu, vá direto nela: volta inteiro, nas vendas, antes da divisão.</p>
    </aside>
  </section>

  <!-- ============ 21 · PRÓXIMOS PASSOS ============ -->
  <section class="slide s-19" data-slide="21" aria-label="Próximos passos">
    <div class="slide-body">
      <span class="nx-eyebrow">07 — Fechamento</span>
      <h2 class="nx-headline nx-reveal h-lg" data-words="Próximos *passos*"></h2>
      <div class="nx-steps s19-steps" style="--n:3">
        <div class="nx-step is-now"><div class="nx-step-num" style="--i:0">01</div><h4>Escolher o plano</h4><p><span class="nx-badge"><span class="nx-dot"></span>Hoje</span>Nesta conversa</p></div>
        <div class="nx-step"><div class="nx-step-num" style="--i:1">02</div><h4>Contrato e depósito do caução</h4><p data-tpl="Enviamos o contrato em até {contrato_txt}" data-need="contrato_txt" data-alt="Enviamos o contrato para a sua revisão"></p></div>
        <div class="nx-step"><div class="nx-step-num" style="--i:2">03</div><h4>Kickoff do projeto</h4><p data-tpl="{kickoff}" data-need="kickoff" data-alt="Na data que combinarmos juntos"></p></div>
      </div>
    </div>
    <aside class="notes">
      <p>Pergunte direto: “qual dos três planos você escolhe?”. Depois, silêncio.</p>
    </aside>
  </section>

  <!-- ============ 22 · FECHAMENTO ============ -->
  <section class="slide s-20 nx-grid-bg" data-slide="22" aria-label="Fechamento">
    <div class="nx-orb" style="top:120px;left:280px"></div>
    <div class="nx-scanline"></div>
    <div class="slide-body is-center">
      <span class="nx-eyebrow" data-tpl="{empresa} · Co-produção de apps"></span>
      <h2 class="nx-headline nx-reveal h-xl" data-words="Seu método já funciona. / Agora ele pode virar / *renda todo mês.*" data-caret></h2>
      <div class="s20-cta" data-if="whatsapp_link">
        <a class="nx-btn nx-btn-primary nx-btn-lg" data-href="whatsapp_link" target="_blank" rel="noopener">
          <svg class="btn-ico" aria-hidden="true"><use href="#i-chat"/></svg>Falar no WhatsApp
          <span class="nx-btn-arrow" aria-hidden="true"><svg><use href="#i-arrow"/></svg></span>
        </a>
      </div>
      <p class="contact" data-if="vendedor whatsapp_fmt instagram"><span data-f="vendedor" data-if="vendedor"></span><span data-f="whatsapp_fmt" data-if="whatsapp_fmt"></span><span data-f="instagram" data-if="instagram"></span></p>
    </div>
    <aside class="notes">
      <p>Agradeça e combine o próximo contato com data.</p>
    </aside>
  </section>

</div>
</main>

<!-- Controles (somem quando o mouse para) -->
<nav class="hud" id="hud" aria-label="Navegação da apresentação">
  <button type="button" data-act="prev" aria-label="Slide anterior"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>
  <span class="hud-count" id="hud-count">01 / 20</span>
  <button type="button" data-act="next" aria-label="Próximo slide"><svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>
  <span class="hud-sep"></span>
  <button type="button" data-act="overview" aria-label="Visão geral (O)" title="Visão geral (O)"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></button>
  <button type="button" data-act="presenter" aria-label="Modo apresentador (P)" title="Modo apresentador (P)"><svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg></button>
  <button type="button" data-act="fullscreen" aria-label="Tela cheia (F)" title="Tela cheia (F)"><svg viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg></button>
</nav>

<!-- Visão geral -->
<div class="overview" id="overview" hidden>
  <div class="overview-head"><span class="nx-eyebrow">Visão geral</span><span class="overview-hint">Clique num slide · Esc para fechar</span></div>
  <div class="overview-grid" id="overview-grid"></div>
</div>

<!-- Painel do apresentador (só com ?modo=apresentador) -->
<aside class="presenter" id="presenter" hidden>
  <div class="pr-block">
    <div class="pr-label">Próximo</div>
    <div class="pr-next" id="pr-next"></div>
  </div>
  <div class="pr-block pr-timer">
    <div class="pr-label">Tempo</div>
    <div class="pr-time"><span id="pr-time">00:00</span><small>/ 40:00</small></div>
    <div class="pr-time-bar"><i id="pr-time-bar"></i></div>
    <div class="pr-actions"><button type="button" class="nx-btn nx-btn-ghost nx-btn-sm" id="pr-start">Iniciar</button><button type="button" class="nx-btn nx-btn-ghost nx-btn-sm" id="pr-reset">Zerar</button></div>
  </div>
  <div class="pr-block pr-notes-wrap">
    <div class="pr-label">Notas · <span id="pr-count">01 / 20</span></div>
    <div class="pr-notes" id="pr-notes"></div>
  </div>
</aside>

</body>
</html>
`;

// Link curto que não existe ou foi excluído.
export function renderDeckNotFound() {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Apresentação não encontrada</title>
<link rel="icon" href="${ASSETS}/assets/logo/favicon.svg" type="image/svg+xml">
<style>
  html, body { margin: 0; height: 100%; background: #050706; color: #f2f7f4; font-family: Inter, system-ui, sans-serif; }
  main { min-height: 100%; display: grid; place-content: center; gap: 12px; padding: 24px; text-align: center; }
  h1 { margin: 0; font-size: 24px; }
  p { margin: 0; color: #9aaba2; line-height: 1.5; }
</style>
</head>
<body>
<main>
  <h1>Apresentação não encontrada</h1>
  <p>O link pode estar incompleto ou ter sido desativado.<br>Peça um link novo para quem te enviou.</p>
</main>
</body>
</html>
`;
}
