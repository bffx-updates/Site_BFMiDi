#!/usr/bin/env bash
# ============================================================================
#  SUBIR_SITE_GITHUB.sh — publica a VITRINE (este Site/, bffx.com.br) no repo
#  bffx-updates/Site_BFMiDi. Par Mac do SUBIR_SITE_GITHUB.bat, mesmo fluxo:
#    valida (node scripts/build.cjs) -> git add -A -> commit -> push HEAD:main
#  SEM push --force: se o GitHub tiver commits que nao estao aqui, o push falha
#  e nada e substituido (mesma regra do .bat).
#    ./SUBIR_SITE_GITHUB.sh              # valida, commita e envia
#    ./SUBIR_SITE_GITHUB.sh --verificar  # so valida, nao envia
#  Pegadinha: o working tree que chega do Windows pelo OneDrive vem em CRLF e o
#  repo esta em LF — `git diff --ignore-cr-at-eol --stat` mostra o que mudou
#  DE VERDADE antes de commitar.
# ============================================================================
set -u
cd "$(dirname "$0")" || exit 1
GITHUB_REPO="https://github.com/bffx-updates/Site_BFMiDi.git"
GITHUB_REMOTE="github"
GITHUB_BRANCH="main"

echo; echo " BFMIDI - publicar site no GitHub ($GITHUB_REPO)"; echo
command -v git  >/dev/null 2>&1 || { echo "ERRO: git nao encontrado."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "ERRO: node nao encontrado (necessario pra validar o site)."; exit 1; }
[ -f index.html ] || { echo "ERRO: index.html nao encontrado ao lado deste arquivo."; exit 1; }
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "ERRO: esta pasta nao e um repositorio Git."; exit 1; }

echo "  Validando o site..."
node scripts/build.cjs || { echo; echo "  A validacao encontrou um problema. Nada foi enviado."; exit 1; }
if [ "${1:-}" = "--verificar" ]; then echo; echo "  Verificacao concluida. Nenhum arquivo foi enviado."; exit 0; fi

echo "  Preparando as alteracoes..."
git add -A -- . || exit 1
if git diff --cached --quiet; then
  echo "  Nenhuma alteracao nova para salvar."
else
  git -c user.name="${GIT_AUTHOR_NAME:-$(git config user.name || echo 'BFFX')}" \
      -c user.email="${GIT_AUTHOR_EMAIL:-$(git config user.email || echo 'deploy@bffx.local')}" \
      commit -q -m "${BF_SITE_COMMIT_MSG:-Atualiza site BFMIDI}" || exit 1
fi
git remote get-url "$GITHUB_REMOTE" >/dev/null 2>&1 \
  && git remote set-url "$GITHUB_REMOTE" "$GITHUB_REPO" \
  || git remote add "$GITHUB_REMOTE" "$GITHUB_REPO"
echo "  Enviando para $GITHUB_REPO ..."
if ! git push -u "$GITHUB_REMOTE" HEAD:"$GITHUB_BRANCH"; then
  echo; echo "  O envio nao foi concluido. Se aparecer non-fast-forward, o GitHub tem commits"
  echo "  que nao estao aqui; o script nao substitui a forca."; exit 1
fi
echo; echo "  Site enviado: https://github.com/bffx-updates/Site_BFMiDi  ->  https://bffx.com.br"
exit 0
