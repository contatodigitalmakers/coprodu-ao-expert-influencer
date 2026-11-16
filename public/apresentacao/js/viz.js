/*
 * Digital Makerss · gráfico do slide 4 e calculadora do slide 14
 */
(function () {
  'use strict';
  var DM = window.DM = window.DM || {};
  var NS = 'http://www.w3.org/2000/svg';

  function s(tag, attrs, text) {
    var el = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    if (text) el.textContent = text;
    return el;
  }

  // Barra com topo arredondado (4px) e base reta
  function barPath(x, y, w, hgt, round) {
    var r = round ? Math.min(4, hgt, w / 2) : 0;
    if (hgt <= 0) return '';
    return 'M' + x + ' ' + (y + hgt) + 'V' + (y + r) +
      (r ? 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y : '') +
      'H' + (x + w - r) +
      (r ? 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) : '') +
      'V' + (y + hgt) + 'Z';
  }

  /* ---------- Slide 4: ilustração conceitual (sem escala) ---------- */
  var LAUNCH = [4, 92, 18, 5, 3, 84, 14, 4, 3, 100, 16, 5];
  var SUB = [10, 18, 25, 33, 40, 47, 55, 62, 69, 77, 84, 92];
  var PEAKS = { 1: 1, 5: 1, 9: 1 };

  function chart(host, kind) {
    var W = 426, H = 150, base = 126, top = 16, slot = W / 12, bw = 18;
    var svg = s('svg', {
      viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'xMidYMid meet', role: 'img',
      'aria-label': kind === 'launch'
        ? 'Ilustração: receita em picos nos meses de lançamento e quase nada entre eles'
        : 'Ilustração: receita que cresce todo mês, somando os assinantes do mês anterior aos novos'
    });
    function y(v) { return base - v / 100 * (base - top); }
    var tip = document.createElement('div');
    tip.className = 'viz-tip';
    host.style.position = 'relative';

    for (var i = 0; i < 12; i++) {
      var x = i * slot + (slot - bw) / 2, g = s('g');
      var label;
      if (kind === 'launch') {
        var yy = y(LAUNCH[i]);
        g.appendChild(s('path', { class: 'bar bar-launch', d: barPath(x, yy, bw, base - yy, true), style: '--i:' + i }));
        label = 'Mês ' + (i + 1) + (PEAKS[i] ? ' · lançamento' : ' · entre lançamentos');
        if (PEAKS[i]) g.appendChild(s('text', { class: 'ann', x: x + bw / 2, y: yy - 6, 'text-anchor': 'middle' }, 'LANÇAMENTO'));
      } else {
        var prev = i ? SUB[i - 1] : 0, yt = y(SUB[i]), yb = y(prev);
        if (prev) g.appendChild(s('path', { class: 'bar bar-base', d: barPath(x, yb, bw, base - yb, false), style: '--i:' + i }));
        // 2px de respiro entre a base e os novos
        var gap = prev ? 2 : 0;
        g.appendChild(s('path', { class: 'bar bar-new', d: barPath(x, yt, bw, Math.max(0, yb - yt - gap), true), style: '--i:' + i }));
        label = 'Mês ' + (i + 1) + (prev ? ' · base anterior + novos assinantes' : ' · primeiros assinantes');
      }
      var hit = s('rect', { class: 'hit', x: i * slot, y: 0, width: slot, height: base });
      g.insertBefore(hit, g.firstChild);
      (function (cx, txt, ty) {
        g.addEventListener('mouseenter', function () {
          tip.textContent = txt;
          tip.style.left = (cx / W * 100) + '%';
          tip.style.top = (Math.max(0, ty - 10) / H * 100) + '%';
          tip.classList.add('is-on');
        });
        g.addEventListener('mouseleave', function () { tip.classList.remove('is-on'); });
      })(x + bw / 2, label, kind === 'launch' ? y(LAUNCH[i]) - (PEAKS[i] ? 14 : 0) : y(SUB[i]));
      svg.appendChild(g);
    }
    svg.appendChild(s('line', { class: 'axis', x1: 0, x2: W, y1: base + .5, y2: base + .5 }));
    svg.appendChild(s('text', { class: 'tick', x: slot / 2, y: H - 4, 'text-anchor': 'middle' }, 'MÊS 1'));
    svg.appendChild(s('text', { class: 'tick', x: W - slot / 2, y: H - 4, 'text-anchor': 'middle' }, 'MÊS 12'));
    host.textContent = '';
    host.appendChild(svg);
    host.appendChild(tip);
  }

  /* ---------- Slide 14: calculadora ---------- */
  var calc = null;

  function initCalc(data) {
    var root = document.querySelector('[data-calc]');
    if (!root) return;
    var F = DM.fmt;
    var inSeg = root.querySelector('[data-in="seg"]'), inConv = root.querySelector('[data-in="conv"]'), inPreco = root.querySelector('[data-in="preco"]');
    var out = {};
    Array.prototype.forEach.call(root.querySelectorAll('[data-out]'), function (el) { out[el.getAttribute('data-out')] = el; });
    var MIN = 5000, MAX = 5000000, L0 = Math.log10(MIN), L1 = Math.log10(MAX);

    function nice(x) { var p = Math.pow(10, Math.max(0, Math.floor(Math.log10(x)) - 1)); return Math.round(x / p) * p; }
    function posFromSeg(x) { return Math.round((Math.log10(Math.min(MAX, Math.max(MIN, x))) - L0) / (L1 - L0) * 1000); }
    function segFromPos(p) { return nice(Math.pow(10, L0 + p / 1000 * (L1 - L0))); }

    var st = {
      seg: isFinite(data.n.seguidores) && data.n.seguidores > 0 ? data.n.seguidores : 200000,
      conv: isFinite(data.n.conv) && data.n.conv > 0 ? data.n.conv : 1,
      preco: isFinite(data.n.preco) && data.n.preco > 0 ? data.n.preco : 39,
      shown: 0
    };
    st.conv = Math.min(+inConv.max, Math.max(+inConv.min, st.conv));
    if (st.preco > +inPreco.max) inPreco.max = String(Math.ceil(st.preco / 10) * 10);
    if (st.preco < +inPreco.min) inPreco.min = String(Math.floor(st.preco));
    if (st.seg > MAX) MAX = st.seg, L1 = Math.log10(MAX);
    inSeg.value = posFromSeg(st.seg);
    inConv.value = st.conv;
    inPreco.value = st.preco;

    function fill(input) {
      var p = (input.value - input.min) / (input.max - input.min) * 100;
      input.style.setProperty('--fill', p + '%');
    }
    function share(mes) { return isFinite(data.n.voce) ? mes * data.n.voce / 100 : NaN; }

    function paint(total) {
      out.total.textContent = F.moneyApprox(total);
    }
    function tween(to, dur) {
      if (calc && calc.raf) cancelAnimationFrame(calc.raf);
      var from = st.shown, t0 = performance.now();
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce || !dur) { st.shown = to; paint(to); return; }
      (function tick(now) {
        var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
        st.shown = from + (to - from) * e;
        paint(st.shown);
        if (p < 1) calc.raf = requestAnimationFrame(tick);
      })(t0);
    }
    function update(dur) {
      var r = DM.projection(st.seg, st.conv, st.preco);
      out.seg.textContent = F.compact(st.seg);
      out.conv.textContent = F.pct(st.conv);
      out.preco.textContent = F.money(st.preco);
      out.subs.textContent = F.num(r.assinantes, 0);
      out.year.textContent = F.moneyApprox(r.ano);
      if (out.share) out.share.textContent = F.moneyApprox(share(r.mes));
      [inSeg, inConv, inPreco].forEach(fill);
      tween(r.mes, dur);
      return r;
    }

    inSeg.addEventListener('input', function () { st.seg = segFromPos(+inSeg.value); update(320); });
    inConv.addEventListener('input', function () { st.conv = Math.round(+inConv.value * 10) / 10; update(320); });
    inPreco.addEventListener('input', function () { st.preco = +inPreco.value; update(320); });

    var r0 = DM.projection(st.seg, st.conv, st.preco);
    st.shown = r0.mes;
    calc = { root: root, update: update, raf: 0, st: st };
    update(0);
  }

  DM.viz = {
    init: function (data) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-viz]'), function (el) { chart(el, el.getAttribute('data-viz')); });
      initCalc(data);
    },
    // chamado pelo deck quando um slide entra
    enter: function (slide) {
      if (calc && slide.contains(calc.root)) { calc.st.shown = 0; calc.update(1600); }
    }
  };
})();
