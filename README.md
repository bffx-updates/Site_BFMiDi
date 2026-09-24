# Vitrine BFMIDI

Site estático em português, com quatro modelos e painéis de detalhes, conexões e compra. A engrenagem ao final do menu abre Apps, Downloads e Manual. Apps é a vitrine do BFMiDi Editor (redesenhada em 24/09/2026): um palco com notebook, iPad e iPhone montados em CSS sobre os screenshots reais da versão 14, um dock com as cinco plataformas (a do visitante já vem acesa por detecção de sistema; `?plataforma=web|windows|mac|ios|android` força a escolha em links de suporte), o cartão da plataforma com o botão certo, os benefícios com anéis de LED, os caminhos de conexão e o diálogo de ajuda (`#abrir-ajuda`). A barra da janela do notebook muda com a plataforma escolhida (macOS, Windows ou navegador). Sem JS, as plataformas viram uma lista compacta e tudo continua funcionando. O conteúdo está no bloco `#panel-apps` do `index.html`, os estilos em `css/apps.css` (todo seletor escopado em `#panel-apps`, `.apps-page` ou `#ajuda-dialog`), o comportamento em `js/apps.js` e as imagens em `assets/apps/`. Contrato com o `build_windows_installer_cloud.sh`: o link `assets/apps/BFMiDi-Editor-…-Setup.exe` e o texto `Setup.exe · X,Y MB` ficam no HTML estático, porque o script os reescreve com `sed`; o `apps.js` nunca repete esses valores. Fato que o texto respeita: o editor online (HTTPS) só fala com o pedal pelo cabo USB no Chrome/Edge ou em modo offline, nunca pelo Wi‑Fi; no Android, o caminho hoje é a rede BFMIDI_WIFI e `http://192.168.4.1`. Os demais recursos ficam em `resources.items` de `js/content.js`.

- Conteúdo e destinos comerciais: `js/content.js`.
- Navegação, links diretos e acessibilidade: `js/main.js`.
- Composição e ajustes responsivos atuais: `css/refine.css`, carregado após os estilos de base.
- Cards ilustrados da seção INFO e faixa de LEDs: `css/info.css`. Os textos complementares ficam em `infoCards` de `js/content.js`; números e especificações continuam próprios de cada modelo.
- Preparação para hospedagem e validação de arquivos: `node scripts/build.cjs`.
- Prévia local: `servidor_local.bat`.
- Publicação do código no GitHub: execute `SUBIR_SITE_GITHUB.bat`. Para apenas validar sem enviar, use `SUBIR_SITE_GITHUB.bat --verificar`.

O tema escuro apresenta a controladora centralizada, com nome do modelo e informações diretas. O fundo usa partículas discretas em `js/particles.js`: até 100 pontos, atualização limitada a 30 quadros por segundo e resolução limitada para reduzir o custo em telas de alta densidade. A animação pausa quando a aba fica oculta e permanece estática quando o visitante prefere movimento reduzido. O canvas é decorativo e não intercepta cliques.

A rolagem natural permite ler todo o conteúdo no celular, em telas baixas e com texto ampliado.

O link de contato ainda precisa ser preenchido em `buy.primary.href`. Até receber um destino real, o botão aparece desabilitado e acompanhado de uma explicação. O manual, o editor e a central de downloads usam os endereços de publicação do projeto. As fotos pendentes da 6SW+ e MICRO continuam identificadas; nenhuma especificação nova foi inventada.

A versão anterior está guardada em `.bak/refinamento-20260906/`.
