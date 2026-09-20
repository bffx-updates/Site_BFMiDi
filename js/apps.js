/* A ajuda abre dentro da seção Apps e devolve o foco ao botão de origem. */
(function () {
  'use strict';
  var dialog = document.getElementById('ajuda-dialog');
  var open = document.getElementById('abrir-ajuda');
  if (!dialog || !open) return;
  open.addEventListener('click', function () { dialog.showModal(); });
  dialog.querySelector('.apps-close-help').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (event) {
    var rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', function () {
    if (document.getElementById('panel-apps').classList.contains('is-on')) open.focus();
  });
})();
