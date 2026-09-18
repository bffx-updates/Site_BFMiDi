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

  function specStrip(m) {
    return '<div class="spec-strip">' + m.specs.map(function (s) {
      return '<div class="spec-cell">' +
        '<span class="silk">' + esc(s.label) + '</span>' +
        '<span class="spec-value">' + esc(s.value) + '</span>' +
        '<p class="spec-note">' + esc(s.note) + '</p>' +
      '</div>';
    }).join('') + '</div>';
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

  function renderInfo(m) {
    var band = bandFor(m, 'info');
    var intro = m.hash === '8sw' ? '' :
      '<p class="silk">' + esc(eyebrowOf('info')) + '</p>' +
      '<h2 class="panel-title">' + esc(m.id) + '</h2>' +
      '<p class="panel-lead">' + esc(m.lead) + '</p>';
    var feature = band
      ? '<div class="feat"><h3 class="feat-title">' + esc(band.title) + '</h3>' +
        '<p class="feat-body">' + esc(band.body) + '</p>' + listTag(band.list) + '</div>'
      : '<p class="panel-note">' + esc(C.pending.bands) + '</p>';

    return '<div class="panel-inner split">' +
      '<div class="split-media">' + panelMedia(m, band, '(max-width: 900px) 86vw, 42vw') + '</div>' +
      '<div class="split-copy">' +
        intro +
        specStrip(m) +
        feature +
      '</div>' +
    '</div>';
  }

  /* A faixa de conexões (CONECTS): um <img> por chave de `m.ports`, tirado
     do catálogo C.ports. O nome já está impresso na arte, então o alt repete
     o mesmo texto e nada mais. Chave desconhecida é pulada em silêncio. É o
     TERCEIRO filho do .split, depois da foto e do texto: no desktop atravessa
     as duas colunas; no celular o CSS a põe entre a foto e o texto. */
  function portGrid(m) {
    var keys = (m.ports || []).filter(function (k) { return C.ports && C.ports[k]; });
    if (!keys.length) return '';
    /* --n é a contagem: o CSS abre exatamente n colunas no desktop. Um
       auto-fit com máximo de 150px contava as colunas pelo MÁXIMO e abria
       sete para oito tiles — o último caía numa segunda linha. */
    return '<ul class="port-grid" style="--n:' + keys.length + '" aria-label="Conexões da ' + esc(m.id) + '">' +
      keys.map(function (k) {
        var p = C.ports[k];
        return '<li><img src="assets/' + esc(p.img) + '.webp" width="480" height="' + esc(p.h || 480) + '" alt="' + esc(p.label) + '" loading="lazy" decoding="async"></li>';
      }).join('') +
    '</ul>';
  }

  function renderConects(m) {
    var band = bandFor(m, 'conects');
    var head = band
      ? '<h2 class="panel-title">' + esc(band.title) + '</h2>' +
        '<p class="panel-lead">' + esc(band.body) + '</p>' + listTag(band.list)
      /* Sem banda de conexões, o título é o NOME do modelo, e não a palavra
         "Conexões": ela já está impressa no micro-rótulo logo acima, e
         repeti-la deixava a mesma palavra duas vezes seguidas na tela. */
      : '<h2 class="panel-title">' + esc(m.id) + '</h2>' +
        '<p class="panel-lead">' + esc(C.pending.conects) + '</p>';

    /* O NOME DO MODELO ENTRA NO MICRO-RÓTULO quando o título é o da banda.
       Antes existia uma dica acima da cápsula dizendo qual modelo estava em
       cena; ela saiu, e INFO e COMPRAR não sentiram porque os dois já usam o
       nome como título. CONECTS é o único painel em que o título é outro —
       sem esta linha, ele seria a única tela do site que não diz de quem são
       aquelas conexões. */
    var eyebrow = band ? eyebrowOf('conects') + ' · ' + m.id : eyebrowOf('conects');

    return '<div class="panel-inner split">' +
      '<div class="split-media">' + panelMedia(m, band, '(max-width: 900px) 86vw, 42vw') + '</div>' +
      '<div class="split-copy">' +
        '<p class="silk">' + esc(eyebrow) + '</p>' +
        head +
      '</div>' +
      portGrid(m) +
    '</div>';
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
    function cta(spec, cls) {
      if (!spec || !spec.label) return '';
      if (!spec.href || spec.href === '#') {
        return '<button class="btn ' + cls + '" type="button" disabled aria-describedby="buy-unavailable">' +
               esc(spec.label) + '</button>';
      }
      return '<a class="btn ' + cls + '" href="' + esc(spec.href || '#') + '">' +
             esc(spec.label) + '</a>';
    }
    var thumb = m.shot
      ? '<figure class="buy-thumb">' +
          imgTag(m.shot, m.shotAlt, '(max-width: 900px) 60vw, 300px', false) +
        '</figure>'
      : '';
    var waitlist = b.waitlist
      ? '<a class="whatsapp-waitlist" href="' + esc(b.waitlist.href) + '" target="_blank" rel="noopener noreferrer">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.8a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.3-4.7A8.5 8.5 0 1 1 20.5 11.8Z"/><path d="M8.3 7.5c.2-.4.4-.4.7-.4h.5l.8 2c.1.3 0 .5-.2.7l-.6.7c-.2.2-.1.4 0 .6a9 9 0 0 0 3.5 3.1c.3.1.5.1.7-.1l.8-1c.2-.3.5-.3.8-.2l1.9.9c.3.1.4.3.4.5 0 .4-.2 1.3-.8 1.8-.6.6-1.5.9-2.5.6-1.1-.3-2.8-.9-4.7-2.6-1.6-1.5-2.7-3.3-3-4.4-.3-1 .1-1.8.5-2.2.3-.3.8-.5 1.2-.5Z"/></svg>' +
          '<span><strong>' + esc(b.waitlist.label) + '</strong>' + esc(b.waitlist.text) + '</span>' +
        '</a>'
      : '';

    return '<div class="panel-inner buy">' +
      thumb +
      (b.hideDetails ? '' :
        '<p class="silk">' + esc(eyebrowOf('comprar')) + '</p>' +
        '<h2 class="panel-title">' + esc(m.id) + '</h2>' +
        '<p class="buy-price">' + esc(b.price) + '</p>' +
        '<p class="panel-lead">' + esc(b.lead) + '</p>' +
        listTag(b.list)) +
      '<div class="hero-ctas">' + cta(b.primary, 'btn-primary') + cta(b.ghost, 'btn-ghost') + '</div>' +
      waitlist +
      ((!b.primary.href || b.primary.href === '#' || !b.ghost.href || b.ghost.href === '#')
        ? '<p class="buy-unavailable" id="buy-unavailable">' + esc(b.unavailable) + '</p>' : '') +
    '</div>';
  }


  /* Icônes funcionais em traço, compartilhados por todos os submenus. */
  var ICONS = {
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
    conects: '<path d="M7 3v5m6-5v5M5 8h10v3a5 5 0 0 1-10 0Zm5 8v2a3 3 0 0 0 6 0v-3h4v6"/>',
    comprar: '<path d="M3 3h2l3 12h11l2-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
    apps: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    downloads: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
    manual: '<path d="M12 5C8 2 5 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-3-1-6-2-10 1Zm0 0v16"/>',
    system: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 9h18M8 14h2m4 0h2m-8 3h8"/>',
    gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.09a2 2 0 0 1 1 1.74v.5a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/>'
  };
  function icon(key) { return '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[key] || '') + '</svg>'; }
  function renderResource(item) {
    return '<div class="panel-inner resource-page"><div class="resource-heading">' + icon(item.key) +
      '<h2 class="panel-title">' + esc(item.title) + '</h2><p class="panel-lead">' + esc(item.lead) + '</p></div>' +
      '<div class="resource-cards">' + item.links.map(function (link) {
        return '<article class="resource-card"><h3>' + esc(link.title) + '</h3><p>' + esc(link.description) +
          '</p><a class="btn btn-primary" href="' + esc(link.href) + '" target="_blank" rel="noopener noreferrer">' +
          esc(link.label) + '<span class="sr-only"> (abre em nova aba)</span><span aria-hidden="true">↗</span></a></article>';
      }).join('') + '</div></div>';
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
    var first = curView === '', m = MODELS[mi], resources = resourceView(view), software = softwareView(view), special = resources || software;
    curModel = mi;
    curView = view;
    var helpDialog = $('#ajuda-dialog');
    if (view !== 'apps' && helpDialog && helpDialog.open) helpDialog.close();
    if (resources && view !== 'apps') lastResource = view;
    var active = software ? MODELS.length : resources ? MODELS.length + 1 : mi;
    selector.style.setProperty('--i', active);
    markTabs(track, 'aria-pressed', active);
    track.querySelectorAll('.tab').forEach(function (tab, i) { tab.tabIndex = i === active ? 0 : -1; });
    var gear = $('#resources-toggle');
    gear.setAttribute('aria-expanded', String(resources));
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
  wireKeys(selector, function () { return softwareView(curView) ? MODELS.length : resourceView(curView) ? MODELS.length + 1 : curModel; }, function (i) {
    if (i === MODELS.length) apply(curModel, 'software');
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
  track.insertAdjacentHTML('beforeend', '<button class="tab software-tab" id="software-toggle" type="button" data-i="' + MODELS.length + '" data-go="view:software" aria-label="' + esc(SOFTWARE.label) + '" title="' + esc(SOFTWARE.label) + '" aria-pressed="false" aria-controls="panel-software">' + icon('system') + '</button>');
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
