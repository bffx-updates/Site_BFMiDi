/* ============================================================================
   BFMIDI — LANDING (Site/) · COMPORTAMENTO
   ============================================================================
   Nada de copy aqui: todo texto nasce em js/content.js (window.BF_CONTENT),
   carregado ANTES deste arquivo.

   O QUE ESTE ARQUIVO FAZ
     1. adota o seletor e rotula pelo conteúdo   5. navegação por teclado
     2. troca de MODELO e troca de PAINEL        6. um clique só: [data-go]
     3. link direto por hash (#8sw, #8sw/info)   7. anúncio para leitor de tela

   ----------------------------------------------------------------------------
   O ESTADO DA PÁGINA INTEIRA SÃO DOIS NÚMEROS: qual modelo e qual vista.

       vista 'home'    ->  a VISÃO GERAL do modelo (a foto grande)
       vista 'info' | 'conects' | 'comprar'
                       ->  o painel daquela opção

   Nada rola: o painel troca por opacidade, dentro da mesma caixa. Por isso a
   navegação toda cabe em `apply(modelo, vista)` — não existe scrollIntoView,
   âncora nem seção. O <body> tem `overflow:hidden` no CSS.

   ----------------------------------------------------------------------------
   SÃO DUAS CÁPSULAS EMPILHADAS, uma por nível: modelos em cima, opções do
   modelo embaixo. As duas ficam sempre em cena, e por isso não existe botão
   de voltar — o modelo aceso lá em cima é o caminho de volta para a visão
   geral dele.

   POR QUE AS DUAS TÊM SEMÂNTICA DIFERENTE
   Na de MODELOS o clique reescreve a PÁGINA (título do documento, URL,
   painel, foto): isso não é aba, é um grupo de botões — `role="group"` +
   `aria-pressed`. Na de OPÇÕES o clique troca um painel que está ali do lado
   e nada mais: isso é aba de verdade — `role="tablist"` + `role="tab"` +
   `aria-controls`, com os painéis marcados como `tabpanel` no HTML. Marcar
   as duas igual prometeria ao leitor de tela uma estrutura que não existe.
   ========================================================================== */
