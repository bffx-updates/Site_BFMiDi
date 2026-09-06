@echo off
setlocal enabledelayedexpansion
REM ===========================================================================
REM BFMIDI - Landing page (Site\) - SERVIDOR LOCAL
REM
REM Sobe a pasta deste bat em http://localhost e abre o navegador.
REM Nao compila e nao publica nada: e helper de bancada, irmao do
REM production\servidor_local.bat. Ctrl+C para parar.
REM
REM POR QUE SERVIDOR, E NAO DOIS CLIQUES NO index.html
REM   Por file:// a pagina ate abre, mas voce nao esta vendo o que vai ao ar:
REM   nao ha URL, nao ha tipo MIME vindo do servidor, e qualquer coisa que a
REM   pagina venha a usar depois (fetch, modulos ES, service worker) e
REM   BLOQUEADA fora de http/https. Servindo por localhost, o que voce ve na
REM   bancada e o que o visitante recebe.
REM
REM APARECE NA REDE LOCAL, DE PROPOSITO
REM   O python -m http.server escuta em todas as interfaces, entao o celular
REM   no mesmo Wi-Fi abre pelo endereco de rede impresso abaixo. E o unico
REM   jeito de conferir de verdade a dobra no telefone - ela e travada em
REM   100svh, e `svh` so se comporta como no aparelho quando ha barra de
REM   endereco de aparelho. Se voce NAO quiser expor, acrescente
REM   --bind 127.0.0.1 na ultima linha.
REM ===========================================================================
cd /d "%~dp0"
title BFMIDI - servidor local da landing page

REM --- 1. o bat esta junto do site? -----------------------------------------
if not exist "index.html" (
  echo.
  echo   ERRO: nao encontrei index.html nesta pasta.
  echo   Este bat serve a pasta em que ele mesmo esta. Se ele foi movido,
  echo   leve-o de volta para junto do index.html ^(pasta Site^).
  echo.
  pause
  exit /b 1
)

REM --- 2. qual interpretador Python existe nesta maquina? --------------------
REM Testa os tres nomes usuais. Blocos separados, e nao um `if ... && ...`
REM numa linha so: em batch o && depois de um `if` nao se prende a condicao.
set "PY="
py      -c "" >nul 2>&1 && set "PY=py"
if not defined PY ( python  -c "" >nul 2>&1 && set "PY=python"  )
if not defined PY ( python3 -c "" >nul 2>&1 && set "PY=python3" )

if not defined PY (
  echo.
  echo   ERRO: Python nao encontrado ^(tentei py, python e python3^).
  echo   Instale de https://www.python.org/downloads/ marcando a caixa
  echo   "Add python.exe to PATH" e abra este bat de novo.
  echo.
  pause
  exit /b 1
)

REM --- 3. primeira porta livre ----------------------------------------------
REM Sem esta varredura, abrir o bat duas vezes derruba a segunda com um
REM traceback de WinError 10048 no lugar de uma mensagem. A faixa 8790-8799
REM nao colide com os outros servidores do repo (8123 production, 8777
REM sniffer, 8765 LandingPage).
set "PORT="
for /L %%P in (8790,1,8799) do (
  if not defined PORT (
    netstat -an | findstr /C:"LISTENING" | findstr /C:":%%P " >nul 2>&1
    if errorlevel 1 set "PORT=%%P"
  )
)
if not defined PORT (
  echo.
  echo   ERRO: as portas 8790 a 8799 estao todas ocupadas.
  echo   Feche os servidores abertos ^(as outras janelas deste bat^) e tente
  echo   de novo.
  echo.
  pause
  exit /b 1
)

REM --- 4. endereco na rede local, para abrir no celular ---------------------
REM Melhor esforco: pega o primeiro IPv4 que o ipconfig lista. Numa maquina
REM com Hyper-V / VirtualBox / VPN esse primeiro pode ser de um adaptador
REM virtual - por isso o texto abaixo diz "se nao funcionar", em vez de
REM afirmar que este e o endereco certo.
set "LANIP="
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /C:"IPv4"') do (
  if not defined LANIP set "LANIP=%%A"
)
if defined LANIP set "LANIP=!LANIP: =!"

echo.
echo  ============================================================
echo    BFMIDI - landing page ^(Site^)
echo  ------------------------------------------------------------
echo    Neste computador:  http://localhost:!PORT!/
if defined LANIP (
  echo    No celular:        http://!LANIP!:!PORT!/
  echo                       ^(mesmo Wi-Fi. Se nao abrir, rode ipconfig
  echo                        e use o IPv4 da sua rede^)
)
echo  ------------------------------------------------------------
echo    Ctrl+C para parar. Editou um arquivo? So dar F5 - nao
echo    precisa reiniciar o servidor.
echo  ============================================================
echo.

start "" "http://localhost:!PORT!/"
%PY% -m http.server !PORT!

echo.
echo   Servidor encerrado.
pause
