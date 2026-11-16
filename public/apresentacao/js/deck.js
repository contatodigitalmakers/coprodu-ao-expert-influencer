/*
 * Digital Makerss · motor da apresentação
 * Escala, navegação, visão geral, apresentador, modo celular e sincronização entre janelas.
 * Atalhos: ← → espaço · Home/End · F tela cheia · O visão geral · P apresentador · Esc fecha
 */
(function () {
  'use strict';
  var DM = window.DM;
  var W = 1120, H = 630, TALK = 40 * 60; // 40 minutos

  var stage, viewport, hud, overview, presenterEl, progressBar;
  var slides = [], visible = [], pos = -1, k = 1, mobile = false, io = null;
  var presenter = false, embed = false, chan = null;
  var hasZoom = !!(window.CSS && CSS.supports && CSS.supports('zoom', '2'));

  function $(id) { return document.getElementById(id); }
  function pad(x) { return (x < 10 ? '0' : '') + x; }
  function num(s) { return parseInt(s.getAttribute('data-slide'), 10); }
  function h(t, a, c) { return DM.h(t, a, c); }

  function svg(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs).forEach(function (key) { el.setAttribute(key, attrs[key]); });
    return el;
  }
  function logo() {
    var mark = svg('svg', { viewBox: '2 4 56 56', 'aria-hidden': 'true' });
    mark.appendChild(svg('path', { d: 'M8 8H28A24 24 0 0 1 28 56H8Z M20 20H28A12 12 0 0 1 28 44H20Z', 'fill-rule': 'evenodd', style: 'fill:var(--ink)' }));
    mark.appendChild(svg('circle', { cx: '30', cy: '32', r: '5', style: 'fill:var(--neon)' }));
    var el = h('span', { class: 'dm-logo' });
    el.appendChild(mark);
    el.appendChild(document.createTextNode(DM.data.v.empresa));
    return el;
  }

  /* ---------- Montagem ---------- */
  function decorate() {
    var v = DM.data.v;
    slides.forEach(function (s) {
      var body = s.querySelector('.slide-body');
      s.insertBefore(h('div', { class: 'slide-top' }, [logo(), h('span', { class: 'slide-for', text: v.expert ? 'Para ' + v.expert : '' })]), body);
      var ctx = DM.tpl(s.getAttribute('data-foot') || '{empresa} · Co-produção de apps');
      var foot = h('div', { class: 'slide-foot' }, [h('span', { class: 'foot-ctx', text: ctx }), h('span', { class: 'foot-num' })]);
      body.parentNode.insertBefore(foot, body.nextSibling);
    });
  }

  function numberSlides() {
    visible = slides.filter(function (s) { return !s.classList.contains('is-hidden'); });
    if (!visible.length) { slides[0].classList.remove('is-hidden'); visible = [slides[0]]; }
    visible.forEach(function (s, i) {
      var foot = s.querySelector('.foot-num');
      if (foot) foot.textContent = pad(i + 1) + ' / ' + pad(visible.length);
    });
  }

  /* ---------- Escala ---------- */
  function decideMobile() {
    if (presenter || embed) return false;
    var w = vw(), ht = window.innerHeight;
    return w < 720 ? ht > w * 0.9 : (w < 1000 && ht > w * 1.15);
  }
  // largura real da janela (innerWidth cresce se algo transbordar no celular)
  function vw() { return document.documentElement.clientWidth || window.innerWidth; }
  function applyScale(el, z) {
    if (hasZoom) { el.style.zoom = z; el.style.transform = ''; }
    else { el.style.transformOrigin = '0 0'; el.style.transform = 'scale(' + z + ')'; }
  }
  function fit() {
    var was = mobile;
    mobile = decideMobile();
    document.body.classList.toggle('is-mobile', mobile);
    if (mobile) {
      var mw = vw() < 560 ? 400 : 640;
      k = vw() / mw;
      stage.style.setProperty('--mw', mw + 'px');
      stage.style.setProperty('--slide-min', Math.ceil(window.innerHeight / k) + 'px');
      if (hasZoom) stage.style.zoom = k;
      stage.style.transform = '';
    } else {
      k = Math.min(viewport.clientWidth / W, viewport.clientHeight / H);
      if (hasZoom) { stage.style.zoom = k; stage.style.transform = ''; }
      else { stage.style.transformOrigin = '50% 50%'; stage.style.transform = 'scale(' + k + ')'; }
    }
    if (was !== mobile) switchMode();
    if (presenter) sizeThumbs($('pr-next'));
  }
  function switchMode() {
    if (mobile) {
      slides.forEach(function (s) { s.classList.remove('is-active', 'is-leaving'); });
      if (!io && 'IntersectionObserver' in window) {
        io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            var s = e.target;
            syncVideos(s, e.isIntersecting && e.intersectionRatio >= 0.3);
            if (!e.isIntersecting) return;
            if (!s.classList.contains('is-seen')) { s.classList.add('is-seen'); enter(s); }
            pos = visible.indexOf(s);
            updateUi();
          });
        }, { threshold: [0, 0.3] });
      }
      if (io) visible.forEach(function (s) { io.observe(s); });
      else visible.forEach(function (s) { s.classList.add('is-seen'); });
      if (visible[pos]) setTimeout(function () { visible[pos].scrollIntoView(); }, 0);
    } else {
      if (io) io.disconnect();
      var p = Math.max(0, pos);
      pos = -1;
      go(p, { force: true, noSync: true });
    }
  }

  /* ---------- Navegação ---------- */
  function enter(s) {
    Array.prototype.forEach.call(s.querySelectorAll('[data-count]'), function (el) { DM.countUp(el, 1600); });
    if (DM.viz) DM.viz.enter(s);
  }

  function syncVideos(slide, on) {
    if (!slide) return;
    Array.prototype.forEach.call(slide.querySelectorAll('video'), function (v) {
      if (!on) {
        v._dmOn = false;
        v.pause();
        return;
      }
      if (v._dmOn && !v.paused) return;
      v._dmOn = true;
      var kick = function () {
        if (!v._dmOn) return;
        try { v.currentTime = 0; } catch (err) { /* ainda sem quadro */ }
        var pending = v.play();
        if (pending && pending.catch) pending.catch(function () {});
      };
      if (v.readyState >= 2) kick();
      else {
        v.addEventListener('loadeddata', function once() {
          v.removeEventListener('loadeddata', once);
          kick();
        });
        if (v.networkState === 0) v.load();
      }
    });
  }

  function go(i, opts) {
    opts = opts || {};
    if (!visible.length) return;
    i = Math.max(0, Math.min(visible.length - 1, i));
    if (i === pos && !opts.force) return;
    var prev = visible[pos], next = visible[i];
    if (mobile) {
      pos = i;
      next.scrollIntoView({ behavior: opts.instant ? 'auto' : 'smooth' });
    } else {
      slides.forEach(function (s) { if (s !== prev && s !== next) s.classList.remove('is-active', 'is-leaving'); });
      if (prev && prev !== next) {
        prev.classList.remove('is-active');
        prev.classList.add('is-leaving');
        clearTimeout(prev._t);
        prev._t = setTimeout(function () { prev.classList.remove('is-leaving'); }, 480);
      }
      next.classList.remove('is-leaving');
      next.classList.add('is-active');
      pos = i;
      enter(next);
      if (prev !== next) {
        syncVideos(prev, false);
        syncVideos(next, true);
      }
    }
    updateUi();
    if (!opts.noHash) { try { history.replaceState(null, '', '#/' + pad(num(next))); } catch (e) { /* file:// em alguns navegadores */ } }
    if (!opts.remote && !opts.noSync && chan) chan.postMessage({ go: num(next) });
    if (embed && window.parent !== window) window.parent.postMessage({ dm: 'pos', slide: num(next), i: i, total: visible.length }, '*');
  }
  function nextSlide() { go(pos + 1); }
  function prevSlide() { go(pos - 1); }
  function indexOfNum(n) {
    for (var i = 0; i < visible.length; i++) if (num(visible[i]) >= n) return i;
    return visible.length - 1;
  }

  function updateUi() {
    var total = visible.length, cur = Math.max(0, pos);
    if (progressBar) progressBar.style.width = (total > 1 ? (cur / (total - 1)) * 100 : 100) + '%';
    var count = $('hud-count');
    if (count) count.textContent = pad(cur + 1) + ' / ' + pad(total);
    if (presenter) updatePresenter();
  }

  /* ---------- Miniaturas (visão geral e apresentador) ---------- */
  function thumbOf(s) {
    var inner = h('div', { class: 'thumb-inner is-thumb', 'aria-hidden': 'true' });
    var c = s.cloneNode(true);
    c.classList.remove('is-active', 'is-leaving', 'is-seen');
    c.removeAttribute('aria-label');
    Array.prototype.forEach.call(c.querySelectorAll('[id]'), function (x) { x.removeAttribute('id'); });
    Array.prototype.forEach.call(c.querySelectorAll('a, button, input'), function (x) { x.setAttribute('tabindex', '-1'); });
    Array.prototype.forEach.call(c.querySelectorAll('video'), function (x) {
      x.pause();
      x.removeAttribute('autoplay');
      x.removeAttribute('src');
      x.muted = true;
      x.load();
    });
    inner.appendChild(c);
    return inner;
  }
  function sizeThumbs(root) {
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll('.thumb-inner'), function (inner) {
      var w = inner.parentNode.clientWidth;
      if (w) applyScale(inner, w / W);
    });
  }
  function openOverview() {
    if (mobile) return;
    var grid = $('overview-grid');
    grid.textContent = '';
    visible.forEach(function (s, i) {
      var b = h('button', { type: 'button', class: 'thumb' + (i === pos ? ' is-current' : ''), 'aria-label': 'Ir para o slide ' + (i + 1) + ': ' + (s.getAttribute('aria-label') || '') });
      b.appendChild(thumbOf(s));
      b.appendChild(h('span', { class: 'thumb-num', text: pad(i + 1) }));
      b.addEventListener('click', function () { closeOverview(); go(i); });
      grid.appendChild(b);
    });
    overview.hidden = false;
    requestAnimationFrame(function () {
      sizeThumbs(grid);
      var cur = grid.querySelector('.is-current');
      if (cur) { cur.focus({ preventScroll: true }); cur.scrollIntoView({ block: 'center' }); }
    });
  }
  function closeOverview() { overview.hidden = true; $('overview-grid').textContent = ''; }
  function toggleOverview() { if (overview.hidden) openOverview(); else closeOverview(); }

  /* ---------- Tela cheia ---------- */
  function toggleFullscreen() {
    var d = document, el = d.documentElement;
    try {
      if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    } catch (e) { /* sem suporte */ }
  }

  /* ---------- Apresentador ---------- */
  function presenterUrl() {
    var sp = new URLSearchParams(location.search);
    sp.set('modo', 'apresentador');
    return location.pathname + '?' + sp.toString() + '#/' + pad(visible[pos] ? num(visible[pos]) : 1);
  }
  function openPresenter() {
    if (presenter) return;
    var win = window.open(presenterUrl(), 'dm-apresentador', 'width=1400,height=820');
    if (!win) alert('Libere as janelas pop-up deste site para abrir o modo apresentador.');
  }

  var timer = { start: 0, acc: 0, iv: 0 };
  function elapsed() { return timer.acc + (timer.start ? Date.now() - timer.start : 0); }
  function drawTimer() {
    var sec = Math.floor(elapsed() / 1000);
    $('pr-time').textContent = pad(Math.floor(sec / 60)) + ':' + pad(sec % 60);
    $('pr-time-bar').style.width = Math.min(100, sec / TALK * 100) + '%';
    $('pr-time').parentNode.classList.toggle('is-over', sec >= TALK);
  }
  function toggleTimer() {
    if (timer.start) { timer.acc = elapsed(); timer.start = 0; clearInterval(timer.iv); $('pr-start').textContent = 'Continuar'; }
    else { timer.start = Date.now(); timer.iv = setInterval(drawTimer, 500); $('pr-start').textContent = 'Pausar'; }
    drawTimer();
  }
  function resetTimer() { timer.acc = 0; if (timer.start) timer.start = Date.now(); drawTimer(); }

  function updatePresenter() {
    var box = $('pr-next'), nx = visible[pos + 1];
    box.textContent = '';
    if (nx) { box.appendChild(thumbOf(nx)); sizeThumbs(box); }
    else box.appendChild(h('div', { class: 'pr-next-end', text: 'Último slide' }));
    var notes = $('pr-notes'), src = visible[pos] && visible[pos].querySelector('.notes');
    notes.textContent = '';
    if (src) Array.prototype.forEach.call(src.childNodes, function (c) { notes.appendChild(c.cloneNode(true)); });
    $('pr-count').textContent = pad(pos + 1) + ' / ' + pad(visible.length);
  }

  /* ---------- Controles ---------- */
  function act(name) {
    if (name === 'next') nextSlide();
    else if (name === 'prev') prevSlide();
    else if (name === 'overview') toggleOverview();
    else if (name === 'fullscreen') toggleFullscreen();
    else if (name === 'presenter') openPresenter();
  }

  function bind() {
    document.addEventListener('keydown', function (e) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target, tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      var onControl = tag === 'BUTTON' || tag === 'A';
      var ov = !overview.hidden;
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case 'PageDown':
          if (ov) return; e.preventDefault(); nextSlide(); break;
        case ' ': case 'Enter':
          if (ov || onControl) return; e.preventDefault(); nextSlide(); break;
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace':
          if (ov) return; e.preventDefault(); prevSlide(); break;
        case 'Home': e.preventDefault(); go(0); break;
        case 'End': e.preventDefault(); go(visible.length - 1); break;
        case 'f': case 'F': toggleFullscreen(); break;
        case 'o': case 'O': toggleOverview(); break;
        case 'p': case 'P': openPresenter(); break;
        case 'Escape': if (ov) closeOverview(); break;
      }
    });

    hud.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]');
      if (b) act(b.getAttribute('data-act'));
    });
    var hudT = 0;
    function poke() {
      hud.classList.add('is-on');
      clearTimeout(hudT);
      hudT = setTimeout(function () { if (!hud.matches(':hover') && !presenter) hud.classList.remove('is-on'); }, 2400);
    }
    document.addEventListener('mousemove', poke, { passive: true });
    document.addEventListener('touchstart', poke, { passive: true });

    // Swipe (tablet em paisagem, fora do modo leitura)
    var tx = null, ty = 0;
    viewport.addEventListener('touchstart', function (e) {
      if (mobile || e.target.closest('input')) { tx = null; return; }
      tx = e.touches[0].clientX; ty = e.touches[0].clientY;
    }, { passive: true });
    viewport.addEventListener('touchend', function (e) {
      if (mobile || tx === null) return;
      var dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) { if (dx < 0) nextSlide(); else prevSlide(); }
      tx = null;
    }, { passive: true });

    // Luz que segue o mouse nos cards (coordenadas divididas pelo zoom)
    stage.addEventListener('pointermove', function (e) {
      var c = e.target.closest && e.target.closest('.nx-card');
      if (!c) return;
      var r = c.getBoundingClientRect(), z = mobile ? 1 : k;
      c.style.setProperty('--mx', ((e.clientX - r.left) / z) + 'px');
      c.style.setProperty('--my', ((e.clientY - r.top) / z) + 'px');
    });

    var raf = 0;
    window.addEventListener('resize', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); });
    document.addEventListener('fullscreenchange', fit);

    window.addEventListener('hashchange', function () {
      var m = location.hash.match(/^#\/(\d+)/);
      if (m) go(indexOfNum(+m[1]), { noHash: true });
    });

    window.addEventListener('beforeprint', function () {
      Array.prototype.forEach.call(document.querySelectorAll('[data-count]'), function (el) { DM.countUp(el, 0); });
    });

    // Sincronia entre a apresentação e a janela do apresentador
    try {
      var sp = new URLSearchParams(location.search);
      sp.delete('modo');
      chan = new BroadcastChannel('dm-deck:' + location.pathname + '?' + sp.toString());
      chan.onmessage = function (e) {
        var d = e.data || {};
        if (d.go) go(indexOfNum(d.go), { remote: true });
        if (d.hello && !presenter && visible[pos]) chan.postMessage({ go: num(visible[pos]) });
      };
    } catch (e) { chan = null; }

    // Controle pela prévia do gerador
    window.addEventListener('message', function (e) {
      if (e.source !== window.parent || !e.data || e.data.dm !== 'go') return;
      if (e.data.to === 'next') nextSlide();
      else if (e.data.to === 'prev') prevSlide();
      else if (typeof e.data.to === 'number') go(indexOfNum(e.data.to));
    });

    if (presenter) {
      $('pr-start').addEventListener('click', toggleTimer);
      $('pr-reset').addEventListener('click', resetTimer);
    }
  }

  /* ---------- Início ---------- */
  function init() {
    stage = $('stage'); viewport = $('viewport'); hud = $('hud'); overview = $('overview');
    presenterEl = $('presenter'); progressBar = $('progress-bar');
    slides = Array.prototype.slice.call(stage.children).filter(function (el) { return el.classList.contains('slide'); });
    presenter = DM.data.flags.modo === 'apresentador';
    embed = DM.data.flags.modo === 'previa';
    document.body.classList.toggle('is-presenter', presenter);
    document.body.classList.toggle('is-embed', embed);
    if (presenter) { presenterEl.hidden = false; hud.classList.add('is-on'); document.title = 'Apresentador · ' + document.title; }

    decorate();
    numberSlides();
    bind();

    var m = location.hash.match(/^#\/(\d+)/);
    var start = m ? indexOfNum(+m[1]) : 0;
    pos = start; // o modo celular rola até aqui
    fit();
    if (!mobile) { pos = -1; go(start, { noSync: true, noHash: !m }); }
    else { go(start, { instant: true, noSync: true, noHash: true, force: true }); }
    if (presenter) { drawTimer(); if (chan) chan.postMessage({ hello: 1 }); }
  }

  // Dados da apresentação. No link curto (/a/<código>), o CRM grava os dados
  // salvos em window.DM_DADOS, e da URL só valem "modo" e "rascunho".
  // Sem eles (prévia do gerador), os dados vêm da URL (?d=... ou ?chave=valor).
  function source() {
    var url = DM.readSearch(location.search), saved = window.DM_DADOS;
    if (!saved || typeof saved !== 'object') return url;
    var out = {};
    Object.keys(saved).forEach(function (key) { if (typeof saved[key] === 'string') out[key] = saved[key]; });
    ['modo', 'rascunho'].forEach(function (key) { if (url[key]) out[key] = url[key]; });
    return out;
  }

  function boot() {
    try {
      DM.data = DM.build(DM.config || {}, source());
      DM.render(DM.data, document);
      if (DM.viz) DM.viz.init(DM.data);
    } catch (err) {
      console.error(err);
      if (!DM.data) {
        DM.data = {
          v: { empresa: (DM.config && DM.config.empresa) || 'Digital Makerss' },
          n: {},
          flags: { ocultar: [], destaque: 1, rascunho: false, modo: '' },
          lists: { cases: [], prints: [], videos: [], planos: [] }
        };
      }
    }
    try { init(); } catch (err2) { console.error(err2); }
  }

  DM.deck = { go: function (n) { go(indexOfNum(n)); }, next: nextSlide, prev: prevSlide };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