(function () {
  'use strict';

  var C = window.BF_CONTENT;
  if (!C || !C.models || !C.models.length) return;   /* sem conteúdo, sem página */

  var MODELS = C.models;
  var SUB = (C.sub && C.sub.items) || [];
  var RES = C.resources.items;
  var SOFTWARE = C.software;

  var $ = function (s, r) { return (r || document).querySelector(s); };

  /* ------------------------------------------------------------------ util */

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* `<img>` de mídia. `width`/`height` NÃO são declarados porque a altura real
     depende do recorte de cada arquivo; em vez disso a caixa que a contém tem
     proporção fixa no CSS, então também não há salto de layout (CLS). */
  function imgTag(key, alt, sizes, eager) {
    return '<img src="assets/' + esc(key) + '.webp"' +
           ' srcset="assets/' + esc(key) + '-sm.webp 800w, assets/' + esc(key) + '.webp 1600w"' +
           ' sizes="' + esc(sizes) + '"' +
           ' alt="' + esc(alt || '') + '"' +
           (eager ? ' fetchpriority="high"' : ' decoding="async"') +
           '>';
  }

  function listTag(items) {
    if (!items || !items.length) return '';
    return '<ul class="band-list">' + items.map(function (li) {
      return '<li>' + esc(li) + '</li>';
    }).join('') + '</ul>';
  }

  /* A banda daquele painel. Rotulada pelo campo `panel`, e NÃO pela posição no
     array: um modelo pode ter só a de conexões, ou nenhuma. */
  function bandFor(m, key) {
    var b = m.bands || [];
    for (var i = 0; i < b.length; i++) if (b[i].panel === key) return b[i];
    return null;
  }

  /* ------------------------------------------------ peças compartilhadas */

  /* Anel de LED de 3 arcos, o mesmo desenho do anel dos footswitches (estilo
     em css/pages.css, `.pg-ring`). `ico` é SVG opcional, já com a classe
     `pg-ring__ico`. Decorativo: quem carrega o sentido é o texto ao lado. */
  function ledRing(color, ico) {
    return '<span class="pg-ring" style="--c:' + esc(color) + '" aria-hidden="true">' +
      '<svg class="pg-ring__svg" viewBox="0 0 100 100"><circle class="pg-ring__off" cx="50" cy="50" r="38" pathLength="360"/><circle cx="50" cy="50" r="38" pathLength="360"/></svg>' +
      '<span class="pg-ring__glow"></span>' + (ico || '') + '</span>';
  }

  /* Cabeçalho dos painéis (css/pages.css, `.pg-head`): micro-rótulo com o
     nome do modelo na etiqueta branca do chassi, título em duas linhas (a
     segunda em laranja) e o lead. Todo texto chega de content.js. */
  function pgHead(o) {
    return '<header class="pg-head">' +
      '<p class="pg-kicker">' + esc(o.kicker) + (o.model ? ' <b>' + esc(o.model) + '</b>' : '') + '</p>' +
      '<h2 class="pg-title"><span class="pg-title__line">' + esc(o.title) + '</span>' +
        (o.hot ? '<span class="pg-title__line pg-title__hot">' + esc(o.hot) + '</span>' : '') + '</h2>' +
      (o.lead ? '<p class="pg-lead">' + esc(o.lead) + '</p>' : '') +
    '</header>';
  }

  /* --------------------------------------------------------------- elementos */

  var selector = $('#selector');          /* cápsula de MODELOS   */
  var track    = $('#selector-track');
  var subSel   = $('#subselector');       /* cápsula de OPÇÕES    */
  var subTrack = $('#subselector-track');
  var live     = $('#live-region');

  var heroH1b  = $('#hero-h1b');
  var heroWordmark = $('#hero-wordmark');
  /* O <p> que envolve a palavra e o campo de luz. Recebe `is-flash` na
     troca de modelo (o clarão do CSS) e a devolve sozinho no fim. */
  var heroWordmarkBox = $('.hero-wordmark');
  if (heroWordmarkBox) heroWordmarkBox.addEventListener('animationend', function (e) {
    if (e.animationName === 'bf-rays-flash') heroWordmarkBox.classList.remove('is-flash');
  });
  var stage    = $('#hero-stage');

  /* A vista 'home' é a VISÃO GERAL do modelo — a foto grande. Ela não tem
     aba própria: quem volta para ela é o modelo aceso na cápsula de cima. */
  var panels = { home: $('#panel-home') };
  panels[SOFTWARE.key] = $('#panel-' + SOFTWARE.key);
  RES.forEach(function (item) { panels[item.key] = $('#panel-' + item.key); });
  SUB.forEach(function (s) { panels[s.key] = $('#panel-' + s.key); });

  /* -------------------------------------------------------- fotos do HOME */

  /* Todas as fotos nascem no DOM e só trocam de opacidade: recriar a <img> a
     cada clique refaria a decodificação e piscaria branco entre modelos.

     A do PRIMEIRO modelo já veio no HTML — ela é o LCP da página e não pode
     depender deste script para ser descoberta pelo navegador. Por isso aqui
     ela é PULADA em vez de reescrita: reescrever descartaria a imagem que já
     está decodificada e devolveria justamente o atraso que o HTML evitou. */
  var mounted = stage.querySelector('.shot[data-i="0"]');

  function mapFigure(m, extraClass) {
    /* Sem foto: o mapa de footswitches do modelo. Os círculos são ornamento
       (aria-hidden); quem carrega o fato para o leitor de tela é o texto. */
    var dots = '';
    for (var d = 0; d < m.switches; d++) dots += '<span class="map-sw"></span>';
    return '<div class="shot-map' + (extraClass ? ' ' + extraClass : '') + '">' +
             '<div class="map-grid is-' + m.switches + '" aria-hidden="true">' + dots + '</div>' +
             '<p class="silk">' + esc(m.switches) + ' footswitches · ' +
               esc(C.pending.shot) + '</p>' +
           '</div>';
  }

  stage.insertAdjacentHTML('beforeend', MODELS.map(function (m, i) {
    if (i === 0 && mounted) return '';
    var on = i === 0 ? ' is-on' : '';
    var inner = m.shot
      ? imgTag(m.shot, m.shotAlt, '(max-width: 860px) 92vw, (max-width: 1200px) 82vw, 1000px', i === 0)
      : mapFigure(m);
    return '<figure class="shot' + on + '" data-i="' + i + '">' + inner + '</figure>';
  }).join(''));

  /* Ordenado por `data-i`, e não pela ordem do DOM: a foto do primeiro modelo
     veio do HTML e as outras foram anexadas depois, então só o atributo
     garante que shots[i] seja mesmo o modelo i. */
  var shots = Array.prototype.slice.call(stage.querySelectorAll('.shot'))
    .sort(function (a, b) {
      return Number(a.getAttribute('data-i')) - Number(b.getAttribute('data-i'));
    });

  /* --------------------------------------------------------------- painéis */

  function eyebrowOf(key) {
    var items = SUB.concat(RES).concat([SOFTWARE]);
    for (var i = 0; i < items.length; i++) if (items[i].key === key) return items[i].eyebrow;
    return '';
  }

  /* ================================================================= INFO ==
     O painel INFO fala a língua da página de Apps (css/pages.css): o
     cabeçalho `pgHead`, a controladora no palco com as COTAS em desenho
     técnico, os quatro números da ficha em cartões grafite com o anel de LED
     de 3 arcos, e a faixa dos anéis de LED como o momento de destaque.

     UM template para os quatro modelos. O que muda de um para o outro sai
     dos dados, nunca de um `if` por modelo: a foto e o recorte da tela, as
     cotas, a quantidade de footswitches da faixa de LED e a de presets por
     banco na matriz do cartão de presets. A foto larga da 6SW+ (26 × 9 cm)
     só troca a composição, pela classe `inf--wide`.

     Estilo em css/info.css, tudo dentro de #panel-info. */

  /* Geometria das fotos do INFO, medida no canal alfa de cada arquivo.
       w, h ..... tamanho do arquivo em px
       body ..... recuo do CORPO do pedal dentro do arquivo, em % — esquerda
                  e direita da largura, cima e baixo da altura. A caixa da
                  foto é recortada nesse corpo, então as cotas encostam no
                  pedal e não na borda transparente (a 8sw-top tem 7,8% de
                  transparência à direita e a nano-top, 9% embaixo)
       screen ... viewBox, em px do arquivo, que recorta a TELA do pedal:
                  o cartão da tela mostra a tela daquele modelo
     Foto nova sem entrada aqui: cotas na borda da imagem, cartão sem
     recorte. */
  var INFO_MEDIA = {
    '8sw-top':    { w: 1200, h: 867,  body: [0.5, 0.4, 7.8, 5.6], screen: '320 60 470 300' },
    'nano-top':   { w: 1200, h: 805,  body: [0.5, 3.0, 0.6, 9.2], screen: '340 206 520 324' },
    '6sw-hero':   { w: 1600, h: 563,  body: [0, 0, 0, 0],         screen: '70 104 480 336' },
    'micro-hero': { w: 1600, h: 1012, body: [0, 0, 0, 0],         screen: '526 224 510 480' }
  };

  /* Cores dos anéis, as que as fotos mostram acesas. Cada par é
     [ligado, desligado]: a faixa de LED alterna cada footswitch entre as
     duas, que é exatamente o que o texto dela promete. */
  var INFO_LEDS = [
    ['#2f8cff', '#ff5a4f'], ['#39e1a0', '#ff9a3d'], ['#ffac61', '#3d7bff'], ['#ff579c', '#39e1e9'],
    ['#ab65ff', '#ffd166'], ['#39e1e9', '#ff579c'], ['#ff6b4a', '#57df95'], ['#ffe9c7', '#ab65ff']
  ];
  /* Cor do anel de cada cartão da ficha, na ordem de `specs`. */
  var INFO_SPEC_KEYS = ['switches', 'presets', 'screen', 'live'];
  var INFO_SPEC_COLORS = ['#ffac61', '#ab65ff', '#39e1e9', '#57df95'];

  /* `{chave}` do texto trocada pelo valor; o texto vem de content.js. */
  function fillCopy(text, vars) {
    return String(text || '').replace(/\{(\w+)\}/g, function (all, k) {
      return vars[k] != null ? vars[k] : all;
    });
  }

  /* Ícone de traço que vai DENTRO do anel de LED do cartão. */
  function infoIcon(key) {
    var paths = {
      switches: '<ellipse cx="16" cy="24" rx="11" ry="5"/><path d="M9 11v11c0 5 14 5 14 0V11"/><ellipse cx="16" cy="10" rx="7" ry="4"/>',
      presets: '<path d="m16 4 12 7-12 7L4 11Z"/><path d="m4 17 12 7 12-7M4 23l12 7 12-7"/>',
      screen: '<rect x="3" y="5" width="26" height="19" rx="2"/><path d="M16 24v5m-7 0h14"/>',
      live: '<path d="m18 2-12 17h9l-1 11 12-18h-9Z" fill="currentColor" stroke="none"/>'
    };
    return '<svg class="pg-ring__ico" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[key] || '') + '</svg>';
  }

  /* O footswitch metálico com o anel de LED de 3 arcos (falhas às 12h, 4h
     e 8h, o mesmo desenho do `.pg-ring`). `pathLength="120"` deixa a conta
     do tracejado legível: 32 de arco + 8 de falha, três vezes. Com `off`, o
     anel desligado fica por baixo e a camada acesa (`inf-sw__lit`) é a que
     o CSS apaga e acende. */
  function switchArt(id, color, off) {
    function ring(cls, c) {
      return '<circle class="' + cls + '" cx="55" cy="57" r="40" pathLength="120" fill="none" stroke="' + c + '"' +
             ' stroke-width="8" stroke-linecap="round" stroke-dasharray="32 8" stroke-dashoffset="26"/>';
    }
    return '<svg class="inf-sw" viewBox="0 0 110 110" aria-hidden="true"><defs>' +
      '<linearGradient id="metal-' + id + '" x2=".8" y2="1"><stop stop-color="#fff3dc"/><stop offset=".3" stop-color="#a9aaa9"/><stop offset=".5" stop-color="#404950"/><stop offset=".72" stop-color="#dfded5"/><stop offset="1" stop-color="#707779"/></linearGradient>' +
      '<radialGradient id="halo-' + id + '"><stop offset=".6" stop-color="' + color + '" stop-opacity="0"/><stop offset=".78" stop-color="' + color + '" stop-opacity=".5"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<circle cx="55" cy="57" r="45" fill="#070b10"/>' +
      (off ? ring('inf-sw__ring inf-sw__ring--off', off) : '') +
      '<g class="inf-sw__lit"><circle cx="55" cy="57" r="53" fill="url(#halo-' + id + ')"/>' + ring('inf-sw__ring', color) + '</g>' +
      '<g transform="translate(0 -2)">' +
        '<path d="m30 35 29-8 24 21-3 29-29 10-25-22Z" fill="url(#metal-' + id + ')" stroke="#111b22" stroke-width="3"/>' +
        '<ellipse cx="53" cy="56" rx="25" ry="28" fill="url(#metal-' + id + ')" stroke="#dedacf" stroke-width="2"/>' +
        '<path d="M30 41v15c0 24 43 24 43 0V41" fill="url(#metal-' + id + ')" stroke="#444c52" stroke-width="2"/>' +
        '<ellipse cx="51" cy="41" rx="22" ry="23" fill="#cbc9c1" stroke="#f0ede2" stroke-width="2"/>' +
      '</g></svg>';
  }

  /* Matriz dos presets: uma coluna por banco (A..J) e uma linha por preset
     do banco. Desenha o número do cartão: 10 × 6 = 60 na maioria, 10 × 4 =
     40 na MICRO. O A1 aceso é o preset em cena. */
  function presetsArt(perBank) {
    var cols = 10, rows = Math.max(1, Math.min(perBank, 8)), cell = 10, gap = 5, cells = '';
    for (var c = 0; c < cols; c++) for (var r = 0; r < rows; r++) {
      cells += '<rect x="' + c * (cell + gap) + '" y="' + r * (cell + gap) + '" width="' + cell + '" height="' + cell + '" rx="2.5"' +
               (c === 0 ? ' class="' + (r === 0 ? 'is-on' : 'is-bank') + '"' : '') + '/>';
    }
    return '<svg class="inf-matrix" viewBox="-2 -2 ' + (cols * (cell + gap) - gap + 4) + ' ' + (rows * (cell + gap) - gap + 4) + '" aria-hidden="true">' + cells + '</svg>';
  }

  /* A arte de cada cartão: o footswitch, a matriz, a tela DAQUELE modelo
     (recortada da própria foto do painel) e a onda do LIVE. */
  function specArt(key, spec, photo, color) {
    if (key === 'switches') return switchArt('spec-sw', color);
    if (key === 'presets') return presetsArt(Math.round(Number(spec.value) / 10) || 6);
    if (key === 'screen') {
      var g = photo && INFO_MEDIA[photo.key];
      if (!g || !g.screen) return '';
      /* Recorte por fundo, e não por <image> num SVG: a imagem inteira
         ficaria com a caixa do tamanho da foto, vazando da tela. */
      var r = g.screen.split(' ').map(Number), pc = function (v) { return (Math.round(v * 100) / 100) + '%'; };
      return '<span class="inf-screen"><span class="inf-screen__glass" style="aspect-ratio:' + r[2] + '/' + r[3] +
        ';background-image:url(assets/' + esc(photo.key) + '.webp)' +
        ';background-size:' + pc(g.w / r[2] * 100) + ' auto' +
        ';background-position:' + pc(r[0] / (g.w - r[2]) * 100) + ' ' + pc(r[1] / (g.h - r[3]) * 100) + '"></span></span>';
    }
    if (key === 'live') {
      return '<svg class="inf-wave" viewBox="0 0 220 150" fill="none" aria-hidden="true"><path d="M0 125C28 124 32 32 68 35S112 155 145 119 183-13 220 9L220 85C180 46 184 146 145 142S101 67 68 70 30 147 0 125" fill="currentColor" opacity=".12"/><path d="M0 125C28 124 32 32 68 35S112 155 145 119 183-13 220 9M0 137C34 158 40 72 76 66S119 146 151 136 181 43 220 68" stroke="currentColor" stroke-width="3"/></svg>';
    }
    return '';
  }

  /* Os nove comportamentos do LIVE viram etiquetas de serigrafia. A lista
     sai da própria `note` do spec ("Stomp, macros, … steps e control."),
     para não existir uma segunda cópia do fato; se o texto mudar de forma e
     não render lista, ele volta a ser um parágrafo. */
  function modeTags(note, label) {
    var items = String(note || '').replace(/\.\s*$/, '').split(/,\s*|\s+e\s+/).filter(Boolean);
    if (items.length < 2) return '<p class="inf-spec__desc">' + esc(note) + '</p>';
    return '<ul class="pg-tags inf-spec__tags" aria-label="' + esc(label) + '">' + items.map(function (t) {
      return '<li>' + esc(t) + '</li>';
    }).join('') + '</ul>';
  }

  /* Os quatro números da ficha. O rótulo é o título do cartão (é por ele
     que o leitor de tela navega), o número vem logo abaixo, grande, e a
     frase do content.js fecha. */
  function specStrip(m, photo) {
    return '<ul class="inf-specs">' + m.specs.map(function (s, i) {
      var key = INFO_SPEC_KEYS[i] || 'switches', copy = C.infoCards[key] || {}, color = INFO_SPEC_COLORS[i] || '#ffffff';
      var art = specArt(key, s, photo, color);
      var body = key === 'live'
        ? modeTags(s.note, s.label)
        : '<p class="inf-spec__desc">' + esc(copy.description || s.note) + '</p>';
      return '<li class="inf-spec pg-card inf-spec--' + key + '" style="--c:' + color + '">' +
        '<h3 class="inf-spec__label">' + ledRing(color, infoIcon(key)) + '<span>' + esc(s.label) + '</span></h3>' +
        '<p class="inf-spec__value">' + esc(s.value) + '</p>' +
        (art ? '<div class="inf-spec__art" aria-hidden="true">' + art + '</div>' : '') +
        '<p class="inf-spec__title">' + esc(copy.title || s.note) + '</p>' +
        body +
      '</li>';
    }).join('') + '</ul>';
  }

  /* A mídia dos painéis usa a foto de DETALHE da banda quando existe: a foto
     em perspectiva o visitante já viu na lista de modelos, e repeti-la aqui
     não acrescentaria nada. Sem banda e sem foto, entra o mapa. */
  function panelMedia(m, band, sizes) {
    var key = (band && band.img) || null;
    var alt = (band && band.alt) || m.shotAlt;
    if (!key && m.shot) { key = m.shot; alt = m.shotAlt; }
    if (!key) return mapFigure(m);
    return '<figure class="panel-shot">' + imgTag(key, alt, sizes, false) + '</figure>';
  }

  /* A foto do INFO: a de DETALHE da banda quando existe (a 8SW+ e a NANO+
     têm a vista de cima com os anéis acesos), senão a principal. */
  function infoPhoto(m, band) {
    if (band && band.img) return { key: band.img, alt: band.alt || m.shotAlt };
    if (m.shot) return { key: m.shot, alt: m.shotAlt };
    return null;
  }

  /* O palco: luz âmbar de cima, contraluz fria atrás, a foto recortada no
     corpo do pedal e as cotas em desenho técnico (linhas de chamada, linha
     de cota com setas e a medida numa etiqueta de serigrafia). As cotas são
     ornamento para quem vê; quem as lê em voz alta é a frase `sr-only` da
     legenda. A nota do modelo (a banda "Recursos da …") é a legenda da
     foto: descreve o corpo que está ali em cima. */
  function dimensionedInfoMedia(m, photo, note) {
    var D = C.infoCards.dims || {}, d = m.dimensions;
    var dimsText = d ? fillCopy(D.label, { model: m.id, w: d.width, h: d.height }) : '';
    var cap = '';
    if (note) {
      cap += '<p class="inf-note__title">' + esc(note.title) + '</p><p class="inf-note__body">' + esc(note.body) + '</p>';
    }
    if (dimsText) cap += '<span class="sr-only">' + esc(dimsText) + '</span>';
    cap = cap ? '<figcaption class="inf-note' + (note ? '' : ' is-sr') + '">' + cap + '</figcaption>' : '';

    if (!photo) {
      return '<figure class="inf-stage inf-stage--map">' + mapFigure(m, 'inf-map') + cap + '</figure>';
    }
    var g = INFO_MEDIA[photo.key], shot, arn = 1.4;
    if (g) {
      var b = g.body, bx = g.w * b[0] / 100, by = g.h * b[1] / 100;
      var bw = g.w * (1 - (b[0] + b[2]) / 100), bh = g.h * (1 - (b[1] + b[3]) / 100);
      var pct = function (v) { return (Math.round(v * 1000) / 1000) + '%'; };
      /* A caixa tem a proporção do CORPO; a imagem é maior que ela e
         desloca as margens transparentes para fora do recorte. */
      arn = Math.round(bw / bh * 1000) / 1000;
      shot = '<div class="inf-shot">' +
        '<div class="inf-shot__photo" style="aspect-ratio:' + Math.round(bw) + '/' + Math.round(bh) + '">' +
          '<span class="inf-shot__img" style="width:' + pct(g.w / bw * 100) + ';height:' + pct(g.h / bh * 100) + ';left:' + pct(-bx / bw * 100) + ';top:' + pct(-by / bh * 100) + '">' +
            imgTag(photo.key, photo.alt, '(max-width: 860px) 92vw, 50vw', false) +
          '</span>' +
        '</div>';
    } else {
      shot = '<div class="inf-shot"><div class="inf-shot__photo is-free">' +
        imgTag(photo.key, photo.alt, '(max-width: 860px) 92vw, 50vw', false) + '</div>';
    }
    if (d) {
      shot += '<span class="inf-dim inf-dim--w" aria-hidden="true"><i></i><b>' + esc(fillCopy(D.value, { v: d.width })) + '</b></span>' +
              '<span class="inf-dim inf-dim--h" aria-hidden="true"><i></i><b>' + esc(fillCopy(D.value, { v: d.height })) + '</b></span>';
    }
    shot += '</div>';
    /* `--arn` (largura ÷ altura do corpo) mora na figura: a foto E a
       legenda saem da mesma conta de largura, e as bordas se alinham. */
    return '<figure class="inf-stage' + (d ? ' has-dims' : '') + '" style="--arn:' + arn + '">' +
      '<div class="inf-stage__lights" aria-hidden="true"></div>' + shot + cap +
    '</figure>';
  }

  /* A faixa dos anéis: um footswitch por pé do modelo (8, 6 ou 4), cada um
     alternando entre a cor de ligado e a de desligado, em tempos
     defasados — o texto ao lado diz que as duas cores são escolha sua. */
  function ledBand(m) {
    var L = C.infoCards.leds || {};
    var n = Math.max(1, Math.min(m.switches || 6, INFO_LEDS.length));
    var cols = n > 5 ? Math.ceil(n / 2) : n;
    var sw = '';
    for (var i = 0; i < n; i++) {
      sw += '<li style="--i:' + i + '">' + switchArt('led-' + i, INFO_LEDS[i][0], INFO_LEDS[i][1]) + '</li>';
    }
    return '<section class="inf-led pg-card" aria-labelledby="inf-led-title">' +
      '<div class="inf-led__copy">' +
        '<h3 class="inf-led__title" id="inf-led-title">' + esc(L.title) + '</h3>' +
        '<p class="inf-led__text">' + esc(L.description) + '</p>' +
      '</div>' +
      '<ul class="inf-led__row pg-well" style="--n:' + n + ';--cols:' + cols + '" aria-hidden="true">' + sw + '</ul>' +
    '</section>';
  }

  function renderInfo(m) {
    var band = bandFor(m, 'info');
    var photo = infoPhoto(m, band);
    var H = C.infoCards.head || {};
    var g = photo && INFO_MEDIA[photo.key];
    /* Foto mais que duas vezes mais larga que alta (a 6SW+): o palco vai
       para cima, a toda largura, e a faixa de LED desce. */
    var wide = !!(g && (g.w * (1 - (g.body[0] + g.body[2]) / 100)) / (g.h * (1 - (g.body[1] + g.body[3]) / 100)) > 2);
    /* A banda de INFO da 8SW+ É o texto dos anéis de LED, que já tem a
       faixa própria; nos outros modelos ela é a nota "Recursos da …". */
    var note = band && band.body && band.body !== (C.infoCards.leds || {}).description ? band : null;
    var d = m.dimensions;
    var lead = fillCopy(d ? H.lead : H.leadNoDims, { w: d && d.width, h: d && d.height, model: m.id });
    /* `.pg` é o container da consulta; a grade mora num filho porque um
       container não responde à própria @container. */
    return '<div class="panel-inner pg inf inf--' + esc(m.hash) + (wide ? ' inf--wide' : '') + '"><div class="inf-grid">' +
      '<div class="inf-head">' + pgHead({ kicker: eyebrowOf('info'), model: m.id, title: H.title, hot: H.hot, lead: lead }) + '</div>' +
      dimensionedInfoMedia(m, photo, note) +
      specStrip(m, photo) +
      ledBand(m) +
    '</div></div>';
  }

  /* ------------------------------------------------- CONEXÕES (IN/OUT) ----
     Duas peças, na ordem de leitura em qualquer largura: o cabeçalho com a
     foto traseira num palco iluminado (css/conects.css, `.cx-hero`) e o
     PAINEL DE CONEXÕES (`.cx-rack`), uma placa grafite com as portas
     agrupadas por família, cada família sob uma etiqueta de serigrafia com
     o anel de LED dela. Todo texto vem de content.js (banda `conects` e
     `C.ports`). */

  /* Família de cada porta: a cor do anel de LED e o ícone da etiqueta do
     grupo. Apresentação, não copy — por isso mora aqui. Porta sem família
     conhecida sai com anel branco e sem ícone. */
  var CX_FAMILY = {
    din5: 'midi', trs: 'midi', usbDevice: 'usb', usbHost: 'usb',
    bluetooth: 'air', wifi: 'air', dualSw: 'in', exp: 'in'
  };
  var CX_LED = { midi: '#ffac61', usb: '#3fa9ff', air: '#b07cff', in: '#57df95' };
  var CX_ICO = {
    midi: '<circle cx="12" cy="12" r="8.6"/><path d="M10.4 20.4v-2h3.2v2"/>' +
          '<g fill="currentColor" stroke="none"><circle cx="7.4" cy="12.4" r="1.25"/><circle cx="16.6" cy="12.4" r="1.25"/>' +
          '<circle cx="8.9" cy="8.5" r="1.25"/><circle cx="15.1" cy="8.5" r="1.25"/><circle cx="12" cy="7" r="1.25"/></g>',
    usb:  '<path d="M12 3.2v14"/><path d="m9.6 5.6 2.4-2.4 2.4 2.4"/><path d="M12 13.6 7.6 11V8.8"/><path d="m12 15.6 4.4-2.6v-2.4"/>' +
          '<circle cx="7.6" cy="7.6" r="1.3"/><rect x="15.2" y="8.2" width="2.4" height="2.4" rx=".4"/><circle cx="12" cy="19.2" r="1.9"/>',
    air:  '<path d="M4.4 9.4a10.8 10.8 0 0 1 15.2 0"/><path d="M7.6 12.8a6.2 6.2 0 0 1 8.8 0"/>' +
          '<circle cx="12" cy="16.6" r="1.5" fill="currentColor" stroke="none"/>',
    in:   '<path d="M2.8 12h9.4"/><path d="m8.8 8.4 3.6 3.6-3.6 3.6"/><rect x="14.6" y="5.6" width="6.6" height="12.8" rx="2"/>'
  };
  function cxIcon(fam) {
    if (!CX_ICO[fam]) return '';
    return '<svg class="pg-ring__ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + CX_ICO[fam] + '</svg>';
  }

  /* O palco com a foto traseira. A caixa da foto tem a proporção EXATA do
     arquivo (`size` da banda), e é por isso que as etiquetas do chassi
     (`silk`, posição em % da largura da foto) caem em cima de cada conector
     em qualquer largura. As etiquetas se alternam em duas alturas, como as
     chamadas de um desenho técnico: conectores vizinhos da 6SW+ ficam a 6%
     um do outro, e numa linha só as etiquetas se encostariam. São
     decorativas — o alt da foto já lista os mesmos nomes. Sem banda (ou
     banda sem foto), entra a foto principal do modelo; sem foto, o mapa. */
  function cxStage(m, band) {
    var fromBand = !!(band && band.img);
    var key = fromBand ? band.img : m.shot;
    var alt = fromBand ? band.alt : m.shotAlt;
    var size = fromBand ? band.size : null;
    var silk = fromBand && band.silk ? band.silk : [];
    var body;
    if (!key) {
      body = mapFigure(m, 'cx-map');
    } else {
      var ratio = size ? Number(size[0]) / Number(size[1]) : 1.9;
      var floor = fromBand && band.floor ? ';--floor:' + Number(band.floor) + '%' : '';
      body = '<div class="cx-shot" style="aspect-ratio:' + ratio.toFixed(4) + ';--ar:' + ratio.toFixed(4) + floor + '">' +
          imgTag(key, alt, '(max-width: 860px) 92vw, 900px', false) +
          (silk.length ? '<div class="cx-silk" aria-hidden="true">' + silk.map(function (s, i) {
            return '<span class="cx-silk__tag' + (i % 2 ? ' is-low' : '') + '" style="--x:' + Number(s[1]) + '%"><b class="pg-tag">' + esc(s[0]) + '</b></span>';
          }).join('') + '</div>' : '') +
        '</div>';
    }
    return '<figure class="cx-stage' + (silk.length ? ' has-silk' : '') + '">' +
      '<span class="cx-lights" aria-hidden="true"><i class="cx-light cx-light--rim"></i><i class="cx-light cx-light--beam"></i></span>' +
      body +
    '</figure>';
  }

  /* O painel de conexões: um bloco por família (`group` de C.ports), na
     ordem em que as portas aparecem em `m.ports`. Chave desconhecida é
     pulada em silêncio. `--g` é o número de grupos (colunas da placa no
     desktop médio) e `--k` o de portas do grupo: no desktop largo os grupos
     dividem a placa na proporção das portas, e todas saem da mesma largura. */
  function portGrid(m, band) {
    var keys = (m.ports || []).filter(function (k) { return C.ports && C.ports[k]; });
    if (!keys.length) return '';
    var alias = (band && band.portTags) || {};
    var groups = [], byName = {};
    keys.forEach(function (k) {
      var g = C.ports[k].group || '';
      if (!Object.prototype.hasOwnProperty.call(byName, g)) { byName[g] = { label: g, keys: [] }; groups.push(byName[g]); }
      byName[g].keys.push(k);
    });
    return '<div class="cx-rack" style="--n:' + keys.length + ';--g:' + groups.length + '">' + groups.map(function (g) {
      var fam = CX_FAMILY[g.keys[0]];
      var led = CX_LED[fam] || '#ffffff';
      return '<div class="cx-group" style="--c:' + led + ';--k:' + g.keys.length + '">' +
        (g.label ? '<h3 class="cx-group__head">' + ledRing(led, cxIcon(fam)) + '<span class="cx-group__name">' + esc(g.label) + '</span></h3>' : '') +
        '<ul class="cx-ports">' + g.keys.map(function (k) {
          var p = C.ports[k];
          var tag = alias[k] || p.tag || '';
          return '<li class="cx-port"><div class="cx-port__in">' +
            '<span class="cx-port__art"><img src="assets/' + esc(p.img) + '.webp" width="480" height="' + esc(p.h || 480) + '" alt="" loading="lazy" decoding="async"></span>' +
            '<span class="cx-port__txt">' +
              '<span class="cx-port__id">' + (tag ? '<span class="pg-tag">' + esc(tag) + '</span>' : '') +
                '<strong class="cx-port__name">' + esc(p.name || p.label) + '</strong></span>' +
              (p.role ? '<span class="cx-port__role">' + esc(p.role) + '</span>' : '') +
            '</span>' +
          '</div></li>';
        }).join('') + '</ul>' +
      '</div>';
    }).join('') + '</div>';
  }

  function renderConects(m) {
    var band = bandFor(m, 'conects');
    /* O micro-rótulo diz "Conexões" e a etiqueta do chassi diz de QUAL
       modelo. Sem banda, o título é o NOME do modelo e o lead é o texto de
       espera — então a etiqueta sai, senão o nome apareceria duas vezes
       seguidas. */
    var head = band
      ? pgHead({ kicker: eyebrowOf('conects'), model: m.id, title: band.title, hot: band.hot, lead: band.body })
      : pgHead({ kicker: eyebrowOf('conects'), title: m.id, lead: C.pending.conects });

    return '<div class="panel-inner pg cx">' +
      '<div class="cx-hero">' +
        '<div class="cx-copy">' + head + '</div>' +
        cxStage(m, band) +
      '</div>' +
      portGrid(m, band) +
    '</div>';
  }

  /* ---------------------------------------------------- painel SHOP ----
     Mesma linguagem da vitrine dos Apps (css/pages.css + css/shop.css):
     cabeçalho pg-head com o nome do modelo, a foto num palco com luz
     (feixe âmbar de cima, contraluz azul, sombra de contato), a ficha em
     números, as etiquetas de porta do chassi e o cartão de compra com o
     WhatsApp do grupo de espera no mesmo acabamento.

     O que o dono ESCONDEU com `buy.hideDetails` (preço, lead genérico e
     lista) continua escondido; sem a flag o bloco volta, dentro do cartão.
     Botão sem loja (`primary.href` '#') sai desabilitado, com a ficha
     `buy.soon` e a frase `unavailable` (id buy-unavailable) embaixo. */
  var SHOP_ICONS = {
    cart: '<path d="M3 3h2l3 12h11l2-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
    go: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    out: '<path d="M7 17 17 7M9 7h8v8"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2.4"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    wa: '<path d="M20.5 11.8a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.3-4.7A8.5 8.5 0 1 1 20.5 11.8Z"/><path d="M8.3 7.5c.2-.4.4-.4.7-.4h.5l.8 2c.1.3 0 .5-.2.7l-.6.7c-.2.2-.1.4 0 .6a9 9 0 0 0 3.5 3.1c.3.1.5.1.7-.1l.8-1c.2-.3.5-.3.8-.2l1.9.9c.3.1.4.3.4.5 0 .4-.2 1.3-.8 1.8-.6.6-1.5.9-2.5.6-1.1-.3-2.8-.9-4.7-2.6-1.6-1.5-2.7-3.3-3-4.4-.3-1 .1-1.8.5-2.2.3-.3.8-.5 1.2-.5Z"/>'
  };
  function shopSvg(key, cls) {
    return '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (SHOP_ICONS[key] || '') + '</svg>';
  }
  /* O endereço da loja à vista, tirado do próprio link: trocou o `href`
     no content.js, o texto acompanha. */
  function shopHost(href) {
    var hit = /^https?:\/\/([^\/?#]+)/i.exec(href || '');
    return hit ? hit[1].replace(/^www\./i, '') : '';
  }

  function renderComprar(m) {
    var modelBuy = m.buy || {};
    var b = {
      unavailable: modelBuy.unavailable || C.buy.unavailable,
      price: modelBuy.price || C.buy.price,
      lead: modelBuy.lead || C.buy.lead,
      list: modelBuy.list || C.buy.list,
      primary: modelBuy.primary || C.buy.primary,
      ghost: modelBuy.ghost || C.buy.ghost,
      waitlist: modelBuy.waitlist || null,
      hideDetails: modelBuy.hideDetails === true
    };
    var off = !b.primary || !b.primary.href || b.primary.href === '#';

    /* O botão de compra. Sem loja, ele continua na tela (desabilitado)
       para o visitante saber que o modelo existe e que a compra não é
       por aqui AINDA — o caminho ativo passa a ser o WhatsApp. */
    var cta = '';
    if (b.primary && b.primary.label) {
      if (off) {
        cta = '<button class="pg-cta shop-cta is-off" type="button" disabled aria-describedby="buy-unavailable">' +
                shopSvg('cart', 'shop-cta__ico') + '<span class="shop-cta__label">' + esc(b.primary.label) + '</span>' +
                '<span class="shop-soon">' + esc(C.buy.soon) + '</span></button>' +
              '<p class="shop-dest is-off" id="buy-unavailable">' + shopSvg('clock', 'shop-dest__ico') +
                '<span>' + esc(b.unavailable) + '</span></p>';
      } else {
        var host = shopHost(b.primary.href);
        cta = '<a class="pg-cta shop-cta" href="' + esc(b.primary.href) + '">' +
                shopSvg('cart', 'shop-cta__ico') + '<span class="shop-cta__label">' + esc(b.primary.label) + '</span>' +
                shopSvg('go', 'shop-cta__go') + '</a>' +
              (host ? '<p class="shop-dest">' + shopSvg('lock', 'shop-dest__ico') +
                '<span>' + esc(C.buy.storeNote) + ' <b>' + esc(host) + '</b></span></p>' : '');
      }
    }

    var wait = b.waitlist
      ? '<p class="shop-sep" aria-hidden="true"><span>' + esc(C.buy.waitKicker) + '</span></p>' +
        '<a class="shop-wa" href="' + esc(b.waitlist.href) + '" target="_blank" rel="noopener noreferrer">' +
          ledRing('#39d98a', shopSvg('wa', 'pg-ring__ico')) +
          '<span class="shop-wa__txt"><strong>' + esc(b.waitlist.label) + '</strong>' +
            '<span>' + esc(b.waitlist.text) + '</span></span>' +
          shopSvg('out', 'shop-wa__go') +
          '<span class="sr-only"> (' + esc(C.buy.newTab) + ')</span>' +
        '</a>'
      : '';

    var details = b.hideDetails ? '' :
      '<div class="shop-details"><p class="shop-price">' + esc(b.price) + '</p>' + listTag(b.list) + '</div>';

    /* A ficha: os mesmos quatro números do painel INFO, sem as notas. */
    var facts = (m.specs && m.specs.length)
      ? '<dl class="shop-facts">' + m.specs.map(function (s) {
          return '<div class="shop-fact"><dt>' + esc(s.label) + '</dt><dd>' + esc(s.value) + '</dd></div>';
        }).join('') + '</dl>'
      : '';

    /* Conexões: etiqueta curta à vista (serigrafia), descrição longa de
       `ports` para o leitor de tela. Chave desconhecida é pulada. */
    var keys = (m.ports || []).filter(function (k) { return C.ports && C.ports[k]; });
    var tags = C.buy.portTags || {};
    var ports = keys.length
      ? '<div class="shop-ports"><p class="shop-label" id="shop-ports-label">' + esc(eyebrowOf('conects')) + '</p>' +
          '<ul class="pg-tags" aria-labelledby="shop-ports-label">' + keys.map(function (k) {
            return '<li><span aria-hidden="true">' + esc(tags[k] || C.ports[k].label) + '</span>' +
                   '<span class="sr-only">' + esc(C.ports[k].label) + '</span></li>';
          }).join('') + '</ul></div>'
      : '';

    /* O palco: a caixa tem proporção fixa no CSS (sem salto de layout) e
       a foto pousa na linha do chão. Luz e chão são só gradiente. */
    var stage = '<figure class="shop-stage">' +
        '<div class="shop-stage__lights" aria-hidden="true"><i class="shop-light shop-light--haze"></i><i class="shop-light shop-light--rim"></i><i class="shop-light shop-light--beam"></i></div>' +
        '<div class="shop-stage__floor" aria-hidden="true"></div>' +
        '<div class="shop-stage__shot">' +
          (m.shot ? imgTag(m.shot, m.shotAlt, '(max-width: 860px) 92vw, 50vw', false) : mapFigure(m)) +
        '</div>' +
      '</figure>';

    /* `shop--<hash>`: ajuste fino de proporção do palco por modelo (css). */
    return '<div class="panel-inner pg"><div class="shop shop--' + esc(m.hash) + (off ? ' is-off' : '') + '">' +
      pgHead({
        kicker: eyebrowOf('comprar'),
        title: m.h1[0],
        hot: m.h1[1],
        lead: b.hideDetails ? m.lead : b.lead
      }) +
      stage +
      '<div class="shop-buy">' + details + cta + wait + '</div>' +
      facts +
      ports +
    '</div></div>';
  }


  /* Icônes funcionais em traço, compartilhados por todos os submenus. */
  var ICONS = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
    conects: '<path d="M7 3v5m6-5v5M5 8h10v3a5 5 0 0 1-10 0Zm5 8v2a3 3 0 0 0 6 0v-3h4v6"/>',
    comprar: '<path d="M3 3h2l3 12h11l2-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
    apps: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    downloads: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
    backup: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6"/><path d="M7 15s2-3 5-3 5 3 5 3-2 3-5 3-5-3-5-3Z"/><circle cx="12" cy="15" r="1"/>',
    manual: '<path d="M12 5C8 2 5 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-3-1-6-2-10 1Zm0 0v16"/>',
    system: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18M8 14h2m4 0h2m-8 3h8"/>',
    gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.09a2 2 0 0 1 1 1.74v.5a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/>'
  };
  function icon(key) { return '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[key] || '') + '</svg>'; }
  /* ------------------------------------ painéis DOWNLOADS e MANUAL ----
     Os dois com o mesmo desenho (css/downloads.css): cabeçalho pg-head e
     cartões grafite com anel de LED, micro-rótulo, título, descrição e o
     botão, que cobre o cartão inteiro. Link externo abre em nova aba e diz
     isso à vista; link interno (`data-go`) troca o painel sem sair. */
  var DL_ICONS = {
    apps: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    updater: '<path d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
    central: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
    downloads: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
    manual: '<path d="M12 6.5C10 5 7 4.5 3.5 5v13.5c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z"/><path d="M12 6.5V20"/>',
    backup: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6"/><path d="M7 15s2-3 5-3 5 3 5 3-2 3-5 3-5-3-5-3Z"/><circle cx="12" cy="15" r="1"/>'
  };
  /* A cor do anel de cada cartão: as mesmas quatro da vitrine dos Apps. */
  var DL_COLORS = { apps: '#ff8a3d', updater: '#4c8dff', central: '#ff8a3d', downloads: '#4c8dff', manual: '#3ddc84', backup: '#b57bff' };

  function dlCard(o, D) {
    var ext = !o.go;
    var color = DL_COLORS[o.k] || '#4c8dff';
    return '<li class="dl-card" style="--c:' + esc(color) + '">' +
      '<div class="dl-card__top">' +
        ledRing(color, '<svg class="pg-ring__ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (DL_ICONS[o.k] || DL_ICONS.downloads) + '</svg>') +
        '<p class="dl-card__k">' + esc(o.kicker || '') + '</p>' +
      '</div>' +
      '<h3 class="dl-card__t">' + esc(o.title) + '</h3>' +
      '<p class="dl-card__p">' + esc(o.text) + '</p>' +
      '<div class="dl-card__foot">' +
        '<a class="dl-card__go" href="' + esc(o.href) + '"' +
          (ext ? ' target="_blank" rel="noopener noreferrer"' : ' data-go="' + esc(o.go) + '"') + '>' +
          '<span>' + esc(o.label) + '</span>' +
          (ext ? '<span class="sr-only"> (' + esc(String(D.newTab || '').toLowerCase()) + ')</span>' : '') +
          shopSvg(ext ? 'out' : 'go', 'dl-card__arrow') +
        '</a>' +
        '<span class="dl-card__dest" aria-hidden="true">' + esc(ext ? (D.newTabShort || D.newTab) : D.here) + '</span>' +
      '</div>' +
    '</li>';
  }

  function renderResource(item) {
    var D = RES.find(function (entry) { return entry.key === 'downloads'; }) || {};
    var model = MODELS[curModel >= 0 ? curModel : 0];
    function byKey(list, key) {
      return (list || []).find(function (link) { return link.key === key; });
    }
    function fromLink(link) {
      return link && { k: link.key, kicker: link.kicker, title: link.title, text: link.description, label: link.label, href: link.href };
    }
    var cards = [];
    if (item.key === 'downloads') {
      var manualItem = RES.find(function (entry) { return entry.key === 'manual'; });
      if (item.apps) cards.push({
        k: 'apps', kicker: item.apps.kicker, title: item.apps.title, text: item.apps.description,
        label: item.apps.label, href: '#' + model.hash + '/apps', go: 'view:apps'
      });
      cards.push(fromLink(byKey(item.links, 'updater')));
      cards.push(fromLink(manualItem && (byKey(manualItem.links, 'manual') || manualItem.links[0])));
      cards.push(fromLink(byKey(item.links, 'backup')));
    } else {
      (item.links || []).forEach(function (link) { cards.push(fromLink(link)); });
      (item.related || []).forEach(function (key) {
        var other = RES.find(function (entry) { return entry.key === key; });
        if (other) cards.push({
          k: key, kicker: other.eyebrow, title: other.title, text: other.lead,
          label: other.goLabel || other.label, href: '#' + model.hash + '/' + key, go: 'view:' + key
        });
      });
    }
    cards = cards.filter(Boolean);
    var head = item.head || { title: item.title };
    return '<div class="panel-inner pg"><div class="dl dl--' + esc(item.key) + '" style="--n:' + cards.length + '">' +
      '<div class="dl-lights" aria-hidden="true"></div>' +
      pgHead({ kicker: item.eyebrow, title: head.title, hot: head.hot, lead: item.lead }) +
      '<ul class="dl-grid" role="list">' + cards.map(function (o) { return dlCard(o, D); }).join('') + '</ul>' +
    '</div></div>';
  }

  function renderSoftware(item) {
    return '<div class="panel-inner software-page">' +
      '<section class="software-hero">' +
        '<div class="software-brand-icon" role="img" aria-label="Ícone do Sistema BFMiDi"></div>' +
        '<div class="software-intro"><p class="silk">' + esc(item.eyebrow) + '</p>' +
          '<h2 class="panel-title">' + esc(item.title) + '</h2>' +
          '<p class="panel-lead">' + esc(item.lead) + '</p></div>' +
        '<a class="btn btn-primary software-action" href="' + esc(item.action.href) + '" target="_blank" rel="noopener noreferrer">' +
          esc(item.action.label) + '<span aria-hidden="true">↗</span></a>' +
      '</section>' +
      '<div class="software-features">' + item.features.map(function (feature, i) {
        return '<article class="software-feature"><span class="software-feature-number">0' + (i + 1) + '</span>' +
          '<h3>' + esc(feature.title) + '</h3><p>' + esc(feature.description) + '</p></article>';
      }).join('') + '</div>' +
    '</div>';
  }

  var RENDER = { info: renderInfo, conects: renderConects, comprar: renderComprar, software: function () { return renderSoftware(SOFTWARE); } };

  RES.forEach(function (item) {
    if (item.key !== 'apps') RENDER[item.key] = function () { return renderResource(item); };
  });

  /* O painel é remontado só quando MUDA o modelo que ele está mostrando — o
     atributo é a memória disso. Sem ele, cada ida e volta pelo submenu
     recriaria as <img> e devolveria o piscar que o HOME evita. */
  function ensurePanel(key, mi) {
    var el = panels[key];
    if (!el || !RENDER[key] || key === 'apps') return;
    if (el.getAttribute('data-for') === String(mi)) return;
    el.innerHTML = RENDER[key](MODELS[mi]);
    el.setAttribute('data-for', String(mi));
    el.scrollTop = 0;
  }

  /* --------------------------------------------------------------- cápsulas */

  /* As duas são construídas UMA VEZ e nunca mais reescritas. Enquanto o
     seletor trocava de estado, o track era refeito por innerHTML a cada
     clique e havia uma classe só para congelar a animação durante a troca;
     com uma cápsula para cada nível, nada disso é preciso. */
  function fillTrack(el, items, label, attr) {
    el.innerHTML = items.map(function (it, i) {
      return '<button class="tab" type="button"' +
             (it.key ? ' id="subtab-' + esc(it.key) + '" role="tab"' +
                       ' aria-controls="panel-' + esc(it.key) + '"' : '') +
             ' data-i="' + i + '"' +
             ' data-go="' + (it.key ? 'view:' + esc(it.key) : 'model:' + i) + '"' +
             ' ' + attr + '="false">' + (it.key ? icon(it.key) : '') + '<span>' + esc(it[label]) + '</span></button>';
    }).join('');
  }

  function markTabs(el, attr, idx) {
    var tabs = el.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].setAttribute(attr, i === idx ? 'true' : 'false');
    }
  }

  /* ------------------------------------------------------------ aplicação */


  /* O modelo é preservado ao consultar Apps, Downloads ou Manual. */
  var curModel = -1, curView = '', lastResource = 'downloads';
  var modelNav = $('#model-navigation');
  var resourceNav = $('#resource-navigation');
  var overview = $('#overview-link');
  function resourceView(view) { return RES.some(function (item) { return item.key === view; }); }
  function softwareView(view) { return view === SOFTWARE.key; }
  function isView(view) { return softwareView(view) || SUB.concat(RES).some(function (item) { return item.key === view; }); }
  function viewIndex(view) { return SUB.findIndex(function (item) { return item.key === view; }); }

  function apply(mi, view) {
    mi = Number.isFinite(mi) ? Math.max(0, Math.min(MODELS.length - 1, Math.trunc(mi))) : 0;
    if (view !== 'home' && !isView(view)) view = 'home';
    if (mi === curModel && view === curView) return;
    var first = curView === '', m = MODELS[mi], resources = resourceView(view), software = softwareView(view), appView = view === 'apps', special = resources || software;
    curModel = mi;
    curView = view;
    var helpDialog = $('#ajuda-dialog');
    if (view !== 'apps' && helpDialog && helpDialog.open) helpDialog.close();
    if (resources && view !== 'apps') lastResource = view;
    var active = (software || appView) ? MODELS.length : resources ? MODELS.length + 1 : mi;
    selector.style.setProperty('--i', active);
    selector.classList.toggle('apps-active', appView);
    markTabs(track, 'aria-pressed', active);
    track.querySelectorAll('.tab').forEach(function (tab, i) { tab.tabIndex = i === active ? 0 : -1; });
    var gear = $('#resources-toggle');
    gear.setAttribute('aria-expanded', String(resources));
    var mobileApps = $('#mobile-apps-toggle');
    var mobileResources = $('#mobile-resources-toggle');
    var mobileUtility = $('#mobile-utility-navigation');
    if (mobileUtility) mobileUtility.hidden = view !== 'home';
    if (mobileApps) mobileApps.setAttribute('aria-pressed', String(appView));
    if (mobileResources) {
      mobileResources.setAttribute('aria-pressed', String(resources && !appView));
      mobileResources.setAttribute('aria-expanded', String(resources && !appView));
    }
    modelNav.hidden = special;
    resourceNav.hidden = !resources;
    var vi = viewIndex(view);
    subSel.classList.toggle('is-idle', vi < 0);
    if (vi >= 0) subSel.style.setProperty('--i', vi);
    markTabs(subTrack, 'aria-selected', vi);
    var ri = RES.findIndex(function (item) { return item.key === view; });
    markTabs(resourceNav, 'aria-selected', ri);
    resourceNav.querySelectorAll('.tab').forEach(function (tab, i) { tab.tabIndex = i === ri ? 0 : -1; });
    modelNav.querySelectorAll('button').forEach(function (tab, i) { tab.tabIndex = i === vi + 1 ? 0 : -1; });
    overview.classList.toggle('is-active', view === 'home');
    if (view === 'home') overview.setAttribute('aria-current', 'page');
    else overview.removeAttribute('aria-current');
    heroH1b.textContent = m.id;
    if (heroWordmark.textContent !== m.h1[1]) {
      heroWordmark.textContent = m.h1[1];
      /* A palavra nova acende: clarão curto no campo de luz. Não na
         primeira pintura — ali não há troca, só chegada. Tirar e repor a
         classe com um reflow no meio é o que reinicia a animação. */
      if (!first && heroWordmarkBox) {
        heroWordmarkBox.classList.remove('is-flash');
        void heroWordmarkBox.offsetWidth;
        heroWordmarkBox.classList.add('is-flash');
      }
    }
    shots.forEach(function (shot, i) { shot.classList.toggle('is-on', i === mi); shot.setAttribute('aria-hidden', String(i !== mi)); });
    if (view !== 'home') ensurePanel(view, mi);
    Object.keys(panels).forEach(function (key) {
      var panel = panels[key], on = key === view;
      panel.classList.toggle('is-on', on);
      panel.setAttribute('aria-hidden', String(!on));
      panel.inert = !on;
    });
    document.title = special ? eyebrowOf(view) + ' — BFMIDI | BFFX' : m.id + ' — Controladoras MIDI de palco | BFFX';
    if (!first && window.history && history.replaceState) history.replaceState(null, '', '#' + m.hash + (view === 'home' ? '' : '/' + view));
    if (!first && live) live.textContent = special ? eyebrowOf(view) : m.id + (view === 'home' ? ' selecionado.' : ' · ' + eyebrowOf(view));
  }

  document.addEventListener('click', function (event) {
    var control = event.target.closest('[data-go]');
    if (!control) return;
    event.preventDefault();
    var go = control.getAttribute('data-go');
    if (go === 'resources') apply(curModel, resourceView(curView) && curView !== 'apps' ? 'home' : lastResource);
    else if (go === 'home') apply(curModel, 'home');
    else if (go.indexOf('model:') === 0) apply(Number(go.slice(6)), 'home');
    else if (go.indexOf('view:') === 0) apply(curModel, go.slice(5));
  });

  /* Setas, Home e End percorrem cada nível sem perder o foco. */
  function wireKeys(container, getIndex, select) {
    container.addEventListener('keydown', function (event) {
      var buttons = Array.from(container.querySelectorAll('button'));
      var current = getIndex(), next;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % buttons.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current + buttons.length - 1) % buttons.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else return;
      event.preventDefault();
      select(next);
      buttons[next].focus();
    });
  }
  wireKeys(selector, function () { return (softwareView(curView) || curView === 'apps') ? MODELS.length : resourceView(curView) ? MODELS.length + 1 : curModel; }, function (i) {
    if (i === MODELS.length) apply(curModel, curView === 'apps' ? 'apps' : 'software');
    else if (i === MODELS.length + 1) apply(curModel, lastResource);
    else apply(i, 'home');
  });
  wireKeys(modelNav, function () { return viewIndex(curView) + 1; }, function (i) { apply(curModel, i === 0 ? 'home' : SUB[i - 1].key); });
  wireKeys(resourceNav, function () { return RES.findIndex(function (item) { return item.key === curView; }); }, function (i) { apply(curModel, RES[i].key); });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || curView === 'home' || document.querySelector('dialog[open]')) return;
    var wasResource = resourceView(curView);
    apply(curModel, 'home');
    if (wasResource) track.querySelector('[data-i="' + curModel + '"]').focus();
    else overview.focus();
  });
  function fromHash() {
    var parts = (location.hash || '').slice(1).toLowerCase().split('/');
    var model = MODELS.findIndex(function (m) { return m.hash === parts[0]; });
    return { model: model >= 0 ? model : 0, view: isView(parts[1]) ? parts[1] : 'home' };
  }
  window.addEventListener('hashchange', function () { var state = fromHash(); apply(state.model, state.view); });

  document.querySelectorAll('[data-copy]').forEach(function (el) { var copy = C.ui && C.ui[el.getAttribute('data-copy')]; if (copy) el.textContent = copy; });
  fillTrack(track, MODELS, 'tab', 'aria-pressed');
  track.insertAdjacentHTML('beforeend', '<button class="tab software-tab apps-tab" id="software-toggle" type="button" data-i="' + MODELS.length + '" data-go="view:apps" aria-label="Apps" title="Apps" aria-pressed="false" aria-controls="panel-apps">' + icon('apps') + '</button>');
  track.insertAdjacentHTML('beforeend', '<button class="tab gear-tab" id="resources-toggle" type="button" data-i="' + (MODELS.length + 1) + '" data-go="resources" aria-label="' + esc(C.resources.label) + '" title="' + esc(C.resources.label) + '" aria-pressed="false" aria-expanded="false" aria-controls="resource-navigation">' + icon('gear') + '</button>');
  selector.style.setProperty('--n', MODELS.length + 2);
  fillTrack(subTrack, SUB, 'label', 'aria-selected');
  subSel.style.setProperty('--n', SUB.length);
  fillTrack(resourceNav, RES, 'label', 'aria-selected');
  overview.innerHTML = icon('home') + '<span>' + esc(C.ui.overview) + '</span>';
  overview.title = C.ui.overview;

  var start = fromHash();
  apply(start.model, start.view);
})();
