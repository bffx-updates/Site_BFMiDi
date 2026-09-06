/* Poeira luminosa decorativa. Pausa fora de cena e respeita movimento reduzido. */
(function () {
  'use strict';
  var canvas = document.getElementById('particle-field');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var width = 0, height = 0, points = [], frame = 0, last = 0;

  /* Desfoque pré-renderizado: bordas suaves sem recalcular filtros por quadro. */
  var softDot = document.createElement('canvas');
  softDot.width = softDot.height = 96;
  var softCtx = softDot.getContext('2d');
  if (softCtx) {
    var glow = softCtx.createRadialGradient(48, 48, 0, 48, 48, 48);
    glow.addColorStop(0, 'rgba(155,191,239,.32)');
    glow.addColorStop(.2, 'rgba(145,184,236,.25)');
    glow.addColorStop(.45, 'rgba(132,174,230,.12)');
    glow.addColorStop(.75, 'rgba(122,163,223,.025)');
    glow.addColorStop(1, 'rgba(122,163,223,0)');
    softCtx.fillStyle = glow;
    softCtx.fillRect(0, 0, 96, 96);
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    var ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    var count = Math.min(100, Math.max(30, Math.round(width * height / 12000)));
    points = Array.from({ length: count }, function () {
      return { x: Math.random() * width, y: Math.random() * height,
        radius: .5 + Math.random() * 1.2, opacity: .15 + Math.random() * .4,
        dx: (Math.random() - .5) * 3, dy: -3 - Math.random() * 7 };
    });
    var softCount = Math.min(18, Math.max(8, Math.round(width * height / 70000)));
    if (softCtx) {
      var softPoints = Array.from({ length: softCount }, function () {
        return { x: Math.random() * width, y: Math.random() * height,
          radius: 14 + Math.random() * 22, opacity: .5 + Math.random() * .45,
          dx: (Math.random() - .5) * 5, dy: -4 - Math.random() * 6, soft: true };
      });
      points = softPoints.concat(points);
    }
    draw(0);
  }

  function draw(dt) {
    ctx.clearRect(0, 0, width, height);
    points.forEach(function (p) {
      p.x += p.dx * dt;
      p.y += p.dy * dt;
      if (p.x < -p.radius) p.x = width + p.radius;
      if (p.x > width + p.radius) p.x = -p.radius;
      if (p.y < -p.radius) p.y = height + p.radius;
      if (p.y > height + p.radius) p.y = -p.radius;
      if (p.soft) {
        ctx.globalAlpha = p.opacity;
        ctx.drawImage(softDot, p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
        ctx.globalAlpha = 1;
        return;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(133,176,234,' + p.opacity * .07 + ')';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(167,197,237,' + p.opacity + ')';
      ctx.fill();
    });
  }

  function tick(now) {
    if (now - last >= 1000 / 30) {
      draw(last ? Math.min((now - last) / 1000, .1) : 0);
      last = now;
    }
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    if (!document.hidden && !reduced.matches) frame = requestAnimationFrame(tick);
    else draw(0);
  }

  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  resize();
  sync();
})();
