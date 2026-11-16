/*
 * Digital Makerss · preenchimento dos slides
 * Todo valor vindo da URL entra por textContent (nunca innerHTML).
 *
 * Atributos usados no HTML:
 *   data-f="chave"            texto do campo (data-fallback = texto se vazio)
 *   data-tpl="Texto {chave}"  frase com campos (data-need + data-alt = versão sem o campo)
 *   data-words="A / *b* c"    título com entrada palavra a palavra; / quebra linha; *x* = palavra com brilho
 *   data-if="a b"             mostra o elemento só se algum campo tiver valor
 *   data-require="a b"        (no <section>) oculta o slide se nenhum campo tiver valor
 *   data-src, data-href       imagem e link validados
 *   data-stat, data-phone, data-offer
 */
(function () {
  'use strict';
  var DM = window.DM = window.DM || {};

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var val = attrs[k];
      if (val === null || val === undefined) return;
      if (k === 'class') el.className = val;
      else if (k === 'text') el.textContent = val;
      else el.setAttribute(k, val);
    });
    (kids || []).forEach(function (c) {
      if (c === null || c === undefined || c === false || c === '') return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }

  function fixed(x, dec) {
    return Number(x).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Contagem do zero até o valor (desacelera no fim)
  function countUp(el, dur) {
    var to = parseFloat(el.getAttribute('data-to')), dec = parseInt(el.getAttribute('data-dec'), 10) || 0;
    if (!isFinite(to)) return;
    if (el._raf) cancelAnimationFrame(el._raf);
    if (reduceMotion || !dur) { el.textContent = fixed(to, dec); return; }
    var t0 = performance.now();
    (function tick(now) {
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = fixed(to * e, dec);
      if (p < 1) el._raf = requestAnimationFrame(tick);
    })(t0);
  }

  var PLANOS_FALLBACK = [
    { id: 1, voce_txt: '60%', nos_txt: '40%', caucao_txt: 'R$\u00a04 mil' },
    { id: 2, voce_txt: '70%', nos_txt: '30%', caucao_txt: 'R$\u00a05 mil' },
    { id: 3, voce_txt: '80%', nos_txt: '20%', caucao_txt: 'R$\u00a06 mil' }
  ];

  function render(data, root) {
    root = root || document;
    if (!data || !data.v || !data.flags) return;
    if (!data.lists) data.lists = { cases: [], prints: [], videos: [], planos: [] };
    if (!data.lists.planos || !data.lists.planos.length) data.lists.planos = PLANOS_FALLBACK;
    if (!data.flags.ocultar) data.flags.ocultar = [];
    var v = data.v, n = data.n, rasc = data.flags.rascunho;

    function val(k) { var x = v[k]; return x === undefined || x === null ? '' : String(x); }
    function miss(k) { return '[' + DM.label(k) + ']'; }
    function interp(tpl, forWords) {
      return String(tpl).replace(/\{(\w+)\}/g, function (_, k) {
        var x = val(k) || (rasc ? miss(k) : '');
        // dentro de títulos, * e / têm significado: neutraliza nos valores
        return forWords ? x.replace(/\*/g, '').replace(/\//g, '⁄') : x;
      });
    }
    function needOk(el) {
      var need = el.getAttribute('data-need');
      return !need || need.split(/\s+/).every(function (k) { return val(k); });
    }
    function filled(k) {
      if (k === 'cases' || k === 'prints' || k === 'videos') return !!(data.lists && data.lists[k] && data.lists[k].length);
      return !!val(k);
    }
    function anyOf(list) { return list.split(/\s+/).some(filled); }
    function qsa(sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
    function pick(el, attr) {
      if (needOk(el)) return el.getAttribute(attr);
      if (rasc) return el.getAttribute(attr); // no rascunho mostra a frase completa com o campo marcado
      return el.hasAttribute('data-alt') ? el.getAttribute('data-alt') : el.getAttribute(attr);
    }

    DM.tpl = function (t) { return interp(t); };

    // 1. Campos de texto
    qsa('[data-f]').forEach(function (el) {
      var k = el.getAttribute('data-f'), x = val(k);
      if (x) { el.textContent = x; return; }
      el.textContent = el.getAttribute('data-fallback') || (rasc ? miss(k) : '');
      if (rasc) el.classList.add('is-missing');
    });

    // 2. Frases com campos
    qsa('[data-tpl]').forEach(function (el) {
      if (rasc && !needOk(el)) el.classList.add('is-missing');
      el.textContent = interp(pick(el, 'data-tpl'));
    });

    // 3. Títulos palavra a palavra
    qsa('[data-words]').forEach(function (el) {
      var text = interp(pick(el, 'data-words'), true), i = 0;
      el.textContent = '';
      text.split('/').forEach(function (line, li) {
        if (li) { el.appendChild(document.createTextNode(' ')); el.appendChild(document.createElement('br')); }
        var re = /\*([^*]+)\*(\S*)|(\S+)/g, m, first = true;
        line = line.trim();
        while ((m = re.exec(line))) {
          if (!first) el.appendChild(document.createTextNode(' '));
          first = false;
          var s = document.createElement('span');
          s.style.setProperty('--i', i++);
          if (m[1] !== undefined) {
            s.appendChild(h('span', { class: 'nx-shimmer', text: m[1] }));
            if (m[2]) s.appendChild(document.createTextNode(m[2]));
          } else {
            s.textContent = m[3];
          }
          el.appendChild(s);
        }
      });
      if (el.hasAttribute('data-caret')) el.appendChild(h('i', { class: 'nx-caret', 'aria-hidden': 'true' }));
      el.classList.toggle('is-long', text.replace(/[*/]/g, '').length > 46);
    });

    // 4. Números grandes (case)
    qsa('[data-stat]').forEach(function (el) {
      var k = el.getAttribute('data-stat'), kind = el.getAttribute('data-kind'), x = n[k];
      el.textContent = '';
      if (!isFinite(x) || x <= 0) {
        if (rasc) { el.textContent = '—'; el.classList.add('is-missing'); }
        return;
      }
      function num(value, dec) { return h('span', { 'data-count': '', 'data-to': String(value), 'data-dec': String(dec), text: fixed(value, dec) }); }
      if (kind === 'compact' || (kind === 'money' && x >= 1000)) {
        var p = DM.fmt.compactParts(x);
        if (kind === 'money') el.appendChild(h('em', { class: 'u', text: 'R$' }));
        el.appendChild(num(p.value, p.value % 1 ? 1 : 0));
        if (p.unit) el.appendChild(h('em', { class: 'u', text: p.unit }));
      } else if (kind === 'money') {
        el.appendChild(h('em', { class: 'u', text: 'R$' }));
        el.appendChild(num(x, x % 1 ? 2 : 0));
      } else {
        el.appendChild(num(Math.round(x), 0));
      }
    });

    // 5. Mostrar/ocultar por campo
    qsa('[data-if]').forEach(function (el) {
      if (anyOf(el.getAttribute('data-if'))) return;
      if (rasc) el.classList.add('is-missing-block');
      else el.hidden = true;
    });

    // 6. Links
    qsa('[data-href]').forEach(function (a) {
      var u = val(a.getAttribute('data-href'));
      if (/^https:\/\//i.test(u)) a.href = u; else a.removeAttribute('href');
    });

    // 7. Imagens
    qsa('img[data-src]').forEach(function (img) {
      var u = val(img.getAttribute('data-src')), scr = img.closest('.nx-screen');
      function empty() { img.hidden = true; if (scr) scr.classList.add('is-empty'); }
      if (!u) { empty(); return; }
      img.addEventListener('error', empty);
      img.src = u;
    });

    // 8. Celulares
    qsa('[data-phone]').forEach(function (el) {
      el.textContent = '';
      el.appendChild(phone(el.getAttribute('data-phone')));
    });

    function phone(kind) {
      var p = h('div', { class: 'nx-phone' + (v.cor ? ' has-app-color' : '') });
      if (v.cor) { p.style.setProperty('--app', v.cor); p.style.setProperty('--app-ink', v.cor_ink); }
      p.appendChild(h('div', { class: 'nx-notch' }));
      var appName = val('app') || 'Seu app';

      if (kind === 'home' && v.mockup) {
        p.appendChild(h('div', { class: 'nx-screen is-img' }, [h('img', { src: v.mockup, alt: 'Mockup do app ' + appName })]));
        return p;
      }
      if (kind === 'splash') {
        p.appendChild(h('div', { class: 'nx-screen dm-splash' }, [
          h('div', { class: 'nx-toast' }, [h('span', { class: 'nx-dot' }), h('span', null, ['Nova assinatura · ', h('b', { text: 'agora' })])]),
          h('div', { class: 'dm-splash-mid' }, [
            h('div', { class: 'dm-app-icon', 'aria-hidden': 'true', text: v.iniciais || 'DM' }),
            h('div', { class: 'dm-app-title', text: appName }),
            v.expert ? h('div', { class: 'dm-app-by', text: 'por ' + v.expert }) : null
          ]),
          h('div', { class: 'dm-splash-foot' }, [h('div', { class: 'dm-loader' }, [h('i')]), h('small', { text: 'Assinatura ativa' })])
        ]));
        return p;
      }
      function item(title, sub) {
        return h('div', { class: 'nx-app-item' }, [h('div', { class: 'nx-app-thumb' }), h('div', null, [h('b', { text: title }), h('span', { text: sub })])]);
      }
      var avatar = h('div', { class: 'nx-avatar' }, [v.foto ? h('img', { src: v.foto, alt: '' }) : (v.iniciais || '')]);
      p.appendChild(h('div', { class: 'nx-screen' }, [
        v.preco_mes ? h('div', { class: 'nx-toast' }, [h('span', { class: 'nx-dot' }), h('span', null, ['+1 assinante · ', h('b', { text: v.preco_mes })])]) : null,
        h('div', { class: 'nx-app-head' }, [avatar, h('div', null, [h('div', { class: 'nx-app-hi', text: 'Bom dia!' }), h('div', { class: 'nx-app-name', text: appName })])]),
        h('div', { class: 'nx-app-hero' }, [h('small', { text: 'Hoje no app' }), h('b', { text: v.f1 || 'Seu plano de hoje' }), h('div', { class: 'nx-app-progress' }, [h('i')])]),
        item(v.f2 || 'Trilha do método', 'Aula 3 · 12 min'),
        item(v.f3 || 'Comunidade', 'Ao vivo hoje · 19h'),
        item(v.modulo || 'Exclusivo para assinantes', 'Novo conteúdo'),
        h('div', { class: 'nx-app-nav' }, [h('i'), h('i'), h('i'), h('i')])
      ]));
      return p;
    }

    // 9. Listas: parceiros, prints, vídeos e os três planos
    function icon(id) {
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', '#' + id);
      svg.appendChild(use);
      return h('div', { class: 'nx-icon' }, [svg]);
    }
    function initials(name) {
      return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join('');
    }
    (function cases() {
      var host = root.querySelector('[data-mount="cases"]');
      if (!host) return;
      var items = (data.lists && data.lists.cases) || [];
      host.textContent = '';
      host.setAttribute('data-n', String(items.length || 1));
      if (!items.length) {
        if (rasc) host.appendChild(h('article', { class: 'nx-card partner is-missing-block' }, [
          h('h3', { class: 'nx-card-title', text: miss('case_nome') })
        ]));
        return;
      }
      items.forEach(function (c) {
        var photo = c.foto
          ? h('img', { class: 'partner-photo', src: c.foto, alt: '' })
          : h('div', { class: 'partner-photo is-ph', text: initials(c.nome) || 'DM' });
        if (c.foto) photo.addEventListener('error', function () {
          var ph = h('div', { class: 'partner-photo is-ph', text: initials(c.nome) || 'DM' });
          photo.replaceWith(ph);
        });
        host.appendChild(h('article', { class: 'nx-card partner' }, [
          h('div', { class: 'partner-top' }, [
            photo,
            h('div', null, [
              h('h3', { class: 'nx-card-title', text: c.nome }),
              c.nicho ? h('p', { class: 'partner-nicho', text: c.nicho }) : null
            ])
          ]),
          c.meta ? h('p', { class: 'partner-meta', text: c.meta }) : null,
          c.frase ? h('p', { class: 'partner-quote', text: '“' + c.frase + '”' }) : null
        ]));
      });
    })();

    (function prints() {
      var host = root.querySelector('[data-mount="prints"]');
      if (!host) return;
      var items = (data.lists && data.lists.prints) || [];
      host.textContent = '';
      host.setAttribute('data-n', String(items.length || (rasc ? 3 : 0)));
      host.classList.toggle('is-many', items.length > 3);
      var list = items.length ? items : (rasc ? [
        { src: '', legenda: 'Painel de assinaturas' },
        { src: '', legenda: 'Feedback de alunos' },
        { src: '', legenda: 'Tela de progresso' }
      ] : []);
      list.forEach(function (p, i) {
        var img = h('img', { alt: p.legenda });
        var screen = h('div', { class: 'nx-screen is-img' + (p.src ? '' : ' is-empty') }, [
          img,
          h('span', { class: 'print-ph', text: p.legenda })
        ]);
        if (p.src) {
          img.addEventListener('error', function () { img.hidden = true; screen.classList.add('is-empty'); });
          img.src = p.src;
        } else img.hidden = true;
        var phone = h('div', { class: 'nx-phone' }, [h('div', { class: 'nx-notch' }), screen]);
        phone.style.animationDelay = (-2 * i) + 's';
        host.appendChild(h('figure', { class: 'print' }, [
          h('div', { class: 'print-phone' }, [phone]),
          h('figcaption', { text: p.legenda })
        ]));
      });
    })();

    (function videos() {
      var host = root.querySelector('[data-mount="videos"]');
      if (!host) return;
      var items = (data.lists && data.lists.videos) || [];
      host.textContent = '';
      host.setAttribute('data-n', String(items.length || 1));
      if (!items.length) {
        if (rasc) host.appendChild(h('figure', { class: 'vid is-missing-block' }, [
          h('div', { class: 'vid-frame is-empty' }, [h('span', { text: 'Vídeo de resultado' })]),
          h('figcaption', { text: 'Cole a URL em js/config.js → videos' })
        ]));
        return;
      }
      items.forEach(function (item) {
        var media;
        if (item.kind === 'iframe') {
          media = h('iframe', {
            src: item.src,
            title: item.titulo,
            loading: 'lazy',
            allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
            allowfullscreen: 'true'
          });
        } else {
          media = h('video', {
            playsinline: '',
            muted: '',
            loop: '',
            // Na prévia do CRM (recarregada a cada edição), o vídeo só baixa ao chegar no slide.
            preload: data.flags.modo === 'previa' ? 'none' : 'auto',
            src: item.src
          });
          media.muted = true;
          media.defaultMuted = true;
          media.loop = true;
          media.playsInline = true;
          media.setAttribute('playsinline', '');
          if (item.poster) media.setAttribute('poster', item.poster);
          media.addEventListener('loadedmetadata', function () {
            if (media.videoHeight > media.videoWidth) media.parentNode.classList.add('is-portrait');
          });
        }
        host.appendChild(h('figure', { class: 'vid' }, [
          h('div', { class: 'vid-frame' + (item.orientacao === 'retrato' ? ' is-portrait' : '') }, [media]),
          item.titulo ? h('figcaption', { text: item.titulo }) : null
        ]));
      });
    })();

    (function planos() {
      var host = root.querySelector('[data-mount="planos"]');
      if (!host) return;
      var items = (data.lists && data.lists.planos) || [];
      var icons = ['i-pie', 'i-undo', 'i-card'];
      host.textContent = '';
      items.forEach(function (p, i) {
        var on = p.id === data.flags.destaque;
        host.appendChild(h('article', { class: 'nx-card offer' + (on ? ' is-pick nx-card-glow' : ''), 'data-offer': String(p.id) }, [
          h('div', { class: 'offer-top' }, [
            icon(icons[i] || 'i-pie'),
            h('span', { class: 'nx-badge nx-badge-solid offer-flag', text: 'Nossa sugestão' })
          ]),
          h('h3', { class: 'nx-card-title', text: p.voce_txt + ' você' }),
          h('p', { class: 'offer-us', text: p.nos_txt + ' Digital Makerss' }),
          h('p', { class: 'offer-price' }, [document.createTextNode(p.caucao_txt + ' '), h('small', { text: 'de caução' })]),
          h('p', { class: 'nx-card-text', text: 'Até recuperar o caução, 100% das vendas fica com você. Depois, ' + p.voce_txt + ' seu e ' + p.nos_txt + ' nosso.' })
        ]));
      });
    })();

    // 10. Slides ocultos
    qsa('.stage > .slide').forEach(function (s) {
      var num = parseInt(s.getAttribute('data-slide'), 10), req = s.getAttribute('data-require');
      var hide = data.flags.ocultar.indexOf(num) !== -1 || (!!req && !anyOf(req) && !rasc);
      s.classList.toggle('is-hidden', hide);
    });

    // 11. Título da aba
    document.title = v.expert ? 'O app de ' + v.expert + ' · ' + v.empresa : v.empresa + ' · Co-produção de apps';
  }

  DM.h = h;
  DM.countUp = countUp;
  DM.fixed = fixed;
  DM.render = render;
})();
