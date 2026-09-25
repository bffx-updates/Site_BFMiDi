#!/bin/bash
# Duplo-clique no Finder = abre o Terminal e roda ./SUBIR_SITE_GITHUB.sh
# (valida o site, commita e envia pro GitHub -> bffx.com.br).
# Deu certo: aparece uma notificacao e a janela fecha sozinha.
# Deu erro: a janela fica aberta com a mensagem.
# Pra so validar sem enviar, rode no Terminal: ./SUBIR_SITE_GITHUB.sh --verificar
cd "$(dirname "$0")" || exit 1
bash "./SUBIR_SITE_GITHUB.sh" "$@"; rc=$?
if [ "$rc" = "0" ]; then
  osascript -e 'display notification "bffx.com.br atualiza em 1 a 2 minutos." with title "Site BFMIDI enviado"' >/dev/null 2>&1
  # Fecha ESTA janela do Terminal (achada pela tty) logo depois que o shell sair
  # — depois, e nao antes, senao o Terminal pergunta "encerrar processo?".
  T="$(tty)"
  ( sleep 1; osascript -e 'on run argv' -e 'tell application "Terminal"' -e 'repeat with w in windows' -e 'repeat with t in tabs of w' -e 'if tty of t is item 1 of argv then close w' -e 'end repeat' -e 'end repeat' -e 'end tell' -e 'end run' "$T" ) >/dev/null 2>&1 &
  disown
fi
exit $rc
