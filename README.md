# Vitrine BFMIDI

Site estático em português, com quatro modelos e painéis de detalhes, conexões e compra. A engrenagem ao final do menu abre Apps, Downloads e Manual. Apps exibe diretamente a página importada de `download_apps_page`, com cartões por plataforma, instalador local do Windows e diálogo de ajuda. O conteúdo está em `index.html`, os estilos em `css/apps.css`, a ajuda em `js/apps.js` e os arquivos em `assets/apps/`. Os demais recursos ficam em `resources.items` de `js/content.js`.

- Conteúdo e destinos comerciais: `js/content.js`.
- Navegação, links diretos e acessibilidade: `js/main.js`.
- Composição e ajustes responsivos atuais: `css/refine.css`, carregado após os estilos de base.
- Preparação para hospedagem e validação de arquivos: `node scripts/build.cjs`.
- Prévia local: `servidor_local.bat`.

O tema escuro apresenta a controladora centralizada, com nome do modelo e informações diretas. O fundo usa partículas discretas em `js/particles.js`: até 100 pontos, atualização limitada a 30 quadros por segundo e resolução limitada para reduzir o custo em telas de alta densidade. A animação pausa quando a aba fica oculta e permanece estática quando o visitante prefere movimento reduzido. O canvas é decorativo e não intercepta cliques.

A rolagem natural permite ler todo o conteúdo no celular, em telas baixas e com texto ampliado.

O link de contato ainda precisa ser preenchido em `buy.primary.href`. Até receber um destino real, o botão aparece desabilitado e acompanhado de uma explicação. O manual, o editor e a central de downloads usam os endereços de publicação do projeto. As fotos pendentes da 6SW+ e MICRO continuam identificadas; nenhuma especificação nova foi inventada.

A versão anterior está guardada em `.bak/refinamento-20260906/`.
