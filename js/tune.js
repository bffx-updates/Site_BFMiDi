/* PAINEL TEMPORÁRIO DE AJUSTE DA LUZ DO NOME (18/09/2026).
   Só reescreve as variáveis --wm-* em :root (ver o bloco no refine.css) e
   guarda os valores no localStorage (bfmidi_wm_tune) para sobreviverem ao
   reload. Não mexe em mais nada do site. Para remover: tirar as duas linhas
   marcadas "tune" do index.html e apagar js/tune.js + css/tune.css. */
(function () {
  'use strict';
  var KEY = 'bfmidi_wm_tune';
  /* [chave, rótulo, min, max, passo, padrão, unidade] → variável --wm-<chave>. */
  var GROUPS = [
    ['LETRA', [
      ['font',  'Tamanho da letra',    5, 14, .1, 9.2, 'vw'],
      ['wdth',  'Largura da letra',    100, 125, 1, 112, ''],
      ['ink',   'Clareza da letra',    0, 60, 1, 0, '%']
    ]],
    ['LUZ', [
      ['light',   'Brilho geral',      0, 1, .01, .78, ''],
      ['field',   'Tamanho do campo',  200, 900, 5, 460, 'px'],
      ['stretch', 'Esticamento',       1, 4, .05, 2.35, ''],
      ['y',       'Altura da luz',     -150, 150, 1, 0, 'px'],
      ['hue',     'Matiz',             -180, 180, 1, 0, 'deg'],
      ['sat',     'Saturação',         0, 2.5, .05, 1, '']
    ]],
    ['RAIOS', [
      ['reach', 'Alcance dos raios',   5, 80, 1, 25, '%'],
      ['blur',  'Dispersão (blur)',    0, 10, .1, 2, 'px'],
      ['fine',  'Raios finos',         0, 1.5, .05, 1, ''],
      ['wide',  'Raios largos',        0, 1.5, .05, 1, ''],
      ['long',  'Raios longos',        0, 1.5, .05, 1, ''],
      ['spin',  'Velocidade do giro',  .1, 6, .1, 1, '']
    ]],
    ['NÚCLEO', [
      ['core-size',    'Tamanho do núcleo',   .3, 2.5, .05, 1, ''],
      ['core-stretch', 'Largura do núcleo',   1, 3, .05, 1.3, ''],
      ['core-light',   'Brilho do núcleo',    0, 1.5, .05, 1, ''],
      ['core-blur',    'Suavidade do núcleo', 0, 30, .5, 6, 'px']
    ]],
    ['CLARÃO', [
      ['flash', 'Força do clarão', 1, 5, .1, 2.1, '']
    ]]
  ];
  var root = document.documentElement, inputs = {}, outs = {}, meta = {};
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { saved = {}; }

  function fmt(v, unit) { return String(+(+v).toFixed(3)) + unit; }
  function apply(key, v) {
    root.style.setProperty('--wm-' + key, fmt(v, meta[key].unit));
    outs[key].textContent = fmt(v, meta[key].unit);
  }
  function values() {
    var o = {};
    Object.keys(inputs).forEach(function (k) { o[k] = +inputs[k].value; });
    return o;
  }
  function text() {
    return Object.keys(inputs).map(function (k) { return '--wm-' + k + ': ' + fmt(inputs[k].value, meta[k].unit) + ';'; }).join('\n');
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(values())); } catch (e) {}
    ta.value = text();
  }

  var panel = document.createElement('aside');
  panel.className = 'wm-tune';
  panel.setAttribute('aria-label', 'Ajuste da luz do nome (temporário)');
  var head = document.createElement('header');
  head.innerHTML = '<b>LUZ DO NOME · AJUSTE</b>';
  var minBtn = document.createElement('button');
  minBtn.type = 'button'; minBtn.textContent = '–'; minBtn.title = 'Recolher';
  minBtn.addEventListener('click', function () { panel.classList.toggle('is-min'); minBtn.textContent = panel.classList.contains('is-min') ? '+' : '–'; });
  head.appendChild(minBtn);
  panel.appendChild(head);
  var body = document.createElement('div');
  body.className = 'wm-tune-body';

  GROUPS.forEach(function (g) {
    var h = document.createElement('h4'); h.textContent = g[0]; body.appendChild(h);
    g[1].forEach(function (row) {
      var key = row[0];
      meta[key] = { min: row[2], max: row[3], step: row[4], def: row[5], unit: row[6] };
      var label = document.createElement('label');
      var span = document.createElement('span'); span.textContent = row[1];
      var input = document.createElement('input');
      input.type = 'range'; input.min = row[2]; input.max = row[3]; input.step = row[4];
      input.value = (key in saved && isFinite(saved[key])) ? saved[key] : row[5];
      input.title = 'Duplo clique volta ao padrão';
      var out = document.createElement('output');
      inputs[key] = input; outs[key] = out;
      input.addEventListener('input', function () { apply(key, input.value); save(); });
      input.addEventListener('dblclick', function () { input.value = row[5]; apply(key, input.value); save(); });
      label.appendChild(span); label.appendChild(input); label.appendChild(out);
      body.appendChild(label);
    });
  });

  var actions = document.createElement('div');
  actions.className = 'wm-tune-actions';
  function btn(txt, cls, fn) { var b = document.createElement('button'); b.type = 'button'; b.textContent = txt; if (cls) b.className = cls; b.addEventListener('click', fn); actions.appendChild(b); return b; }
  btn('Testar clarão', '', function () {
    var box = document.querySelector('.hero-wordmark');
    if (!box) return;
    box.classList.remove('is-flash'); void box.offsetWidth; box.classList.add('is-flash');
  });
  btn('Padrão', '', function () {
    Object.keys(inputs).forEach(function (k) { inputs[k].value = meta[k].def; apply(k, meta[k].def); });
    try { localStorage.removeItem(KEY); } catch (e) {}
    ta.value = text();
  });
  var copyBtn = btn('Copiar valores', 'is-primary', function () {
    ta.value = text();
    var done = function () { copyBtn.textContent = 'Copiado!'; setTimeout(function () { copyBtn.textContent = 'Copiar valores'; }, 1400); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, function () { ta.select(); });
    else { ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} }
  });
  body.appendChild(actions);
  var ta = document.createElement('textarea');
  ta.readOnly = true; ta.rows = 7; ta.spellcheck = false;
  body.appendChild(ta);
  var note = document.createElement('small');
  note.textContent = 'Os valores ficam salvos neste navegador. Quando chegar no ponto, copie e me mande o texto acima.';
  body.appendChild(note);
  panel.appendChild(body);

  Object.keys(inputs).forEach(function (k) { apply(k, inputs[k].value); });
  ta.value = text();
  document.body.appendChild(panel);
})();
