@echo off
setlocal EnableExtensions DisableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"
title BFMIDI - Publicar site no GitHub

set "GITHUB_REPO=https://github.com/bffx-updates/Site_BFMiDi.git"
set "GITHUB_REMOTE=github"
set "GITHUB_BRANCH=main"

echo.
echo  ============================================================
echo    BFMIDI - publicar site no GitHub
echo  ============================================================
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo   ERRO: Git nao encontrado.
  echo   Instale o Git para Windows em https://git-scm.com/download/win
  goto :falha
)

if not exist "index.html" (
  echo   ERRO: index.html nao encontrado ao lado deste arquivo.
  goto :falha
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo   ERRO: esta pasta ainda nao e um repositorio Git.
  goto :falha
)

where node >nul 2>&1
if errorlevel 1 (
  echo   ERRO: Node.js nao encontrado. Ele e necessario para validar o site.
  goto :falha
)

echo   Validando o site...
node scripts\build.cjs
if errorlevel 1 (
  echo.
  echo   A validacao encontrou um problema. Nada foi enviado.
  goto :falha
)

if /I "%~1"=="--verificar" (
  echo.
  echo   Verificacao concluida. Nenhum arquivo foi enviado.
  exit /b 0
)

echo   Preparando as alteracoes...
git add -A -- .
if errorlevel 1 goto :erro_git

git diff --cached --quiet
if errorlevel 1 (
  git config user.name >nul 2>&1
  if errorlevel 1 (
    echo.
    echo   ERRO: configure seu nome antes do primeiro envio:
    echo   git config --global user.name "Seu nome"
    echo   git config --global user.email "seu-email@exemplo.com"
    goto :falha
  )
  git config user.email >nul 2>&1
  if errorlevel 1 (
    echo.
    echo   ERRO: configure seu e-mail antes do primeiro envio:
    echo   git config --global user.name "Seu nome"
    echo   git config --global user.email "seu-email@exemplo.com"
    goto :falha
  )

  git commit -m "Atualiza site BFMIDI"
  if errorlevel 1 goto :erro_git
) else (
  echo   Nenhuma alteracao nova para salvar.
)

git remote get-url "%GITHUB_REMOTE%" >nul 2>&1
if errorlevel 1 (
  git remote add "%GITHUB_REMOTE%" "%GITHUB_REPO%"
) else (
  git remote set-url "%GITHUB_REMOTE%" "%GITHUB_REPO%"
)
if errorlevel 1 goto :erro_git

echo   Enviando para %GITHUB_REPO% ...
echo   No primeiro uso, o GitHub pode pedir para voce entrar na sua conta.
git push -u "%GITHUB_REMOTE%" HEAD:"%GITHUB_BRANCH%"
if errorlevel 1 (
  echo.
  echo   O envio nao foi concluido.
  echo   Se aparecer "non-fast-forward", o repositorio no GitHub ja possui
  echo   arquivos diferentes. O script nao substitui esses arquivos a forca.
  goto :falha
)

echo.
echo   Site enviado com sucesso:
echo   https://github.com/bffx-updates/Site_BFMiDi
goto :sucesso

:erro_git
echo.
echo   O Git encontrou um problema. Nada foi substituido a forca.

:falha
echo.
pause
exit /b 1

:sucesso
echo.
pause
exit /b 0
