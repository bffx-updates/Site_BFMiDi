/* Vitrine dos apps: dock de plataformas, recomendação pelo aparelho do
   visitante, barra da janela do notebook, ajuda em diálogo e o parallax do
   palco. Sem este arquivo a página continua inteira: as cinco plataformas
   ficam numa lista, cada uma com o seu botão, e a ajuda abre pelo
   `command="show-modal"` nos navegadores que já o entendem. */
(function () {
  'use strict';

  var page = document.getElementById('apps-page');
  if (!page) return;
  var panel = document.getElementById('panel-apps');
  var dialog = document.getElementById('ajuda-dialog');
  var mq = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false }; };
  var reduce = mq('(prefers-reduced-motion: reduce)');
  var narrow = mq('(max-width: 860px)');
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  /* ---- 1. Qual é o aparelho do visitante ---------------------------- */
  /* ?plataforma=web|windows|mac|ios|android força a escolha — serve para
     os links de suporte ("baixe aqui a versão de Windows"). */
  var ALIAS = {
    web: 'online', online: 'online', navegador: 'online',
    windows: 'windows', win: 'windows',
    mac: 'mac', macos: 'mac',
    ios: 'ios', iphone: 'ios', ipad: 'ios',
    android: 'android'
  };
  function forced() {
    var q = '';
    try { q = new URLSearchParams(window.location.search).get('plataforma') || ''; } catch (e) { q = ''; }
    return ALIAS[String(q).toLowerCase()] || '';
  }
  function detect() {
    var nav = window.navigator || {};
    var ua = String(nav.userAgent || '');
    var plat = String((nav.userAgentData && nav.userAgentData.platform) || nav.platform || '');
    if (/android/i.test(ua) || /android/i.test(plat)) return 'android';
    if (/iphone|ipad|ipod/i.test(ua) || /^(iphone|ipad|ipod)/i.test(plat)) return 'ios';
    /* O iPad com iPadOS se apresenta como Mac; quem entrega é o toque. */
    if (/mac/i.test(plat) || /macintosh|mac os x/i.test(ua)) return nav.maxTouchPoints > 1 ? 'ios' : 'mac';
    if (/win/i.test(plat) || /windows/i.test(ua)) return 'windows';
    return 'online';
  }
  /* Duas coisas diferentes: o aparelho do visitante (recebe o LED e o selo)
     e a aba que abre (o link de suporte pode pedir outra). Um Mac que abre
     ?plataforma=windows vê o cartão do Windows, mas o selo continua dizendo
     a verdade: fica na tecla do Mac. */
  var device = detect();
  var wanted = forced() || device;

  /* ---- 2. Dock de plataformas (abas) -------------------------------- */
  var dock = page.querySelector('.ap-dock');
  var plats = page.querySelector('.ap-plats');
  var keys = dock ? Array.prototype.slice.call(dock.querySelectorAll('.ap-key')) : [];

  function panelOf(key) { return document.getElementById(key.getAttribute('aria-controls')); }

  function select(key, moveFocus) {
    keys.forEach(function (k, i) {
      var on = k === key;
      var target = panelOf(k);
      k.setAttribute('aria-selected', on ? 'true' : 'false');
      k.tabIndex = on ? 0 : -1;
      if (target) target.hidden = !on;
      if (on) plats.style.setProperty('--i', String(i));
    });
    /* data-plat troca a barra da janela do notebook; data-focus decide
       qual aparelho recebe a luz do palco. */
    page.setAttribute('data-plat', key.getAttribute('data-plat') || 'none');
    page.setAttribute('data-focus', key.getAttribute('data-focus') || 'desk');
    if (moveFocus) key.focus();
  }

  /* No celular o cartão fica logo abaixo do dock; se o botão dele estiver
     fora da tela (ou sob o véu do rodapé), traz para a vista. A medida
     desconta o deslocamento da animação de entrada do cartão (ele nasce
     8px abaixo): com ou sem animação, o mesmo toque dá o mesmo resultado. */
  var VEIL = 150, TOP = 16;
  function shiftOf(el) {
    try {
      var t = window.getComputedStyle(el).transform;
      if (!t || t === 'none' || typeof window.DOMMatrixReadOnly !== 'function') return 0;
      return new window.DOMMatrixReadOnly(t).m42 || 0;
    } catch (e) { return 0; }
  }
  function reveal(key) {
    if (!narrow.matches) return;
    var target = panelOf(key);
    var act = target && target.querySelector('.ap-plat__act');
    if (!act || typeof act.getBoundingClientRect !== 'function') return;
    var r = act.getBoundingClientRect();
    var dy = shiftOf(target);
    var top = r.top - dy, bottom = r.bottom - dy;
    var vh = window.innerHeight || document.documentElement.clientHeight || 0;
    var by = 0;
    if (bottom > vh - VEIL) by = bottom - (vh - VEIL);
    if (top - by < 0) by = top - TOP;
    if (Math.abs(by) < 1) return;
    window.scrollBy({ top: by, behavior: reduce.matches ? 'auto' : 'smooth' });
  }

  if (dock && plats && keys.length) {
    keys.forEach(function (k) {
      var target = panelOf(k);
      if (!target) return;
      target.setAttribute('role', 'tabpanel');
      target.setAttribute('aria-labelledby', k.id);
      target.tabIndex = -1;
    });

    var byPlat = function (p) { return keys.filter(function (k) { return k.getAttribute('data-plat') === p; })[0]; };
    var mineKey = byPlat(device) || keys[0];
    var startKey = byPlat(wanted) || mineKey;
    var mine = mineKey.getAttribute('data-plat');
    /* Android: o app ainda não existe, então não é "recomendado" — é o
       aparelho do visitante, e o cartão mostra o caminho pelo pedal. */
    var label = mine === 'android' ? 'seu dispositivo' : 'recomendado para este dispositivo';
    mineKey.classList.add('is-rec');
    var sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = ' (' + label + ')';
    mineKey.appendChild(sr);
    var minePanel = panelOf(mineKey);
    var chip = minePanel && minePanel.querySelector('.ap-rec');
    if (chip) chip.hidden = false;

    page.classList.add('is-js');
    dock.hidden = false;
    select(startKey, false);

    dock.addEventListener('click', function (event) {
      var key = event.target.closest('.ap-key');
      if (!key) return;
      select(key, false);
      reveal(key);
    });
    dock.addEventListener('keydown', function (event) {
      var i = keys.indexOf(document.activeElement);
      if (i < 0) return;
      var next = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = keys[(i + 1) % keys.length];
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = keys[(i - 1 + keys.length) % keys.length];
      else if (event.key === 'Home') next = keys[0];
      else if (event.key === 'End') next = keys[keys.length - 1];
      if (!next) return;
      event.preventDefault();
      select(next, true);
    });
  }

  /* ---- 3. Ajuda ------------------------------------------------------ */
  if (dialog) {
    var body = dialog.querySelector('.apps-dialog-body');
    var lastTrigger = null;
    var openHelp = function (event) {
      /* O `command="show-modal"` já abre sem JS nos navegadores novos;
         aqui cancelamos o padrão para abrir UMA vez só, em qualquer um. */
      var btn = event ? event.currentTarget : null;
      if (event) event.preventDefault();
      if (dialog.open) return;
      lastTrigger = btn;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      /* Gatilho contextual ("Como instalar no Windows") abre na seção certa. */
      var id = btn && btn.getAttribute('data-help');
      var section = id ? document.getElementById(id) : null;
      if (body) body.scrollTop = section ? Math.max(0, section.offsetTop - 12) : 0;
    };
    each(page.querySelectorAll('#abrir-ajuda, .js-help'), function (btn) {
      btn.addEventListener('click', openHelp);
    });
    var closeBtn = dialog.querySelector('.apps-close-help');
    if (closeBtn) closeBtn.addEventListener('click', function (event) {
      event.preventDefault();
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    });
    /* Clique no fundo escuro (fora da caixa) fecha — o `closedby="any"`
       já faz isso nos navegadores novos; aqui fica a reserva. */
    dialog.addEventListener('click', function (event) {
      if (event.target !== dialog || !dialog.open) return;
      var r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
    dialog.addEventListener('close', function () {
      if (!panel || !panel.classList.contains('is-on')) return;
      var back = lastTrigger || document.getElementById('abrir-ajuda');
      lastTrigger = null;
      if (back && typeof back.focus === 'function') back.focus();
    });
  }

  /* ---- 4. "Como conectar ao pedal" ---------------------------------- */
  /* Leva à seção "Conecte do seu jeito" logo abaixo e põe o foco no título
     dela (sem trocar a hash: a hash é a rota do site). */
  each(page.querySelectorAll('.js-jump'), function (btn) {
    btn.addEventListener('click', function () {
      var head = document.getElementById(btn.getAttribute('data-jump') || '');
      if (!head) return;
      var section = head.closest('section') || head;
      if (!head.hasAttribute('tabindex')) head.setAttribute('tabindex', '-1');
      section.scrollIntoView({ block: 'start', behavior: reduce.matches ? 'auto' : 'smooth' });
      try { head.focus({ preventScroll: true }); } catch (e) { head.focus(); }
    });
  });

  /* ---- 5. Parallax do palco (só mouse, só transform) ----------------- */
  var hero = page.querySelector('.ap-hero');
  var stage = page.querySelector('.ap-stage');
  var fine = mq('(hover: hover) and (pointer: fine)');
  if (hero && stage && fine.matches) {
    var frame = 0, tx = 0, ty = 0;
    var paint = function () {
      frame = 0;
      stage.style.setProperty('--mx', tx.toFixed(3));
      stage.style.setProperty('--my', ty.toFixed(3));
    };
    var queue = function () { if (!frame) frame = window.requestAnimationFrame(paint); };
    hero.addEventListener('pointermove', function (event) {
      if (reduce.matches || event.pointerType !== 'mouse') return;
      var w = window.innerWidth || 1, h = window.innerHeight || 1;
      tx = Math.max(-1, Math.min(1, (event.clientX / w - 0.5) * 2));
      ty = Math.max(-1, Math.min(1, (event.clientY / h - 0.5) * 2));
      queue();
    });
    hero.addEventListener('pointerleave', function () { tx = 0; ty = 0; queue(); });
  }
})();
