/*
 * Digital Makerss · dados da apresentação
 * Lê a URL (?chave=valor ou ?d=<base64url>), junta com DM.config, valida e formata em pt-BR.
 * Funções puras: também rodam no Node (node -e "require('./js/params.js')").
 */
(function (root) {
  'use strict';
  var DM = root.DM = root.DM || {};

  /* ---------- Esquema dos campos (alimenta o gerador e o modo rascunho) ---------- */
  // [grupo, chave, rótulo, tipo, exemplo, ajuda, slides]
  // O gerador do CRM tem uma cópia desta lista em src/lib/presentations/fields.ts:
  // campo novo ou alterado aqui precisa ser alterado lá também.
  var FIELDS = [
    ['Cliente', 'expert', 'Nome do expert', 'text', 'Ana Souza', '', '1, 8'],
    ['Cliente', 'data', 'Data da conversa', 'date', '', 'Vazio = hoje', '1'],
    ['Cliente', 'nicho', 'Nicho', 'text', 'emagrecimento feminino', '', '8, 9'],

    ['Diagnóstico', 'seguidores', 'Seguidores', 'num', '200 mil', 'Aceita 200mil, 1,2mi ou 200000', '3, 14'],
    ['Diagnóstico', 'rede', 'Rede principal', 'text', 'Instagram', '', '3'],
    ['Diagnóstico', 'publico', 'Perfil do público', 'text', 'mulheres de 25 a 40 anos', '', '3'],
    ['Diagnóstico', 'vende', 'O que vende hoje', 'text', 'mentoria em grupo', '', '3'],
    ['Diagnóstico', 'ticket', 'Ticket médio', 'money', '997', '', '3'],
    ['Diagnóstico', 'acompanha', 'Acompanhamento dos alunos', 'text', 'grupo no WhatsApp', '', '3'],
    ['Diagnóstico', 'dor', 'O que incomoda', 'textarea', 'a dor citada na conversa pela DM', '', '3'],
    ['Diagnóstico', 'objetivo', 'Onde quer chegar', 'text', 'renda previsível sem depender de lançamento', '', '3'],

    ['App', 'app', 'Nome do app', 'text', 'Método Ana', 'Vazio = "Método" + primeiro nome', '1, 8'],
    ['App', 'cor', 'Cor da marca do expert', 'color', '#2bff88', 'Usada só dentro do celular', '1, 8'],
    ['App', 'foto', 'Foto do expert', 'url', 'https://…', 'URL https. Aparece como avatar no celular', '8'],
    ['App', 'f1', 'Funcionalidade principal do nicho', 'text', 'Plano alimentar da semana', '', '8'],
    ['App', 'f2', 'Conteúdo do método', 'text', 'Método em trilhas de aulas curtas', '', '8'],
    ['App', 'f3', 'Comunidade ou acompanhamento', 'text', 'Comunidade com check-in diário', '', '8'],
    ['App', 'modulo', 'Módulo exclusivo do nicho', 'text', 'Plano alimentar', '', '9'],
    ['App', 'modulo_desc', 'O que o módulo faz', 'text', 'Cardápio ajustado a cada aluna', '', '9'],
    ['App', 'mockup', 'Print do mockup', 'url', 'https://…', 'URL https. Substitui o celular desenhado', '8'],

    ['Projeção', 'conv', '% da audiência que assina', 'pct', '1', '', '16'],
    ['Projeção', 'preco', 'Preço da assinatura por mês', 'money', '39', '', '8, 16'],

    ['Oferta', 'voce', '% da receita para o expert', 'pct', '60', 'Vazio = % do plano em destaque', '16, 18'],
    ['Oferta', 'nos', '% da receita para nós', 'pct', '40', 'Vazio = 100 − % do expert', '18'],
    ['Oferta', 'caucao', 'Caução do plano em destaque', 'money', '4000', 'Alias antigo na URL: setup', '17, 18'],
    ['Oferta', 'destaque', 'Plano em destaque', 'select', '1', '0 nenhum · 1 60/40 + 4k · 2 70/30 + 5k · 3 80/20 + 6k', '18'],
    ['Oferta', 'semanas', 'Semanas até o lançamento', 'num', '8', '', '15'],
    ['Oferta', 'horas', 'Horas por semana do expert', 'num', '3', '', '20'],
    ['Oferta', 'contrato', 'Prazo para enviar o contrato (dias)', 'num', '2', '', '21'],
    ['Oferta', 'kickoff', 'Data sugerida do kickoff', 'date', '', '', '21'],

    // Os três planos do slide 18. Vazio = planos de config.js.
    ['Planos', 'plano1_voce', 'Plano 1: % do expert', 'pct', '60', '', '18'],
    ['Planos', 'plano1_caucao', 'Plano 1: caução', 'money', '4000', '', '18'],
    ['Planos', 'plano2_voce', 'Plano 2: % do expert', 'pct', '70', '', '18'],
    ['Planos', 'plano2_caucao', 'Plano 2: caução', 'money', '5000', '', '18'],
    ['Planos', 'plano3_voce', 'Plano 3: % do expert', 'pct', '80', '', '18'],
    ['Planos', 'plano3_caucao', 'Plano 3: caução', 'money', '6000', '', '18'],

    ['Empresa', 'empresa', 'Nome da empresa', 'text', 'Digital Makerss', '', 'todos'],
    ['Empresa', 'vendedor', 'Seu nome', 'text', 'Seu nome', '', '20'],
    ['Empresa', 'whatsapp', 'WhatsApp', 'tel', '5511999999999', 'Só números, com DDI e DDD', '20'],
    ['Empresa', 'instagram', '@ da empresa', 'text', '@digitalmakerss', '', '20'],
    ['Empresa', 'mensagem', 'Mensagem pronta do WhatsApp', 'text', '', '', '20'],
    ['Empresa', 'dono', 'Resposta "De quem é o app?"', 'textarea', '', '', '20'],

    ['Case', 'case_nome', 'Expert parceiro', 'text', 'Nome do parceiro', 'Se a lista cases em config.js estiver vazia, este nome abre o slide', '11'],
    ['Case', 'case_nicho', 'Nicho do parceiro', 'text', 'finanças', '', '11'],
    ['Case', 'case_seguidores', 'Seguidores', 'num', '350 mil', '', '11'],
    ['Case', 'case_assinantes', 'Assinantes ativos', 'num', '1200', '', '11'],
    ['Case', 'case_receita', 'Receita por mês', 'money', '46800', '', '11'],
    ['Case', 'case_semanas', 'Semanas até o lançamento', 'num', '8', '', '11'],
    ['Case', 'case_frase', 'Frase do parceiro', 'textarea', '', '', '11'],
    ['Case', 'case_foto', 'Foto do parceiro', 'url', 'https://…', 'Exibida em preto e branco', '11'],
    ['Case', 'case_print1', 'Print: painel de assinaturas', 'url', 'assets/cases/painel.png', 'Se prints[] estiver vazio, este abre o slide', '12'],
    ['Case', 'case_print2', 'Print: feedback de alunos', 'url', 'assets/cases/feedback.png', '', '12'],
    ['Case', 'case_print3', 'Print: tela de progresso', 'url', 'assets/cases/progresso.png', '', '12']
  ];

  var SCHEMA = FIELDS.map(function (f) {
    return { group: f[0], key: f[1], label: f[2], type: f[3], ph: f[4], help: f[5], slides: f[6] };
  });
  var BY_KEY = {};
  SCHEMA.forEach(function (f) { BY_KEY[f.key] = f; });

  // Rótulos dos campos derivados, para o modo rascunho
  var DERIVED_LABELS = {
    audiencia: 'Audiência', vendas: 'O que você vende', preco_mes: 'Preço por mês', split: 'Divisão da receita',
    caucao: 'Caução', faturamento_2026: 'Faturamento em 2026',
    whatsapp_fmt: 'WhatsApp', whatsapp_link: 'WhatsApp', expert_first: 'Nome do expert', iniciais: 'Iniciais',
    semanas_txt: 'Semanas até o lançamento', horas_txt: 'Horas por semana', contrato_txt: 'Prazo do contrato'
  };

  /* ---------- Números em pt-BR ---------- */
  var NB = '\u00a0'; // espaço que não quebra: "R$ 39" e "200 mil" ficam juntos
  function parseNum(input) {
    if (input === null || input === undefined) return NaN;
    if (typeof input === 'number') return isFinite(input) ? input : NaN;
    var s = String(input).toLowerCase().replace(/r\$|%|\s/g, '').replace(/seguidores?|assinantes?/g, '');
    if (!s) return NaN;
    var mult = 1;
    var m = s.match(/^(.*?)(milh(?:ões|oes|ão|ao)|mi|mm|m|mil|k)$/);
    if (m) {
      s = m[1];
      mult = /^(mil|k)$/.test(m[2]) ? 1e3 : 1e6;
    }
    if (s.indexOf(',') !== -1) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, '');
    }
    if (!/^-?\d*\.?\d+$/.test(s)) return NaN;
    return parseFloat(s) * mult;
  }

  function fmtNum(x, maxDec) {
    return Number(x).toLocaleString('pt-BR', { maximumFractionDigits: maxDec === undefined ? 1 : maxDec });
  }

  // 78000 → {value:78, unit:'mil'} · 1200000 → {value:1.2, unit:'mi'}
  function compactParts(n) {
    var a = Math.abs(n);
    if (a >= 1e6) return { value: Math.round(n / 1e5) / 10, unit: 'mi' };
    if (a >= 1e3) {
      var k = n / 1e3;
      return { value: Math.abs(k) >= 100 ? Math.round(k) : Math.round(k * 10) / 10, unit: 'mil' };
    }
    return { value: Math.round(n), unit: '' };
  }
  function compact(n) {
    var p = compactParts(n);
    return fmtNum(p.value) + (p.unit ? NB + p.unit : '');
  }
  // Valores exatos: R$ 39 · R$ 39,90 · R$ 997 · R$ 1.997 · R$ 5 mil · R$ 2,5 mil
  function money(n) {
    if (!isFinite(n)) return '';
    if (Math.abs(n) >= 1000 && (n % 100 === 0 || Math.abs(n) >= 100000)) return 'R$' + NB + compact(n);
    if (n % 1 !== 0) return 'R$' + NB + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return 'R$' + NB + fmtNum(n, 0);
  }
  // Estimativas (calculadora): sempre compacto
  function moneyApprox(n) {
    if (!isFinite(n)) return '';
    return Math.abs(n) >= 1000 ? 'R$' + NB + compact(n) : 'R$' + NB + fmtNum(Math.round(n), 0);
  }
  function pct(n) { return isFinite(n) ? fmtNum(n, 2) + '%' : ''; }

  var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  function fmtDate(s, now) {
    if (!s) {
      if (!now) return '';
      return now.getDate() + ' de ' + MESES[now.getMonth()] + ' de ' + now.getFullYear();
    }
    var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/) || null;
    var d, mo, y;
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else {
      m = String(s).match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
      if (!m) return String(s);
      d = +m[1]; mo = +m[2]; y = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : null;
    }
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return String(s);
    return d + ' de ' + MESES[mo - 1] + (y ? ' de ' + y : '');
  }

  /* ---------- Segurança ---------- */
  function clean(v) {
    if (v === null || v === undefined) return '';
    // listas (cases, prints, planos) não entram na URL nem viram texto de slide
    if (typeof v === 'object') return '';
    // remove caracteres de controle, mantém quebras de linha
    return String(v).replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '').trim().slice(0, 400);
  }
  function safeUrl(v) {
    v = clean(v);
    if (!v) return '';
    if (/^https:\/\/[^\s"'<>]+$/i.test(v)) return v;
    if (/^(\.\/)?assets\/[\w\-./]+$/i.test(v) && v.indexOf('..') === -1) return v;
    if (/^\/apresentacao\/assets\/[\w\-./]+$/i.test(v) && v.indexOf('..') === -1) return v;
    return '';
  }
  function safeColor(v) {
    v = clean(v);
    if (/^#?[0-9a-f]{6}$/i.test(v) || /^#?[0-9a-f]{3}$/i.test(v)) return v.charAt(0) === '#' ? v : '#' + v;
    return '';
  }
  // Texto legível sobre uma cor (preto da marca ou branco)
  function inkOn(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var rgb = [0, 2, 4].map(function (i) {
      var c = parseInt(h.substr(i, 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    var L = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    return (L + 0.05) / 0.05 > 1.05 / (L + 0.05) ? '#03140b' : '#ffffff';
  }

  /* ---------- URL: ?d=<base64url(JSON)> + parâmetros legíveis ---------- */
  function b64urlEncode(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlDecode(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function encode(obj) {
    var out = {};
    Object.keys(obj || {}).forEach(function (k) {
      var v = obj[k];
      if (v !== '' && v !== null && v !== undefined) out[k] = String(v);
    });
    return b64urlEncode(JSON.stringify(out));
  }
  function decode(s) {
    try {
      var o = JSON.parse(b64urlDecode(s));
      if (!o || typeof o !== 'object' || Array.isArray(o)) return {};
      var out = {};
      Object.keys(o).forEach(function (k) {
        if (/^[a-z0-9_]{1,32}$/.test(k) && (typeof o[k] === 'string' || typeof o[k] === 'number')) out[k] = String(o[k]);
      });
      return out;
    } catch (e) { return {}; }
  }
  function readSearch(search) {
    var sp = new URLSearchParams(search || ''), out = {};
    if (sp.get('d')) {
      var dec = decode(sp.get('d'));
      Object.keys(dec).forEach(function (k) { out[k] = dec[k]; });
    }
    sp.forEach(function (val, key) { if (key !== 'd') out[key] = val; });
    return out;
  }

  /* ---------- Monta os dados que os slides usam ---------- */
  function build(config, src, now) {
    config = config || {};
    src = src || {};
    now = now || new Date();

    var raw = {};
    var keys = {};
    SCHEMA.forEach(function (f) { keys[f.key] = 1; });
    Object.keys(config).forEach(function (k) { keys[k] = 1; });
    Object.keys(keys).forEach(function (k) {
      var fromUrl = clean(src[k]);
      raw[k] = fromUrl !== '' ? fromUrl : clean(config[k]);
    });

    var n = {}; // números
    var v = {}; // textos prontos para exibir

    // Texto livre
    ['expert', 'nicho', 'rede', 'publico', 'vende', 'acompanha', 'dor', 'objetivo', 'f1', 'f2', 'f3', 'modulo',
      'modulo_desc', 'empresa', 'vendedor', 'mensagem', 'dono', 'case_nome', 'case_nicho', 'case_frase'
    ].forEach(function (k) { v[k] = raw[k] || ''; });

    v.empresa = v.empresa || 'Digital Makerss';
    v.expert_first = v.expert ? v.expert.split(/\s+/)[0] : '';
    v.app = raw.app || (v.expert_first ? 'Método ' + v.expert_first : '');
    var base = (v.app || v.expert || v.empresa).replace(/^(método|metodo|app|clube|programa)\s+/i, '');
    if (base.split(/\s+/).length < 2 && v.expert.split(/\s+/).length > 1) base = v.expert;
    var STOP = { de: 1, da: 1, do: 1, das: 1, dos: 1, e: 1, que: 1, com: 1, para: 1, por: 1, a: 1, o: 1, the: 1, of: 1 };
    v.iniciais = base.split(/\s+/).filter(function (w) { return w && !STOP[w.toLowerCase()]; }).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join('');

    v.data = fmtDate(raw.data, now);
    v.kickoff = fmtDate(raw.kickoff);

    // Números
    ['seguidores', 'ticket', 'conv', 'preco', 'setup', 'caucao', 'voce', 'nos', 'destaque', 'semanas', 'horas',
      'contrato', 'case_seguidores', 'case_assinantes', 'case_receita', 'case_semanas', 'faturamento_2026'
    ].forEach(function (k) { n[k] = parseNum(raw[k]); });

    var planos = normalizePlanos(planosFrom(raw, config.planos));
    var destaqueN = isFinite(n.destaque) ? Math.max(0, Math.min(3, Math.round(n.destaque))) : 1;
    var planoOn = destaqueN > 0 ? planos[destaqueN - 1] : planos[0];

    // Sem voce/nos/caução na URL, a calculadora e os textos seguem o plano em destaque.
    var voceUrl = clean(src.voce) !== '';
    var nosUrl = clean(src.nos) !== '';
    if (!voceUrl && !nosUrl && planoOn) {
      n.voce = planoOn.voce;
      n.nos = planoOn.nos;
    } else if (voceUrl && !nosUrl) {
      n.nos = 100 - n.voce;
    } else if (!voceUrl && nosUrl) {
      n.voce = 100 - n.nos;
    }
    if (clean(src.caucao) === '' && clean(src.setup) === '' && planoOn) n.caucao = planoOn.caucao;
    else if (!isFinite(n.caucao)) n.caucao = isFinite(n.setup) ? n.setup : (planoOn ? planoOn.caucao : NaN);
    n.setup = n.caucao;

    v.seguidores = isFinite(n.seguidores) && n.seguidores > 0 ? compact(n.seguidores) : '';
    v.ticket = isFinite(n.ticket) ? money(n.ticket) : (raw.ticket || '');
    v.conv = isFinite(n.conv) ? pct(n.conv) : '';
    v.preco = isFinite(n.preco) ? money(n.preco) : '';
    v.preco_mes = v.preco ? v.preco + '/mês' : '';
    v.caucao = isFinite(n.caucao) ? money(n.caucao) : '';
    v.setup = v.caucao;
    if (isFinite(n.voce) && !isFinite(n.nos)) n.nos = 100 - n.voce;
    if (isFinite(n.nos) && !isFinite(n.voce)) n.voce = 100 - n.nos;
    v.voce = isFinite(n.voce) ? pct(n.voce) : '';
    v.nos = isFinite(n.nos) ? pct(n.nos) : '';
    v.split = v.voce && v.nos ? v.voce + ' para você, ' + v.nos + ' para nós' : '';
    var fat = fatLabel(n.faturamento_2026);
    v.faturamento_2026 = fat.hero;
    ['semanas', 'horas', 'contrato', 'case_semanas'].forEach(function (k) {
      v[k] = isFinite(n[k]) && n[k] > 0 ? fmtNum(n[k]) : '';
    });
    function plural(x, one, many) { return isFinite(x) && x > 0 ? fmtNum(x) + ' ' + (x === 1 ? one : many) : ''; }
    v.semanas_txt = plural(n.semanas, 'semana', 'semanas');
    v.horas_txt = plural(n.horas, 'hora', 'horas');
    v.contrato_txt = plural(n.contrato, 'dia', 'dias');
    v.case_seguidores = isFinite(n.case_seguidores) && n.case_seguidores > 0 ? compact(n.case_seguidores) : '';
    v.case_assinantes = isFinite(n.case_assinantes) && n.case_assinantes > 0 ? fmtNum(n.case_assinantes, 0) : '';
    v.case_receita = isFinite(n.case_receita) && n.case_receita > 0 ? money(n.case_receita) : '';

    // Frases compostas do slide 3
    var aud = [];
    if (v.seguidores) aud.push(v.seguidores + ' seguidores' + (v.rede ? ' no ' + v.rede : ''));
    else if (v.rede) aud.push(v.rede);
    if (v.publico) aud.push(v.publico);
    v.audiencia = aud.join(' · ');
    var vend = [];
    if (v.vende) vend.push(v.vende);
    if (v.ticket) vend.push('ticket médio ' + v.ticket);
    v.vendas = vend.join(' · ');

    // Contato
    var digits = (raw.whatsapp || '').replace(/\D/g, '').slice(0, 15);
    v.whatsapp = digits;
    v.whatsapp_fmt = '';
    if (digits) {
      var m = digits.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
      v.whatsapp_fmt = m ? '(' + m[1] + ') ' + m[2] + '-' + m[3] : '+' + digits;
    }
    v.whatsapp_link = digits ? 'https://wa.me/' + digits + (v.mensagem ? '?text=' + encodeURIComponent(v.mensagem) : '') : '';
    v.instagram = raw.instagram ? (raw.instagram.charAt(0) === '@' ? raw.instagram : '@' + raw.instagram).replace(/\s+/g, '') : '';

    // Imagens e cor
    ['foto', 'mockup', 'case_foto', 'case_print1', 'case_print2', 'case_print3'].forEach(function (k) { v[k] = safeUrl(raw[k]); });
    v.cor = safeColor(raw.cor);
    v.cor_ink = v.cor ? inkOn(v.cor) : '';

    var cases = normalizeCases(config.cases);
    if (!cases.length && v.case_nome) {
      cases = normalizeCases([{
        nome: v.case_nome, nicho: v.case_nicho, foto: raw.case_foto, frase: v.case_frase,
        seguidores: raw.case_seguidores, assinantes: raw.case_assinantes,
        receita: raw.case_receita, semanas: raw.case_semanas
      }]);
    }
    var prints = normalizePrints(config.prints);
    if (!prints.length) {
      prints = normalizePrints([
        { src: raw.case_print1, legenda: 'Assinantes entrando mês a mês' },
        { src: raw.case_print2, legenda: 'O que os alunos dizem do app' },
        { src: raw.case_print3, legenda: 'Resultado registrado no dia a dia' }
      ]);
    }
    var videos = normalizeVideos(config.videos);

    // Controles
    var flags = {
      rascunho: /^(1|true|sim)$/i.test(clean(src.rascunho)),
      ocultar: clean(src.ocultar || config.ocultar).split(/[\s,;]+/).map(function (x) { return parseInt(x, 10); }).filter(function (x) { return x > 0 && x <= 99; }),
      destaque: destaqueN,
      modo: clean(src.modo)
    };

    return { raw: raw, n: n, v: v, flags: flags, lists: { cases: cases, prints: prints, videos: videos, planos: planos } };
  }

  var PLANOS_PADRAO = [
    { voce: 60, nos: 40, caucao: 4000 },
    { voce: 70, nos: 30, caucao: 5000 },
    { voce: 80, nos: 20, caucao: 6000 }
  ];

  // Planos de config.js com os valores da URL por cima (plano1_voce, plano1_caucao...).
  function planosFrom(raw, base) {
    var list = (Array.isArray(base) && base.length ? base : PLANOS_PADRAO).slice(0, 3);
    while (list.length < 3) list.push(PLANOS_PADRAO[list.length]);
    return list.map(function (p, i) {
      var copy = { voce: p && p.voce, nos: p && p.nos, caucao: p && (p.caucao != null ? p.caucao : p.setup) };
      var voce = parseNum(raw['plano' + (i + 1) + '_voce']);
      var caucao = parseNum(raw['plano' + (i + 1) + '_caucao']);
      if (isFinite(voce) && voce >= 0 && voce <= 100) { copy.voce = voce; copy.nos = 100 - voce; }
      if (isFinite(caucao) && caucao >= 0) copy.caucao = caucao;
      return copy;
    });
  }

  function normalizePlanos(src) {
    var list = Array.isArray(src) && src.length ? src : PLANOS_PADRAO;
    return list.slice(0, 3).map(function (p, i) {
      var voce = parseNum(p && p.voce);
      var nos = parseNum(p && p.nos);
      var caucao = parseNum(p && (p.caucao != null ? p.caucao : p.setup));
      if (!isFinite(voce)) voce = PLANOS_PADRAO[i] ? PLANOS_PADRAO[i].voce : 60;
      if (!isFinite(nos)) nos = 100 - voce;
      if (!isFinite(caucao)) caucao = PLANOS_PADRAO[i] ? PLANOS_PADRAO[i].caucao : 4000;
      return {
        id: i + 1,
        voce: voce,
        nos: nos,
        caucao: caucao,
        voce_txt: pct(voce),
        nos_txt: pct(nos),
        caucao_txt: money(caucao)
      };
    });
  }

  function fatLabel(n) {
    if (!isFinite(n) || n <= 0) return { hero: '' };
    if (Math.abs(n) >= 1e6) {
      var m = Math.round(n / 1e5) / 10;
      var unidade = Math.abs(m) < 2 ? 'milhão' : 'milhões';
      return { hero: 'R$' + NB + fmtNum(m) + NB + unidade };
    }
    return { hero: money(n) };
  }

  function asObjects(src) {
    return Array.isArray(src) ? src.filter(function (x) { return x && typeof x === 'object'; }) : [];
  }

  function normalizeCases(src) {
    return asObjects(src).map(function (c) {
      var nome = clean(c.nome || c.case_nome);
      if (!nome) return null;
      var seg = parseNum(c.seguidores != null ? c.seguidores : c.case_seguidores);
      var ass = parseNum(c.assinantes != null ? c.assinantes : c.case_assinantes);
      var rec = parseNum(c.receita != null ? c.receita : c.case_receita);
      var sem = parseNum(c.semanas != null ? c.semanas : c.case_semanas);
      var bits = [];
      if (isFinite(seg) && seg > 0) bits.push(compact(seg) + ' seguidores');
      if (isFinite(ass) && ass > 0) bits.push(fmtNum(ass, 0) + ' assinantes');
      if (isFinite(rec) && rec > 0) bits.push(money(rec) + '/mês');
      if (isFinite(sem) && sem > 0) bits.push(fmtNum(sem, 0) + (sem === 1 ? ' semana' : ' semanas'));
      return {
        nome: nome,
        nicho: clean(c.nicho || c.case_nicho || ''),
        foto: safeUrl(c.foto || c.case_foto || ''),
        frase: clean(c.frase || c.case_frase || ''),
        meta: bits.join(' · ')
      };
    }).filter(Boolean).slice(0, 6);
  }

  function normalizePrints(src) {
    var list = Array.isArray(src) ? src : [];
    return list.map(function (p) {
      if (typeof p === 'string') p = { src: p };
      if (!p || typeof p !== 'object') return null;
      var url = safeUrl(p.src || '');
      if (!url) return null;
      return { src: url, legenda: clean(p.legenda || 'Resultado no app') };
    }).filter(Boolean).slice(0, 6);
  }

  function videoEmbed(src) {
    var yt = String(src).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
    if (yt) return { kind: 'iframe', src: 'https://www.youtube-nocookie.com/embed/' + yt[1] };
    var vm = String(src).match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (vm) return { kind: 'iframe', src: 'https://player.vimeo.com/video/' + vm[1] };
    if (/\.(mp4|webm)(\?|#|$)/i.test(src)) return { kind: 'file', src: src };
    return null;
  }

  function normalizeVideos(src) {
    return asObjects(src).map(function (item) {
      var url = safeUrl(item.src || '');
      if (!url) return null;
      var embed = videoEmbed(url);
      if (!embed) return null;
      var orientacao = clean(item.orientacao || '');
      if (orientacao !== 'retrato' && orientacao !== 'paisagem') orientacao = '';
      return {
        kind: embed.kind,
        src: embed.src,
        titulo: clean(item.titulo || item.title || ''),
        poster: safeUrl(item.poster || ''),
        orientacao: orientacao
      };
    }).filter(Boolean).slice(0, 3);
  }

  // Projeção do slide 14
  function projection(seguidores, convPct, preco) {
    var assinantes = Math.round(seguidores * convPct / 100);
    return { assinantes: assinantes, mes: assinantes * preco, ano: assinantes * preco * 12 };
  }

  function label(key) {
    if (BY_KEY[key]) return BY_KEY[key].label;
    return DERIVED_LABELS[key] || key;
  }

  DM.schema = SCHEMA;
  DM.label = label;
  DM.parseNum = parseNum;
  DM.fmt = { num: fmtNum, compact: compact, compactParts: compactParts, money: money, moneyApprox: moneyApprox, pct: pct, date: fmtDate };
  DM.encode = encode;
  DM.decode = decode;
  DM.readSearch = readSearch;
  DM.build = build;
  DM.projection = projection;
  DM.safeUrl = safeUrl;

  if (typeof module !== 'undefined' && module.exports) module.exports = DM;
})(typeof window !== 'undefined' ? window : globalThis);
