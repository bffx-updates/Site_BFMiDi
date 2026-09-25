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

   A página ROLA como uma leitura normal, mas a navegação toda continua cabendo
   em `apply(modelo, vista)`: o painel troca por opacidade, dentro da mesma
   caixa, e cada troca de vista volta ao topo (sem scrollIntoView, âncora nem
   seção). Quem abre o painel pelo meio de uma rolagem anterior perderia o
   título de vista.

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
     em css/pages.css, `.pg-ring`). `color` é a cor do ASSUNTO, passada como
     string de token: 'var(--led-usb)' (tabela em css/tokens.css). `ico` é SVG
     opcional, já com a classe `pg-ring__ico`. Decorativo: quem carrega o
     sentido é o texto ao lado. */
  function ledRing(color, ico) {
    return '<span class="pg-ring" style="--c:' + esc(color) + '" aria-hidden="true">' +
      '<svg class="pg-ring__svg" viewBox="0 0 100 100"><circle class="pg-ring__off" cx="50" cy="50" r="38" pathLength="360"/><circle cx="50" cy="50" r="38" pathLength="360"/></svg>' +
      '<span class="pg-ring__glow"></span>' + (ico || '') + '</span>';
  }

  /* Cabeçalho dos painéis (css/pages.css, `.pg-head`): micro-rótulo com o
     nome do modelo na etiqueta branca do chassi, título em duas linhas (a
     segunda em laranja) e o lead. Todo texto chega de content.js.
       o.kicker  a palavra do micro-rótulo
       o.model   a etiqueta branca (o nome do modelo); o.tag é sinônimo, para
                 etiqueta que não é modelo. Sem nenhum dos dois, o micro-rótulo
                 sai sem etiqueta (Downloads, Manual)
       o.id      id do <h2>, para aria-labelledby e para o foco do "Pular"
       o.title / o.hot / o.lead  as duas linhas do título e o lead
     Sem palavra e sem etiqueta, o micro-rótulo não é desenhado. */
  function pgHead(o) {
    var tag = o.model || o.tag;
    return '<header class="pg-head">' +
      (o.kicker || tag
        ? '<p class="pg-kicker">' + esc(o.kicker || '') + (tag ? ' <b>' + esc(tag) + '</b>' : '') + '</p>'
        : '') +
      '<h2 class="pg-title"' + (o.id ? ' id="' + esc(o.id) + '"' : '') + '><span class="pg-title__line">' + esc(o.title) + '</span>' +
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
  RES.forEach(function (item) { panels[item.key] = $('#panel-' + item.key); });
  SUB.forEach(function (s) { panels[s.key] = $('#panel-' + s.key); });

  /* -------------------------------------------------------- fotos do HOME */

  /* A HOME é um PALCO composto por DADOS, sem ajuste por modelo:

       · CHÃO COMUM — as quatro controladoras pousam na mesma linha, logo
         acima do nome, e a luz de estúdio (.bf-stage, css/pages.css) prende
         a sombra de contato à base de cada uma;
       · ESCALA REAL — a altura do palco vale a controladora mais funda
         (models[].dimensions) e cada modelo ocupa a fração que a medida
         dele pede: a MICRO sai menor que a 8SW+ porque é menor. Numa tela
         estreita manda a largura, e cada uma cabe inteira;
       · CAIXA RECORTADA NO CORPO — HOME_MEDIA.body tira a borda
         transparente do arquivo, então a sombra encosta no pedal.
     A conta mora em css/home.css; daqui só saem as variáveis de cada
     <figure> (--home-ar, --home-rel, --crop-*).

     SÓ A FOTO À VISTA É BAIXADA. A do primeiro modelo vem no HTML (é o LCP
     e não pode esperar este script); a do modelo do link entra assim que a
     HOME aparece; as outras nascem como <figure> vazia e ganham a <img> na
     primeira intenção de troca (ponteiro, foco ou toque na aba do modelo)
     ou com o navegador ocioso depois do load. Um link direto para outra
     vista (#nano/info) não baixa foto de HOME até a HOME aparecer.

     Depois de montada, a foto só troca de opacidade: recriar a <img> a cada
     clique refaria a decodificação e piscaria entre modelos. A <img> do HTML
     é ADOTADA, nunca reescrita — reescrever descartaria a imagem já
     decodificada e o srcset que a pré-carga do <head> casou. */
  var mounted = stage.querySelector('.shot[data-i="0"]');

  /* Geometria das fotos do HOME, medida no canal alfa de cada arquivo (a
     mesma convenção do INFO_MEDIA):
       w, h ..... tamanho do arquivo grande, em px
       sm, md ... largura das variantes -sm/-md que existem (0 = não existe)
       body ..... recuo do CORPO do pedal dentro do arquivo, em % — esquerda
                  e direita da largura, cima e baixo da altura
     Foto nova sem entrada aqui: caixa = arquivo inteiro, proporção 3:2. */
  var HOME_MEDIA = {
    '8sw-hero-front': { w: 1600, h: 1146, sm: 800, md: 0,    body: [1, 1.25, 1.05, 0.96] },
    '6sw-hero':       { w: 1600, h: 563,  sm: 800, md: 1200, body: [0, 0, 0.18, 0.18] },
    'nano-hero':      { w: 1536, h: 1024, sm: 800, md: 1200, body: [2.2, 2.15, 6.93, 8.59] },
    'micro-hero':     { w: 1600, h: 1012, sm: 800, md: 1200, body: [0, 0, 0, 0] }
  };
  /* Largura em que a foto aparece. No desktop ela acompanha a ALTURA da
     janela (o teto do palco), então uma medida fixa pegaria o arquivo
     de 800px numa tela de 2560 e o ampliaria. */
  var HOME_SIZES = '(max-width: 600px) 92vw, (max-width: 860px) 84vw, 56vw';
  var HOME_DEEPEST = MODELS.reduce(function (max, m) {
    return Math.max(max, (m.dimensions && m.dimensions.height) || 0);
  }, 0);

  function r4(v) { return Math.round(v * 10000) / 10000; }
  function homeNums(m) {
    var g = HOME_MEDIA[m.shot], b = g ? g.body : [0, 0, 0, 0];
    return {
      b: b,
      ar: r4(g ? (g.w * (100 - b[0] - b[1])) / (g.h * (100 - b[2] - b[3])) : 1.5),
      rel: r4(m.dimensions && HOME_DEEPEST ? m.dimensions.height / HOME_DEEPEST : 1)
    };
  }
  function homeGeom(m) {
    var n = homeNums(m), b = n.b;
    return '--home-ar:' + n.ar + ';--home-rel:' + n.rel +
           ';--crop-l:' + b[0] + ';--crop-r:' + b[1] + ';--crop-t:' + b[2] + ';--crop-b:' + b[3];
  }
  /* Até 860px o palco tem a altura do pedal MAIS ALTO dos quatro na
     largura atual (css/home.css, --home-tall): trocar de modelo não move
     o chão nem o nome. É a mesma conta de cada pedal — o teto vezes a
     escala real, ou a largura dividida pela proporção —, e o maior vence. */
  stage.style.setProperty('--home-tall', 'max(' + MODELS.map(function (m) {
    var n = homeNums(m);
    return 'min(calc(var(--home-cap) * ' + n.rel + '), calc(100cqw / ' + n.ar + '))';
  }).join(', ') + ')');

  function homeImg(m, eager) {
    var g = HOME_MEDIA[m.shot] || {}, base = 'assets/' + m.shot;
    var set = [];
    if (g.sm) set.push(base + '-sm.webp ' + g.sm + 'w');
    if (g.md) set.push(base + '-md.webp ' + g.md + 'w');
    set.push(base + '.webp ' + (g.w || 1600) + 'w');
    return '<img src="' + esc(base) + '.webp" srcset="' + esc(set.join(', ')) + '"' +
           ' sizes="' + HOME_SIZES + '" alt="' + esc(m.shotAlt || '') + '"' +
           ' fetchpriority="' + (eager ? 'high' : 'low') + '" decoding="async">';
  }

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

  /* Uma <figure> por modelo, VAZIA: a luz de estúdio (contraluz e chão) já
     vem nela, e a foto entra em mountShot(). */
  var HOME_LIGHT = '<i class="bf-stage__rim" aria-hidden="true"></i>' +
                   '<i class="bf-stage__floor" aria-hidden="true"></i>';
  stage.insertAdjacentHTML('beforeend', MODELS.map(function (m, i) {
    if (i === 0 && mounted) return '';
    return '<figure class="shot bf-stage' + (i === 0 ? ' is-on' : '') + '" data-i="' + i + '"' +
           ' style="' + homeGeom(m) + '">' + HOME_LIGHT + '</figure>';
  }).join(''));

  /* Ordenado por `data-i`, e não pela ordem do DOM: a foto do primeiro modelo
     veio do HTML e as outras foram anexadas depois, então só o atributo
     garante que shots[i] seja mesmo o modelo i. */
  var shots = Array.prototype.slice.call(stage.querySelectorAll('.shot'))
    .sort(function (a, b) {
      return Number(a.getAttribute('data-i')) - Number(b.getAttribute('data-i'));
    });

  /* Foto decodificada, por modelo. Quem troca de modelo com a foto nova
     ainda a caminho segura a anterior (`is-hold`) até ela decodificar — no
     máximo HOME_HOLD_MS, para o nome e a foto não ficarem em desacordo. */
  var homeReady = [];
  var HOME_HOLD_MS = 450;

  function watchShot(i, img) {
    var done = function () { homeReady[i] = true; homeSettle(); };
    if (!img) { done(); return; }
    if (img.decode) img.decode().then(done, function () {
      /* decode() recusa quando o arquivo ainda não chegou em alguns
         navegadores: aí quem avisa é o load (ou o erro). */
      if (img.complete) done();
      else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
    });
    else if (img.complete) done();
    else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
  }

  function mountShot(i, eager) {
    var fig = shots[i], m = MODELS[i];
    if (!fig || !m || fig.hasAttribute('data-mount')) return;
    fig.setAttribute('data-mount', '');
    if (!m.shot) {
      fig.insertAdjacentHTML('beforeend', mapFigure(m));
      watchShot(i, null);
      return;
    }
    fig.insertAdjacentHTML('beforeend', '<div class="shot-body">' + homeImg(m, eager) + '</div>');
    watchShot(i, fig.querySelector('img'));
  }

  /* A figura do HTML é adotada como está (ver acima). */
  if (mounted) {
    mounted.setAttribute('style', homeGeom(MODELS[0]));
    mounted.setAttribute('data-mount', '');
    watchShot(0, mounted.querySelector('img'));
  }

  /* O micro-rótulo sob o nome: categoria + etiqueta do chassi. A etiqueta
     repete o modelo que o h1 já anunciou, por isso fica fora da leitura. */
  var heroKicker = $('#hero-kicker');
  function homeKicker(i) {
    var m = MODELS[i];
    if (!heroKicker || !m || !C.ui || !C.ui.header) return;
    if (heroKicker.getAttribute('data-for') === m.hash) return;
    heroKicker.setAttribute('data-for', m.hash);
    heroKicker.innerHTML = '<span>' + esc(C.ui.header) + '</span><b aria-hidden="true">' + esc(m.id) + '</b>';
  }

  /* Abaixo de 900px a luz do nome acompanha a LARGURA da palavra
     (css/home.css usa --wm-w); no desktop os valores --wm-* seguem
     travados e esta medida não é lida. */
  if (window.ResizeObserver && heroWordmark && heroWordmarkBox) {
    new ResizeObserver(function () {
      heroWordmarkBox.style.setProperty('--wm-w', heroWordmark.offsetWidth + 'px');
    }).observe(heroWordmark);
  }

  /* Estado da troca. Quem decide o modelo e a vista é apply(); daqui só se
     OBSERVA o resultado (a classe is-on das figuras e do painel HOME), para
     esta parte não precisar de gancho dentro da navegação. */
  var homeOn = -1, homeVisible = false, homeHold = null, homeHoldTimer = 0, homeIdleArmed = false;

  function homeRelease() {
    clearTimeout(homeHoldTimer);
    if (homeHold) homeHold.classList.remove('is-hold');
    homeHold = null;
  }

  /* Só mexe na classe quando ela muda de fato: classList.remove() sempre
     reescreve o atributo, e cada escrita acordaria o observador de novo. */
  function homeSettle() {
    shots.forEach(function (fig, i) {
      if (homeReady[i] && fig.classList.contains('is-pending')) fig.classList.remove('is-pending');
    });
    if (homeHold && homeReady[homeOn]) homeRelease();
  }

  /* As outras fotos, quando o navegador folgar — nunca com economia de
     dados ligada; aí cada uma espera a intenção de troca. */
  function homeIdle() {
    if (homeIdleArmed) return;
    homeIdleArmed = true;
    if (navigator.connection && navigator.connection.saveData) return;
    var run = function () { shots.forEach(function (fig, i) { mountShot(i, false); }); };
    var later = function () {
      if (window.requestIdleCallback) requestIdleCallback(run, { timeout: 4000 });
      else setTimeout(run, 1500);
    };
    if (document.readyState === 'complete') later();
    else window.addEventListener('load', later, { once: true });
  }

  function homeSync() {
    var on = -1;
    for (var i = 0; i < shots.length; i++) if (shots[i].classList.contains('is-on')) { on = i; break; }
    if (on < 0) return;
    homeKicker(on);
    /* A proporção do modelo à vista: numa tela estreita o palco encolhe
       até a altura dele (css/home.css), em vez de sobrar céu em cima. */
    stage.style.setProperty('--home-on-ar', shots[on].style.getPropertyValue('--home-ar') || '1.5');
    stage.style.setProperty('--home-on-rel', shots[on].style.getPropertyValue('--home-rel') || '1');
    var visible = panels.home.classList.contains('is-on');
    if (!visible) { homeVisible = false; homeRelease(); return; }
    /* Troca DENTRO da HOME (e não a chegada nela): a foto que entra vem
       do lado do modelo escolhido, e a que sai espera a nova decodificar. */
    var swap = homeVisible && homeOn >= 0 && on !== homeOn;
    mountShot(on, true);
    if (swap) {
      homeRelease();
      stage.style.setProperty('--dir', on > homeOn ? '1' : '-1');
      stage.setAttribute('data-swap', '');
      if (!homeReady[on]) {
        shots[on].classList.add('is-pending');
        homeHold = shots[homeOn];
        homeHold.classList.add('is-hold');
        homeHoldTimer = setTimeout(homeRelease, HOME_HOLD_MS);
      }
    } else if (!homeVisible) {
      /* Chegada à HOME vinda de outro painel: quem anima é o painel. */
      stage.removeAttribute('data-swap');
    }
    homeOn = on;
    homeVisible = true;
    homeSettle();
    homeIdle();
  }

  if (window.MutationObserver) {
    var homeWatch = new MutationObserver(homeSync);
    shots.forEach(function (fig) { homeWatch.observe(fig, { attributes: true, attributeFilter: ['class'] }); });
    homeWatch.observe(panels.home, { attributes: true, attributeFilter: ['class'] });
  }
  /* A primeira leitura espera apply() terminar (ele roda no fim deste
     arquivo): um microtask entra depois do script inteiro. */
  Promise.resolve().then(homeSync);

  /* Intenção de troca: a foto do modelo apontado começa a descer antes
     do clique, e o clique já a encontra decodificada. */
  function homeIntent(event) {
    var b = event.target && event.target.closest && event.target.closest('[data-go^="model:"]');
    if (b) mountShot(Number(b.getAttribute('data-go').slice(6)), false);
  }
  selector.addEventListener('pointerover', homeIntent);
  selector.addEventListener('focusin', homeIntent);
  selector.addEventListener('touchstart', homeIntent, { passive: true });

  /* --------------------------------------------------------------- painéis */

  function eyebrowOf(key) {
    var items = SUB.concat(RES);
    for (var i = 0; i < items.length; i++) if (items[i].key === key) return items[i].eyebrow;
    return '';
  }

  /* ================================================================= INFO ==
     O painel INFO fala a língua da página de Apps (css/pages.css): o
     cabeçalho `pgHead`, a controladora no palco com as COTAS em desenho
     técnico, os quatro números da ficha em cartões grafite com o anel de LED
     de 3 arcos, e a faixa dos anéis de LED como o momento de destaque.

     UM template para os quatro modelos, sempre na mesma ordem: cabeçalho,
     a nota "Recursos da …" (quando o modelo tem), o cartão dos anéis de LED
     e, do outro lado, a foto no ESTÚDIO ÚNICO (`.bf-stage`, css/pages.css);
     depois os quatro números da ficha e o cartão de PRÓXIMO PASSO. O que
     muda de um modelo para o outro sai dos dados, nunca de um `if` por
     modelo: a foto e o recorte da tela, as cotas, a quantidade de
     footswitches da faixa de LED e a de presets por banco na matriz do
     cartão de presets. A foto larga da 6SW+ (26 × 9 cm) só troca a
     proporção das colunas, pela classe `inf--wide`.

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
  /* Cor do anel de cada cartão da ficha, na ordem de `specs`: a cor é a do
     ASSUNTO (tabela --led-* em css/tokens.css), a mesma que o assunto tem
     em IN/OUT, Apps e Downloads — footswitches, presets, tela e LIVE. */
  var INFO_SPEC_KEYS = ['switches', 'presets', 'screen', 'live'];
  var INFO_SPEC_COLORS = ['var(--led-midi)', 'var(--led-presets)', 'var(--led-screen)', 'var(--led-live)'];

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
     do tracejado legível: 32 de arco + 8 de falha, três vezes. `color`
     pode ser 'currentColor' (o cartão da ficha pinta pela cor do assunto).

     Com `off` (a faixa dos anéis), o desenho vira DUAS camadas: o SVG de
     base (fundo, anel desligado e o botão de metal) e, por cima, um <span>
     `inf-sw__lit` com o anel aceso e o halo. É o <span> que o CSS apaga e
     acende: opacidade de elemento HTML vai para o compositor; a de um <g>
     de SVG repinta o desenho a cada quadro. O anel e o halo não encostam
     no metal (o botão termina no raio ~32; o halo nasce transparente no
     31,8 e o anel começa no 36), então ficar por cima não muda o desenho. */
  function switchArt(id, color, off) {
    function ring(cls, c) {
      return '<circle class="' + cls + '" cx="55" cy="57" r="40" pathLength="120" fill="none" stroke="' + c + '"' +
             ' stroke-width="8" stroke-linecap="round" stroke-dasharray="32 8" stroke-dashoffset="26"/>';
    }
    var halo = '<radialGradient id="halo-' + id + '"><stop offset=".6" stop-color="' + color + '" stop-opacity="0"/><stop offset=".78" stop-color="' + color + '" stop-opacity=".5"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></radialGradient>';
    var lit = '<circle cx="55" cy="57" r="53" fill="url(#halo-' + id + ')"/>' + ring('inf-sw__ring', color);
    var metal = '<g transform="translate(0 -2)">' +
        '<path d="m30 35 29-8 24 21-3 29-29 10-25-22Z" fill="url(#metal-' + id + ')" stroke="#111b22" stroke-width="3"/>' +
        '<ellipse cx="53" cy="56" rx="25" ry="28" fill="url(#metal-' + id + ')" stroke="#dedacf" stroke-width="2"/>' +
        '<path d="M30 41v15c0 24 43 24 43 0V41" fill="url(#metal-' + id + ')" stroke="#444c52" stroke-width="2"/>' +
        '<ellipse cx="51" cy="41" rx="22" ry="23" fill="#cbc9c1" stroke="#f0ede2" stroke-width="2"/>' +
      '</g>';
    var base = '<svg class="inf-sw" viewBox="0 0 110 110" aria-hidden="true"><defs>' +
      '<linearGradient id="metal-' + id + '" x2=".8" y2="1"><stop stop-color="#fff3dc"/><stop offset=".3" stop-color="#a9aaa9"/><stop offset=".5" stop-color="#404950"/><stop offset=".72" stop-color="#dfded5"/><stop offset="1" stop-color="#707779"/></linearGradient>' +
      (off ? '' : halo) +
      '</defs>' +
      '<circle cx="55" cy="57" r="45" fill="#070b10"/>' +
      (off ? ring('inf-sw__ring inf-sw__ring--off', off) : lit) +
      metal + '</svg>';
    if (!off) return base;
    return '<span class="inf-sw-stack">' + base +
      '<span class="inf-sw__lit"><svg class="inf-sw__glow" viewBox="0 0 110 110" aria-hidden="true"><defs>' + halo + '</defs>' + lit + '</svg></span>' +
    '</span>';
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
  function specArt(key, spec, photo) {
    if (key === 'switches') return switchArt('spec-sw', 'currentColor');
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

  /* Os quatro números da ficha, lidos como um painel de instrumento: as
     quatro linhas de cada cartão (rótulo, número, frase, descrição) são as
     MESMAS linhas da grade da fileira (subgrid em css/info.css), então os
     números e as frases dos quatro cartões ficam na mesma altura. O rótulo
     é o título do cartão (é por ele que o leitor de tela navega) e fica
     neutro (`pg-label`): a cor do assunto mora só no anel. O número é a
     leitura de instrumento (`pg-readout`). */
  function specStrip(m, photo) {
    return '<ul class="inf-specs">' + m.specs.map(function (s, i) {
      var key = INFO_SPEC_KEYS[i] || 'switches', copy = C.infoCards[key] || {}, color = INFO_SPEC_COLORS[i] || 'var(--led-doc)';
      var art = specArt(key, s, photo);
      var body = key === 'live'
        ? modeTags(s.note, s.label)
        : '<p class="inf-spec__desc">' + esc(copy.description || s.note) + '</p>';
      return '<li class="inf-spec pg-card inf-spec--' + key + '" style="--c:' + color + '">' +
        '<h3 class="inf-spec__label pg-label">' + ledRing(color, infoIcon(key)) + '<span>' + esc(s.label) + '</span></h3>' +
        '<p class="inf-spec__value pg-readout">' + esc(s.value) + '</p>' +
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

  /* O palco: a foto recortada no corpo do pedal, sob a luz do ESTÚDIO ÚNICO
     (`.bf-stage` de css/pages.css — feixe âmbar de cima, contraluz azul
     atrás, poça quente e sombra de contato no chão, a mesma luz dos outros
     painéis), com as cotas em desenho técnico por cima (linhas de chamada,
     linha de cota com setas e a medida numa etiqueta de serigrafia). As
     cotas são ornamento para quem vê; quem as lê em voz alta é a legenda
     `sr-only` da figura.

     A figura ocupa a coluna inteira (e, no desktop, a altura inteira da
     coluna do texto); o estúdio cobre a figura e a moldura `.inf-shot`
     (a foto + o espaço das cotas) fica centrada no pé dela. O estúdio acha
     o pedal só com CSS: o centro, a largura e a altura da foto saem de
     --shot-h, --arn e --room-r (css/info.css). */
  function dimensionedInfoMedia(m, photo) {
    var D = C.infoCards.dims || {}, d = m.dimensions;
    var dimsText = d ? fillCopy(D.label, { model: m.id, w: d.width, h: d.height }) : '';
    var cap = dimsText ? '<figcaption class="sr-only">' + esc(dimsText) + '</figcaption>' : '';

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
      shot = '<div class="inf-shot__photo" style="aspect-ratio:' + Math.round(bw) + '/' + Math.round(bh) + '">' +
          '<span class="inf-shot__img" style="width:' + pct(g.w / bw * 100) + ';height:' + pct(g.h / bh * 100) + ';left:' + pct(-bx / bw * 100) + ';top:' + pct(-by / bh * 100) + '">' +
            imgTag(photo.key, photo.alt, '(max-width: 860px) 92vw, 50vw', false) +
          '</span>' +
        '</div>';
    } else {
      shot = '<div class="inf-shot__photo is-free">' +
        imgTag(photo.key, photo.alt, '(max-width: 860px) 92vw, 50vw', false) + '</div>';
    }
    if (d) {
      shot += '<span class="inf-dim inf-dim--w" aria-hidden="true"><i></i><b>' + esc(fillCopy(D.value, { v: d.width })) + '</b></span>' +
              '<span class="inf-dim inf-dim--h" aria-hidden="true"><i></i><b>' + esc(fillCopy(D.value, { v: d.height })) + '</b></span>';
    }
    /* `--arn` (largura ÷ altura do corpo) mora na figura: a foto, as cotas
       e a luz do estúdio saem da mesma conta de largura. */
    return '<figure class="inf-stage' + (d ? ' has-dims' : '') + '" style="--arn:' + arn + '">' +
      '<div class="bf-stage inf-studio" aria-hidden="true">' +
        '<i class="bf-stage__key"></i><i class="bf-stage__rim"></i><i class="bf-stage__floor"></i>' +
      '</div>' +
      '<div class="inf-shot">' + shot + '</div>' + cap +
    '</figure>';
  }

  /* A nota do modelo (a banda "Recursos da …"): na coluna do texto, logo
     abaixo do cabeçalho — o mesmo lugar nos quatro modelos. Sem nota (a
     8SW+, cuja banda de INFO é o próprio texto dos anéis), nada. */
  function infoNote(note) {
    if (!note) return '';
    return '<div class="inf-note">' +
      (note.title ? '<p class="inf-note__title">' + esc(note.title) + '</p>' : '') +
      '<p class="inf-note__body">' + esc(note.body) + '</p>' +
    '</div>';
  }

  /* O "Comprar" do próximo passo, com o rótulo honesto: modelo SEM loja
     (o botão do SHOP sai desabilitado, `primary.href` '#') não promete
     compra — o botão diz "Grupo de espera" (`buy.waitKicker`, o mesmo nome
     do bloco do WhatsApp que ele abre) e continua levando ao SHOP. */
  function nextComprar(m, N) {
    var p = (m.buy && m.buy.primary) || (C.buy && C.buy.primary);
    var noStore = !p || !p.href || p.href === '#';
    if (!N.comprar || !noStore || !C.buy || !C.buy.waitKicker) return N.comprar;
    return { label: C.buy.waitKicker, view: N.comprar.view };
  }

  /* O fecho do painel: o cartão de PRÓXIMO PASSO (`.pg-next` de
     css/pages.css), com o secundário (ver as conexões) antes do primário
     (comprar). Os textos são de `ui.next` no content.js; sem ele (merge
     fora de ordem), o cartão não é desenhado. `data-go` navega dentro do
     site; o `href` é o mesmo destino para abrir em outra aba. */
  function infoNext(m) {
    var N = C.ui && C.ui.next;
    if (!N) return '';
    function link(o, cls) {
      if (!o || !o.label || !o.view) return '';
      return '<a class="' + cls + '" href="#' + esc(m.hash) + '/' + esc(o.view) + '" data-go="view:' + esc(o.view) + '">' + esc(o.label) + '</a>';
    }
    var actions = link(N.conects, 'pg-ghost') + link(nextComprar(m, N), 'pg-cta');
    if (!actions) return '';
    return '<aside class="pg-card pg-next inf-next"' + (N.kicker ? ' aria-labelledby="inf-next-title"' : '') + '>' +
      (N.kicker ? '<p class="pg-kicker" id="inf-next-title">' + esc(N.kicker) + '</p>' : '') +
      '<div class="pg-next__actions">' + actions + '</div>' +
    '</aside>';
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
    /* Foto mais que duas vezes mais larga que alta (a 6SW+): a coluna da
       foto fica maior; a ordem das peças é a mesma dos outros modelos. */
    var wide = !!(g && (g.w * (1 - (g.body[0] + g.body[2]) / 100)) / (g.h * (1 - (g.body[1] + g.body[3]) / 100)) > 2);
    /* A banda de INFO da 8SW+ É o texto dos anéis de LED, que já tem o
       cartão próprio; nos outros modelos ela é a nota "Recursos da …". */
    var note = band && band.body && band.body !== (C.infoCards.leds || {}).description ? band : null;
    var d = m.dimensions;
    /* O lead diz o que diferencia o modelo: quantos pés, a tela e o corpo
       ({n}, {tela}, {w} × {h} — a tela é o número do cartão de tela). */
    var screen = m.specs && m.specs[INFO_SPEC_KEYS.indexOf('screen')];
    var lead = fillCopy(d ? H.lead : H.leadNoDims, {
      w: d && d.width, h: d && d.height, model: m.id, n: m.switches, tela: screen && screen.value
    });
    /* `.pg` é o container da consulta; a grade mora num filho porque um
       container não responde à própria @container. */
    return '<div class="panel-inner pg inf inf--' + esc(m.hash) + (wide ? ' inf--wide' : '') + (note ? ' has-note' : '') + '"><div class="inf-grid">' +
      '<div class="inf-head">' + pgHead({ kicker: eyebrowOf('info'), model: m.id, title: H.title, hot: H.hot, lead: lead }) + '</div>' +
      dimensionedInfoMedia(m, photo) +
      infoNote(note) +
      specStrip(m, photo) +
      ledBand(m) +
      infoNext(m) +
    '</div></div>';
  }

  /* ------------------------------------------------- CONEXÕES (IN/OUT) ----
     Duas peças, na ordem de leitura em qualquer largura: o cabeçalho com a
     foto traseira num palco iluminado (css/conects.css, `.cx-hero`) e o
     PAINEL DE CONEXÕES (`.cx-rack`), uma placa grafite com as portas
     agrupadas por família, cada família sob uma etiqueta de serigrafia com
     o anel de LED dela. Todo texto vem de content.js (banda `conects` e
     `C.ports`), e o painel fecha com o cartão de próximo passo (`C.ui.next`). */

  /* Família de cada porta: a cor do anel de LED e o ícone da etiqueta do
     grupo. Apresentação, não copy — por isso mora aqui. A cor é o código de
     ASSUNTO do site inteiro (os --led-* de css/tokens.css): o anel do USB
     aqui é o mesmo dos Apps e dos Downloads. Porta sem família conhecida sai
     com anel branco e sem ícone. */
  var CX_FAMILY = {
    din5: 'midi', trs: 'midi', usbDevice: 'usb', usbHost: 'usb',
    bluetooth: 'air', wifi: 'air', dualSw: 'in', exp: 'in'
  };
  var CX_LED = { midi: 'var(--led-midi)', usb: 'var(--led-usb)', air: 'var(--led-wireless)', in: 'var(--led-input)' };
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

  /* A miniatura de cada porta é o CONECTOR recortado da arte (content.js,
     `ports.*.img`), sem moldura e sem legenda. Bluetooth e Wi-Fi não têm
     conector para mostrar: no lugar da foto entra um glifo de traço, na
     tinta neutra do texto, desenhado aqui. A chave é a da porta.
     As duas ENTRADAS também são glifos: o conector delas é o mesmo P10 da
     saída TRS, e três plugues iguais no painel não diziam qual é qual. O
     que as distingue é o que se liga nelas, redesenhado a partir do
     pictograma da arte de 18/09: dois footswitches que descem num cabo
     só (Dual Switch) e o pedal de expressão de perfil (Expressão). */
  var CX_GLYPH = {
    bluetooth: '<path d="M7.2 7.6 16.8 16.6 12 21V3l4.8 4.4-9.6 9"/>',
    wifi: '<path d="M2.8 9.3a13.2 13.2 0 0 1 18.4 0"/><path d="M5.9 12.6a8.8 8.8 0 0 1 12.2 0"/><path d="M9 15.8a4.4 4.4 0 0 1 6 0"/>' +
          '<circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none"/>',
    dualSw: '<path d="M5.2 11V6.4a1.3 1.3 0 0 1 2.6 0V11"/><rect x="2.6" y="11" width="7.8" height="4.2" rx="1.4"/>' +
            '<path d="M16.2 11V6.4a1.3 1.3 0 0 1 2.6 0V11"/><rect x="13.6" y="11" width="7.8" height="4.2" rx="1.4"/>' +
            '<path d="M6.5 15.2v2.3a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5v-2.3M12 19v2.4"/>',
    exp: '<path d="M2.6 15.8h18.8v2.4a1.3 1.3 0 0 1-1.3 1.3H3.9a1.3 1.3 0 0 1-1.3-1.3z"/>' +
         '<path d="M19.9 15 4.2 8.1l1-2.3 15.8 6.9z"/>'
  };
  function cxPortArt(k, p) {
    if (CX_GLYPH[k]) {
      return '<svg class="cx-port__glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + CX_GLYPH[k] + '</svg>';
    }
    return p.img ? '<img src="assets/' + esc(p.img) + '.webp" width="240" height="240" alt="" loading="lazy" decoding="async">' : '';
  }

  /* As etiquetas do chassi descem em duas fileiras, como as chamadas de um
     desenho técnico, e a fileira de cada uma é decidida AQUI, na pior
     largura: a foto de 288px do celular de 320, com a etiqueta no tamanho do
     celular (11px, ~7,3px por letra + 14px de respiro). Duas regras: vizinhas
     na mesma fileira ficam a 8px uma da outra, e o fio de uma etiqueta de
     baixo não atravessa uma de cima. Das combinações possíveis fica a que
     cumpre as duas e mais se parece com a alternância simples; o que ainda
     faltar vira um empurrão lateral da etiqueta (`--dx`, em px do celular),
     sempre com o fio dentro dela. Em tela maior a foto cresce mais que a
     etiqueta, e a folga só aumenta. Os `silk` medidos no content.js não mudam. */
  var CX_SILK = { photo: 288, pad: 14, ch: 7.3, gap: 8, wire: 3, keep: 6 };
  function cxSilkLayout(silk) {
    var P = CX_SILK, n = silk.length, best = null, it, rows, pass, i, j;
    it = silk.map(function (s, k) {
      return { k: k, x: Number(s[1]) * P.photo / 100, w: P.pad + String(s[0]).length * P.ch, dx: 0, row: k % 2 };
    }).sort(function (a, b) { return a.x - b.x; });
    function clash(r) {
      var over = 0;
      for (var a = 0; a < n; a++) for (var b = a + 1; b < n; b++) {
        var A = it[a], B = it[b], d = B.x - A.x;
        if (r[a] === r[b]) over += Math.max(0, (A.w + B.w) / 2 + P.gap - d);
        else over += Math.max(0, (r[a] ? B.w : A.w) / 2 + P.wire - d);
      }
      return over;
    }
    for (var mask = 0; mask < (1 << n); mask++) {
      rows = it.map(function (t, a) { return (mask >> a) & 1; });
      var alt = rows.filter(function (r, a) { return r !== it[a].k % 2; }).length;
      var cost = clash(rows) * 100 + alt;
      if (!best || cost < best.cost) best = { cost: cost, rows: rows };
    }
    it.forEach(function (t, a) { t.row = best.rows[a]; });
    function nudge(t, v) { var lim = t.w / 2 - P.keep; t.dx = Math.max(-lim, Math.min(lim, t.dx + v)); }
    for (pass = 0; pass < 4; pass++) {
      for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {
        var A = it[i], B = it[j], d = (B.x + B.dx) - (A.x + A.dx), need;
        if (A.row === B.row) {
          need = (A.w + B.w) / 2 + P.gap - d;
          if (need > 0) { nudge(A, -need / 2); nudge(B, need / 2); }
        } else {
          var top = A.row ? B : A, low = A.row ? A : B, gap = Math.abs(low.x - (top.x + top.dx));
          need = top.w / 2 + P.wire - gap;
          if (need > 0) nudge(top, low.x > top.x + top.dx ? -need : need);
        }
      }
    }
    return it.sort(function (a, b) { return a.k - b.k; }).map(function (t) {
      return { row: t.row, dx: Math.round(t.dx * 2) / 2 };
    });
  }

  /* O palco com a foto traseira. A caixa da foto tem a proporção EXATA do
     arquivo (`size` da banda), e é por isso que as etiquetas do chassi
     (`silk`, posição em % da largura da foto) caem em cima de cada conector
     em qualquer largura. As etiquetas descem em duas alturas (cxSilkLayout):
     conectores vizinhos da 6SW+ ficam a 6% um do outro, e numa linha só as
     etiquetas se encostariam. São decorativas — o alt da foto já lista os
     mesmos nomes. Sem banda (ou banda sem foto), entra a foto principal do
     modelo; sem foto, o mapa. */
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
          (silk.length ? '<div class="cx-silk" aria-hidden="true">' + (function (lay) {
            return silk.map(function (s, i) {
              return '<span class="cx-silk__tag' + (lay[i].row ? ' is-low' : '') + '" style="--x:' + Number(s[1]) + '%' +
                (lay[i].dx ? ';--dx:' + lay[i].dx : '') + '"><b class="pg-tag">' + esc(s[0]) + '</b></span>';
            }).join('');
          })(cxSilkLayout(silk)) + '</div>' : '') +
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
     dividem a placa na proporção das portas, e todas saem da mesma largura.
     Grupo com uma porta só usa o nome no singular (`groupOne`), quando a
     porta o tiver: nos modelos sem DIN5, "Saídas MIDI" vira "Saída MIDI". */
  function portGrid(m, band) {
    var keys = (m.ports || []).filter(function (k) { return C.ports && C.ports[k]; });
    if (!keys.length) return '';
    var alias = (band && band.portTags) || {};
    var groups = [], byName = {};
    keys.forEach(function (k) {
      var g = C.ports[k].group || '';
      if (!Object.prototype.hasOwnProperty.call(byName, g)) { byName[g] = { label: g, one: C.ports[k].groupOne || '', keys: [] }; groups.push(byName[g]); }
      byName[g].keys.push(k);
    });
    return '<div class="cx-rack" style="--n:' + keys.length + ';--g:' + groups.length + '">' + groups.map(function (g) {
      var fam = CX_FAMILY[g.keys[0]];
      var led = CX_LED[fam] || '#ffffff';
      var label = g.keys.length === 1 && g.one ? g.one : g.label;
      return '<div class="cx-group" style="--c:' + led + ';--k:' + g.keys.length + '">' +
        (label ? '<h3 class="cx-group__head">' + ledRing(led, cxIcon(fam)) + '<span class="cx-group__name pg-label">' + esc(label) + '</span></h3>' : '') +
        '<ul class="cx-ports">' + g.keys.map(function (k) {
          var p = C.ports[k];
          var tag = alias[k] || p.tag || '';
          return '<li class="cx-port"><div class="cx-port__in">' +
            '<span class="cx-port__art">' + cxPortArt(k, p) + '</span>' +
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
      cxNext(m) +
    '</div>';
  }

  /* O fim do painel: o próximo passo (css/pages.css, `.pg-next`) — baixar o
     editor (secundário) e comprar (primário, por último). Os rótulos vêm de
     `C.ui.next`, a chave da navegação; sem ela, ou sem um dos dois destinos,
     o cartão simplesmente não sai. Os links trocam de painel sem sair da
     página (`data-go`), e o href é o mesmo link direto do hash. */
  function cxNext(m) {
    var N = C.ui && C.ui.next;
    if (!N || !N.apps || !N.comprar) return '';
    function go(o, cls) {
      return '<a class="' + cls + '" href="#' + esc(m.hash) + '/' + esc(o.view) + '" data-go="view:' + esc(o.view) + '">' + esc(o.label) + '</a>';
    }
    return '<aside class="pg-card pg-next cx-next"' + (N.kicker ? ' aria-labelledby="cx-next-kicker"' : '') + '>' +
      (N.kicker ? '<p class="pg-kicker" id="cx-next-kicker">' + esc(N.kicker) + '</p>' : '') +
      '<div class="pg-next__actions">' + go(N.apps, 'pg-ghost') + go(nextComprar(m, N), 'pg-cta') + '</div>' +
    '</aside>';
  }

  /* ---------------------------------------------------- painel SHOP ----
     Mesma linguagem de INFO e IN/OUT (css/pages.css + css/shop.css):
     cabeçalho pgHead com a etiqueta branca do modelo, a foto num palco
     com luz (feixe âmbar de cima, contraluz azul, sombra de contato), a
     ficha em números (.pg-readout + .pg-label, como no INFO), as
     etiquetas de porta do chassi e o cartão de compra com o WhatsApp do
     grupo de espera no mesmo acabamento.

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
              /* "Loja online da BFFX · loja.bffx.com.br": o ponto separa os
                 dois nomes à vista; para o leitor de tela sobra o espaço. */
              (host ? '<p class="shop-dest">' + shopSvg('lock', 'shop-dest__ico') +
                '<span>' + esc(C.buy.storeNote) + ' <span class="shop-dest__host">' +
                '<span class="shop-dest__sep" aria-hidden="true">·</span> <b>' + esc(host) + '</b></span></span></p>' : '');
      }
    }

    var wait = b.waitlist
      ? '<p class="shop-sep" aria-hidden="true"><span>' + esc(C.buy.waitKicker) + '</span></p>' +
        '<a class="shop-wa" href="' + esc(b.waitlist.href) + '" target="_blank" rel="noopener noreferrer">' +
          ledRing('var(--led-whatsapp)', shopSvg('wa', 'pg-ring__ico')) +
          '<span class="shop-wa__txt"><strong>' + esc(b.waitlist.label) + '</strong>' +
            '<span>' + esc(b.waitlist.text) + '</span></span>' +
          shopSvg('out', 'shop-wa__go') +
          '<span class="sr-only"> (' + esc(C.buy.newTab) + ')</span>' +
        '</a>'
      : '';

    var details = b.hideDetails ? '' :
      '<div class="shop-details"><p class="shop-price">' + esc(b.price) + '</p>' + listTag(b.list) + '</div>';

    /* A ficha: os mesmos quatro números do painel INFO, sem as notas, na
       mesma leitura de instrumento (.pg-readout) e com o rótulo neutro
       de cartão (.pg-label). */
    var facts = (m.specs && m.specs.length)
      ? '<dl class="shop-facts">' + m.specs.map(function (s) {
          return '<div class="shop-fact"><dt class="pg-label">' + esc(s.label) + '</dt><dd class="pg-readout">' + esc(s.value) + '</dd></div>';
        }).join('') + '</dl>'
      : '';

    /* Conexões: etiqueta curta à vista (serigrafia), descrição longa de
       `ports` para o leitor de tela. Chave desconhecida é pulada. Um
       chassi que imprime outro nome (a 6SW+ chama o dual switch de SW1/2)
       declara isso no `portTags` da banda de conexões, e o SHOP usa o
       mesmo nome da foto e do IN/OUT. */
    var keys = (m.ports || []).filter(function (k) { return C.ports && C.ports[k]; });
    var tags = C.buy.portTags || {};
    var alias = (bandFor(m, 'conects') || {}).portTags || {};
    var ports = keys.length
      ? '<div class="shop-ports"><p class="pg-label shop-label" id="shop-ports-label">' + esc(eyebrowOf('conects')) + '</p>' +
          '<ul class="pg-tags" aria-labelledby="shop-ports-label">' + keys.map(function (k) {
            return '<li><span aria-hidden="true">' + esc(alias[k] || tags[k] || C.ports[k].label) + '</span>' +
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
      /* O micro-rótulo leva a etiqueta do modelo, como INFO e IN/OUT: as
         três abas do modelo abrem com a mesma gramática. */
      pgHead({
        kicker: eyebrowOf('comprar'),
        model: m.id,
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
    manual: '<path d="M12 5C8 2 5 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-3-1-6-2-10 1Zm0 0v16"/>',
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
  /* A cor do anel de cada cartão é o ASSUNTO dele (tabela em css/tokens.css):
     o editor é MIDI, o atualizador e a lista de downloads são USB (firmware
     pelo cabo), o manual é documentação e o Backup View lê presets. A cor
     mora só no anel e no brilho de canto; rótulo e botão ficam neutros. */
  var DL_COLORS = {
    apps: 'var(--led-midi)', central: 'var(--led-midi)',
    updater: 'var(--led-usb)', downloads: 'var(--led-usb)',
    manual: 'var(--led-doc)', backup: 'var(--led-presets)'
  };

  function dlCard(o, D) {
    var ext = !o.go;
    var color = DL_COLORS[o.k] || 'var(--led-usb)';
    return '<li class="dl-card pg-card" style="--c:' + esc(color) + '">' +
      '<div class="dl-card__top">' +
        ledRing(color, '<svg class="pg-ring__ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (DL_ICONS[o.k] || DL_ICONS.downloads) + '</svg>') +
        '<p class="dl-card__k pg-label">' + esc(o.kicker || '') + '</p>' +
      '</div>' +
      '<h3 class="dl-card__t">' + esc(o.title) + '</h3>' +
      '<p class="dl-card__p">' + esc(o.text) + '</p>' +
      '<div class="dl-card__foot">' +
        '<a class="dl-card__go pg-ghost" href="' + esc(o.href) + '"' +
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
      pgHead({ id: item.key + '-title', kicker: item.eyebrow, title: head.title, hot: head.hot, lead: item.lead }) +
      '<ul class="dl-grid" role="list">' + cards.map(function (o) { return dlCard(o, D); }).join('') + '</ul>' +
    '</div></div>';
  }

  var RENDER = { info: renderInfo, conects: renderConects, comprar: renderComprar };

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


  /* O modelo é preservado ao consultar Apps, Downloads ou Manual. Nessas três
     vistas ("recursos") a barra de baixo troca de conteúdo: [o modelo] APPS ·
     DOWNLOADS · MANUAL, e a pílula do modelo devolve à HOME dele. A
     engrenagem e o DOWNLOADS do celular levam SEMPRE ao Downloads (antes
     reabriam o último recurso visitado: quem passava pelo Manual apertava
     "Downloads" e caía no Manual). */
  var curModel = -1, curView = '';
  var modelNav = $('#model-navigation');
  var resourceNav = $('#resource-navigation');
  var resourceTrack = $('#resource-track');
  var resourceHome = $('#resource-home');
  var overview = $('#overview-link');
  function resourceView(view) { return RES.some(function (item) { return item.key === view; }); }
  function isView(view) { return SUB.concat(RES).some(function (item) { return item.key === view; }); }
  function viewIndex(view) { return SUB.findIndex(function (item) { return item.key === view; }); }

  function apply(mi, view) {
    mi = Number.isFinite(mi) ? Math.max(0, Math.min(MODELS.length - 1, Math.trunc(mi))) : 0;
    if (view !== 'home' && !isView(view)) view = 'home';
    if (mi === curModel && view === curView) return;
    var first = curView === '', m = MODELS[mi], resources = resourceView(view), appView = view === 'apps', special = resources;
    curModel = mi;
    curView = view;
    var helpDialog = $('#ajuda-dialog');
    if (view !== 'apps' && helpDialog && helpDialog.open) helpDialog.close();
    var active = appView ? MODELS.length : view === 'downloads' ? MODELS.length + 1 : resources ? -1 : mi;
    /* Em Apps e Downloads quem acende é a tecla (APP ou engrenagem), com o
       anel laranja dela; o leito apaga ONDE ESTÁ (no modelo) em vez de
       escorregar para trás da tecla, e reacende ali na volta. No Manual
       nenhuma tecla da cápsula fica apertada: quem diz onde se está é a
       pílula MANUAL da barra de recursos (a engrenagem se chama
       "Downloads" e levaria ao Downloads). */
    selector.style.setProperty('--i', special ? mi : active);
    selector.classList.toggle('is-util', special);
    markTabs(track, 'aria-pressed', active);
    /* Tab itinerante só entre os MODELOS (a parada é o modelo atual); APP e
       engrenagem são paradas próprias, sempre alcançáveis pelo Tab. */
    track.querySelectorAll('.tab').forEach(function (tab, i) { tab.tabIndex = i < MODELS.length ? (i === mi ? 0 : -1) : 0; });
    var mobileApps = $('#mobile-apps-toggle');
    var mobileResources = $('#mobile-resources-toggle');
    var mobileUtility = $('#mobile-utility-navigation');
    if (mobileUtility) mobileUtility.hidden = view !== 'home';
    document.documentElement.setAttribute('data-view', view === 'home' ? 'home' : 'panel');
    if (mobileApps) mobileApps.setAttribute('aria-pressed', String(appView));
    if (mobileResources) mobileResources.setAttribute('aria-pressed', String(view === 'downloads'));
    modelNav.hidden = special;
    resourceNav.hidden = !special;
    if (resourceHome) {
      var homeName = C.ui.overview + ' · ' + m.id;
      resourceHome.setAttribute('aria-label', homeName);
      resourceHome.title = homeName;
      resourceHome.lastChild.textContent = m.tab;
    }
    var vi = viewIndex(view);
    subSel.classList.toggle('is-idle', vi < 0);
    if (vi >= 0) subSel.style.setProperty('--i', vi);
    markTabs(subTrack, 'aria-selected', vi);
    var ri = RES.findIndex(function (item) { return item.key === view; });
    markTabs(resourceTrack, 'aria-selected', ri);
    /* A barra de recursos segue a mesma regra da do modelo: a pílula do
       modelo entra no ciclo das setas e o Tab para só na vista aberta. */
    resourceNav.querySelectorAll('button').forEach(function (tab, i) { tab.tabIndex = i === ri + 1 ? 0 : -1; });
    /* Tab itinerante na barra do modelo; na HOME o INFO também é parada
       (padrão de abas da APG: o tablist tem sempre uma aba no Tab). */
    modelNav.querySelectorAll('button').forEach(function (tab, i) { tab.tabIndex = (i === vi + 1 || (vi < 0 && i === 1)) ? 0 : -1; });
    overview.classList.toggle('is-active', view === 'home');
    if (view === 'home') overview.setAttribute('aria-current', 'page');
    else overview.removeAttribute('aria-current');
    /* O h1 mora fora dos painéis e acompanha a vista: o mesmo texto do
       document.title, sem o " | BFFX". */
    heroH1b.textContent = special ? eyebrowOf(view) + ' — BFMIDI'
      : view === 'home' ? m.id : m.id + ' · ' + eyebrowOf(view);
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
    /* Toda troca de vista começa do topo: sem isto, quem estava no fim do
       INFO abria o SHOP rolado pela metade, e a HOME abria descida. O foco
       não se mexe (quem clicou continua no botão que clicou). */
    if (!first) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.title = (special ? eyebrowOf(view) + ' — BFMIDI'
      : view === 'home' ? m.id + ' — Controladoras MIDI de palco'
      : m.id + ' · ' + eyebrowOf(view)) + ' | BFFX';
    if (!first && window.history && history.replaceState) history.replaceState(null, '', '#' + m.hash + (view === 'home' ? '' : '/' + view));
    if (!first && live) live.textContent = special ? eyebrowOf(view) : m.id + (view === 'home' ? ' selecionado.' : ' · ' + eyebrowOf(view));
  }

  document.addEventListener('click', function (event) {
    var control = event.target.closest('[data-go]');
    if (!control) return;
    /* Link com modificador (Cmd/Ctrl/Shift/Alt) é do navegador: abre a
       aba ou a janela nova no href, que já é a rota certa (o fromHash a
       resolve lá). Só o clique simples troca a vista aqui. */
    if (control.tagName === 'A' && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
    event.preventDefault();
    var go = control.getAttribute('data-go');
    var prev = curView;
    if (go === 'resources') apply(curModel, 'downloads');
    else if (go === 'home') apply(curModel, 'home');
    else if (go.indexOf('model:') === 0) apply(Number(go.slice(6)), 'home');
    else if (go.indexOf('view:') === 0) apply(curModel, go.slice(5));
    /* O controle acionado pode ter sumido junto com a vista (link dentro de
       um painel que virou inert, a barra de baixo que trocou): o foco caía
       no <body> e o Tab seguinte recomeçava do lugar antigo, pulando o
       painel novo. Ele vai para o mesmo alvo do "Pular" (o título da vista)
       ou, na volta à HOME, para o modelo na cápsula — o destino do Esc. */
    if (prev === curView) return;
    var lost = !control.isConnected || control.closest('.panel:not(.is-on), [hidden], [inert]') || !control.getClientRects().length;
    if (!lost && document.activeElement !== document.body) return;
    if (curView === 'home') { (resourceView(prev) ? track.querySelector('[data-i="' + curModel + '"]') : overview).focus(); return; }
    var title = document.querySelector('.panel.is-on .pg-title, .panel.is-on .ap-title');
    if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }); }
  });

  /* Setas, Home e End percorrem cada nível sem perder o foco. */
  function wireKeys(container, getIndex, select) {
    container.addEventListener('keydown', function (event) {
      var buttons = Array.from(container.querySelectorAll('button'));
      /* A posição é a do botão FOCADO, e a vista aberta só entra quando o
         foco não está num deles: na HOME o INFO também é parada do Tab, e
         contar pela vista (⌂) levava a ← ao SHOP e a → ao próprio INFO. */
      var current = buttons.indexOf(document.activeElement), next;
      if (current < 0) current = getIndex();
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
  /* A cápsula de MODELOS é diferente: trocar de modelo reescreve a página
     inteira, então as setas (e Home/End) só MOVEM O FOCO entre os modelos
     visíveis, e quem ativa é o Enter/Espaço, pelo clique nativo do botão.
     APP e engrenagem ficam fora das setas: são paradas próprias do Tab. */
  selector.addEventListener('keydown', function (event) {
    var buttons = Array.prototype.filter.call(track.querySelectorAll('[data-go^="model:"]'), function (b) { return b.offsetParent !== null; });
    var current = buttons.indexOf(document.activeElement), next;
    if (current < 0) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % buttons.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current + buttons.length - 1) % buttons.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buttons.length - 1;
    else return;
    event.preventDefault();
    buttons.forEach(function (b, i) { b.tabIndex = i === next ? 0 : -1; });
    buttons[next].focus();
  });
  wireKeys(modelNav, function () { return viewIndex(curView) + 1; }, function (i) { apply(curModel, i === 0 ? 'home' : SUB[i - 1].key); });
  /* A barra de recursos ganha o MESMO teclado da do modelo: a pílula do
     modelo é a primeira parada das setas, como o ⌂ lá. Chegar nela leva à
     HOME, e a barra some junto — o foco vai para o modelo na cápsula (o
     destino do Esc), em vez de cair no <body>. */
  wireKeys(resourceNav, function () { return RES.findIndex(function (item) { return item.key === curView; }) + 1; }, function (i) {
    apply(curModel, i === 0 ? 'home' : RES[i - 1].key);
    if (i === 0) track.querySelector('[data-i="' + curModel + '"]').focus();
  });

  /* "Pular para o conteúdo": leva o foco ao título da vista aberta, SEM
     trocar o hash — o #panels caía no hashchange e devolvia a HOME da 8SW+
     a quem estava, por exemplo, no SHOP da NANO+. */
  var skip = $('.skip-link');
  if (skip) skip.addEventListener('click', function (event) {
    event.preventDefault();
    var target = document.querySelector('.panel.is-on .pg-title, .panel.is-on .ap-title, .panel.is-on h1, .panel.is-on h2') || $('#panels');
    if (target.id !== 'panels') target.tabIndex = -1;
    target.focus();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || curView === 'home' || document.querySelector('dialog[open]')) return;
    var wasResource = resourceView(curView);
    apply(curModel, 'home');
    if (wasResource) track.querySelector('[data-i="' + curModel + '"]').focus();
    else overview.focus();
  });
  /* Hash sem modelo conhecido (o #panels do "Pular", um âncora qualquer)
     devolve null e é ignorado; hash vazio é a HOME do primeiro modelo. O
     antigo #<modelo>/software (painel que saiu) abre os Apps. */
  function fromHash() {
    var parts = (location.hash || '').slice(1).toLowerCase().split('/');
    if (!parts[0]) return { model: 0, view: 'home' };
    var model = MODELS.findIndex(function (m) { return m.hash === parts[0]; });
    if (model < 0) return null;
    if (parts[1] === 'software') parts[1] = 'apps';
    return { model: model, view: isView(parts[1]) ? parts[1] : 'home' };
  }
  window.addEventListener('hashchange', function () { var state = fromHash(); if (state) apply(state.model, state.view); });

  /* A rolagem é nossa: o navegador não restaura a posição de uma vista na
     outra (ver o scrollTo do apply). */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  document.querySelectorAll('[data-copy]').forEach(function (el) { var copy = C.ui && C.ui[el.getAttribute('data-copy')]; if (copy) el.textContent = copy; });
  var appsItem = RES.find(function (item) { return item.key === 'apps'; }) || {};
  fillTrack(track, MODELS, 'tab', 'aria-pressed');
  /* O nome acessível da tecla COMEÇA pelo rótulo visível ("APP" → "App"),
     para quem a aciona por voz dizendo o que lê (WCAG 2.5.3); a dica do
     mouse continua com o nome da vista, "Apps". */
  var appsAria = C.ui.appsShort.charAt(0) + C.ui.appsShort.slice(1).toLowerCase();
  track.insertAdjacentHTML('beforeend', '<button class="tab software-tab apps-tab" id="software-toggle" type="button" data-i="' + MODELS.length + '" data-go="view:apps" aria-label="' + esc(appsAria) + '" title="' + esc(appsItem.label) + '" aria-pressed="false" aria-controls="panel-apps">' + icon('apps') + '<span class="apps-tab__label">' + esc(C.ui.appsShort) + '</span></button>');
  track.insertAdjacentHTML('beforeend', '<button class="tab gear-tab" id="resources-toggle" type="button" data-i="' + (MODELS.length + 1) + '" data-go="resources" aria-label="' + esc(C.resources.label) + '" title="' + esc(C.resources.label) + '" aria-pressed="false">' + icon('gear') + '</button>');
  selector.style.setProperty('--n', MODELS.length + 2);
  fillTrack(subTrack, SUB, 'label', 'aria-selected');
  subSel.style.setProperty('--n', SUB.length);
  fillTrack(resourceTrack, RES, 'label', 'aria-selected');
  $('#resource-selector').style.setProperty('--n', RES.length);
  overview.innerHTML = icon('home') + '<span>' + esc(C.ui.overview) + '</span>';
  overview.title = C.ui.overview;
  if (resourceHome) resourceHome.innerHTML = icon('home') + '<span></span>';
  /* A barra APPS · DOWNLOADS do celular: os mesmos nomes da barra de baixo. */
  var mobileAppsLabel = $('#mobile-apps-label'), mobileResLabel = $('#mobile-resources-label');
  if (mobileAppsLabel) mobileAppsLabel.textContent = appsItem.label;
  if (mobileResLabel) mobileResLabel.textContent = C.resources.label;

  var start = fromHash() || { model: 0, view: 'home' };
  apply(start.model, start.view);
  /* O link antigo #<modelo>/software abre os Apps e já corrige o endereço. */
  if (/\/software$/i.test(location.hash) && history.replaceState) history.replaceState(null, '', '#' + MODELS[start.model].hash + '/apps');
})();
