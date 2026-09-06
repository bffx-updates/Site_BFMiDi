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
  var SUB    = (C.sub && C.sub.items) || [];

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
  var stage    = $('#hero-stage');

  /* A vista 'home' é a VISÃO GERAL do modelo — a foto grande. Ela não tem
     aba própria: quem volta para ela é o modelo aceso na cápsula de cima. */
  var panels = { home: $('#panel-home') };
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
    for (var i = 0; i < SUB.length; i++) if (SUB[i].key === key) return SUB[i].eyebrow;
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
    var feature = band
      ? '<div class="feat"><h3 class="feat-title">' + esc(band.title) + '</h3>' +
        '<p class="feat-body">' + esc(band.body) + '</p>' + listTag(band.list) + '</div>'
      : '<p class="panel-note">' + esc(C.pending.bands) + '</p>';

    return '<div class="panel-inner split">' +
      '<div class="split-media">' + panelMedia(m, band, '(max-width: 900px) 86vw, 42vw') + '</div>' +
      '<div class="split-copy">' +
        '<p class="silk">' + esc(eyebrowOf('info')) + '</p>' +
        '<h2 class="panel-title">' + esc(m.id) + '</h2>' +
        '<p class="panel-lead">' + esc(m.lead) + '</p>' +
        specStrip(m) +
        feature +
      '</div>' +
    '</div>';
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

    /* O editor fecha o painel: conectar ao editor é a última conexão da lista,
       e é a que diferencia o aparelho. Texto compartilhado — não é do modelo. */
    var editor =
      '<div class="editor-note">' +
        '<span class="silk silk-accent">' + esc(C.closer.eyebrow) + '</span>' +
        '<h3 class="feat-title">' + esc(C.closer.title) + '</h3>' +
        '<p class="feat-body">' + esc(C.closer.lead) + '</p>' +
      '</div>';

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
        editor +
      '</div>' +
    '</div>';
  }

  function renderComprar(m) {
    var b = C.buy;
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

    return '<div class="panel-inner buy">' +
      thumb +
      '<p class="silk">' + esc(eyebrowOf('comprar')) + '</p>' +
      '<h2 class="panel-title">' + esc(m.id) + '</h2>' +
      '<p class="buy-price">' + esc(b.price) + '</p>' +
      '<p class="panel-lead">' + esc(b.lead) + '</p>' +
      listTag(b.list) +
      '<div class="hero-ctas">' + cta(b.primary, 'btn-primary') + cta(b.ghost, 'btn-ghost') + '</div>' +
      ((!b.primary.href || b.primary.href === '#' || !b.ghost.href || b.ghost.href === '#')
        ? '<p class="buy-unavailable" id="buy-unavailable">' + esc(b.unavailable) + '</p>' : '') +
    '</div>';
  }

  var RENDER = { info: renderInfo, conects: renderConects, comprar: renderComprar };

  /* O painel é remontado só quando MUDA o modelo que ele está mostrando — o
     atributo é a memória disso. Sem ele, cada ida e volta pelo submenu
     recriaria as <img> e devolveria o piscar que o HOME evita. */
  function ensurePanel(key, mi) {
    var el = panels[key];
    if (!el || !RENDER[key]) return;
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
             ' ' + attr + '="false">' + esc(it[label]) + '</button>';
    }).join('');
  }

  function markTabs(el, attr, idx) {
    var tabs = el.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].setAttribute(attr, i === idx ? 'true' : 'false');
    }
  }

  /* ------------------------------------------------------------ aplicação */

  var curModel = -1;
  var curView  = '';

  function isView(v) {
    for (var i = 0; i < SUB.length; i++) if (SUB[i].key === v) return true;
    return false;
  }
  function viewIndexOrIdle(v) {
    for (var i = 0; i < SUB.length; i++) if (SUB[i].key === v) return i;
    return -1;
  }

  function apply(mi, view) {
    mi = Number.isFinite(mi) ? Math.max(0, Math.min(MODELS.length - 1, Math.trunc(mi))) : 0;
    if (view !== 'home' && !isView(view)) view = 'home';
    if (mi === curModel && view === curView) return;

    var first = curView === '';
    var modelChanged = mi !== curModel;
    var viewChanged  = view !== curView;
    var m = MODELS[mi];

    curModel = mi;
    curView  = view;

    /* ---- as duas cápsulas ---- */
    selector.style.setProperty('--i', mi);
    markTabs(track, 'aria-pressed', mi);

    /* O índice -1 é a VISÃO GERAL: nenhuma opção em cena. A classe apaga o
       leito e o LED em vez de escondê-los, senão eles saltariam de posição
       ao voltar. O `--i` continua no último item aceso, e é dali que o LED
       reacende quando o visitante volta a escolher uma opção. */
    var vi = viewIndexOrIdle(view);
    subSel.classList.toggle('is-idle', vi < 0);
    if (vi >= 0) subSel.style.setProperty('--i', vi);
    markTabs(subTrack, 'aria-selected', vi);

    /* ---- painel HOME (mantido em dia mesmo fora de cena) ---- */
    heroH1b.textContent  = m.h1[1];
    $('#model-index').textContent = String(mi + 1).padStart(2, '0');
    $('#overview-link').classList.toggle('is-active', view === 'home');
    if (view === 'home') $('#overview-link').setAttribute('aria-current', 'page');
    else $('#overview-link').removeAttribute('aria-current');
    $('#hero-facts').innerHTML = m.specs.map(function (s) {
      return '<div class="hero-fact"><span class="fact-value">' + esc(s.value) +
             '</span><span class="fact-label">' + esc(s.label) + '</span></div>';
    }).join('');
    shots.forEach(function (s, k) {
      s.classList.toggle('is-on', k === mi);
      s.setAttribute('aria-hidden', k === mi ? 'false' : 'true');
    });

    /* ---- painel em cena ---- */
    if (view !== 'home') ensurePanel(view, mi);
    Object.keys(panels).forEach(function (k) {
      var el = panels[k];
      if (!el) return;
      var on = k === view;
      el.classList.toggle('is-on', on);
      el.setAttribute('aria-hidden', on ? 'false' : 'true');
      el.inert = !on;
    });

    document.title = m.id + ' — Controladoras MIDI de palco | BFFX';

    /* A URL acompanha a escolha para o link poder ser compartilhado, mas via
       replaceState: `location.hash =` empilharia uma entrada no histórico a
       cada clique e prenderia o botão Voltar dentro da página. */
    if (!first && window.history && history.replaceState) {
      history.replaceState(null, '', '#' + m.hash + (view === 'home' ? '' : '/' + view));
    }

    /* Anúncio só depois da primeira pintura: na carga inicial não houve
       mudança nenhuma para anunciar. */
    if (!first && live) {
      live.textContent = modelChanged && viewChanged ? m.id + ' · ' + eyebrowOf(view)
                       : viewChanged                 ? eyebrowOf(view) || m.id
                       : m.id + ' selecionado.';
    }
  }

  /* ------------------------------------------------------------- interação */

  /* UM clique para a página inteira. Qualquer elemento com `data-go` navega:
       data-go="model:2"     escolhe o modelo (e abre o submenu)
       data-go="view:info"   abre um painel do modelo em cena
       data-go="home"        volta à lista de modelos
     É o que deixa o CTA do cabeçalho, os botões do hero, as abas e o VOLTAR
     compartilharem o mesmo caminho, inclusive os que o JS cria depois. */
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-go]') : null;
    if (!el) return;
    var go = el.getAttribute('data-go');
    e.preventDefault();

    /* Clicar num MODELO devolve a visão geral dele. É por isso que o botão
       VOLTAR deixou de existir: o modelo aceso já é o caminho de volta, e
       ele nunca sai da tela. */
    if (go === 'home') { apply(curModel < 0 ? 0 : curModel, 'home'); return; }
    if (go.indexOf('model:') === 0) { apply(Number(go.slice(6)), 'home'); return; }
    if (go.indexOf('view:') === 0)  { apply(curModel < 0 ? 0 : curModel, go.slice(5)); }
  });

  /* Setas percorrem a cápsula, como em qualquer conjunto de opções. Home/End
     vão às pontas, Esc volta aos modelos. O foco acompanha a seleção — senão
     a seta moveria a página sem mover o cursor de quem navega por teclado. */
  /* Setas percorrem a cápsula em que o foco está — cada uma tem o seu
     conjunto. Home/End vão às pontas. O foco acompanha a seleção: senão a
     seta moveria a página sem mover o cursor de quem navega por teclado. */
  function wireKeys(el, count, currentIdx, go) {
    el.addEventListener('keydown', function (e) {
      var map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1, ArrowDown: 1 };
      var cur = currentIdx();
      var next;
      if (e.key in map) next = (cur < 0 ? 0 : cur) + map[e.key];
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = count() - 1;
      else return;
      e.preventDefault();
      next = Math.max(0, Math.min(count() - 1, next));
      go(next);
      var tab = el.querySelector('.tab[data-i="' + next + '"]');
      if (tab) tab.focus();
    });
  }

  wireKeys(selector,
           function () { return MODELS.length; },
           function () { return curModel; },
           function (i) { apply(i, 'home'); });

  wireKeys(subSel,
           function () { return SUB.length; },
           function () { return viewIndexOrIdle(curView); },
           function (i) { apply(curModel, SUB[i].key); });

  /* Esc devolve a visão geral do modelo, de qualquer painel. */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && curView !== 'home') apply(curModel, 'home');
  });

  /* Link direto: #8sw, #nano/conects, #micro/comprar. Também responde ao
     Voltar do navegador. A forma antiga (#8sw, sem painel) continua valendo e
     cai na lista de modelos — links já publicados não mudam de destino. */
  function fromHash() {
    var raw = (location.hash || '').replace('#', '').toLowerCase().split('/');
    var out = { model: -1, view: 'home' };
    for (var i = 0; i < MODELS.length; i++) {
      if (MODELS[i].hash === raw[0]) { out.model = i; break; }
    }
    if (raw[1] && isView(raw[1])) out.view = raw[1];
    return out;
  }
  window.addEventListener('hashchange', function () {
    var h = fromHash();
    if (h.model >= 0) apply(h.model, h.view);
  });

  /* ------------------------------------------------------------------ boot */
  document.querySelectorAll('[data-copy]').forEach(function (el) {
    var copy = C.ui && C.ui[el.getAttribute('data-copy')];
    if (copy) el.textContent = copy;
  });

  /* As abas vêm ESTÁTICAS do HTML (ver o comentário lá) e aqui são refeitas a
     partir do content.js: a marcação garante que as cápsulas existam mesmo
     sem script, e o conteúdo garante o texto. Se os dois discordarem no
     número de itens, o content.js ganha. */
  fillTrack(track, MODELS, 'tab', 'aria-pressed');
  selector.style.setProperty('--n', MODELS.length);
  fillTrack(subTrack, SUB, 'label', 'aria-selected');
  subSel.style.setProperty('--n', SUB.length);

  var start = fromHash();
  apply(start.model >= 0 ? start.model : 0, start.model >= 0 ? start.view : 'home');
})();
