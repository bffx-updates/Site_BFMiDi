# Vitrine BFMIDI

Site estático em português, com quatro modelos e painéis de detalhes, conexões e compra.

- Conteúdo e destinos comerciais: `js/content.js`.
- Navegação, links diretos e acessibilidade: `js/main.js`.
- Composição e ajustes responsivos atuais: `css/refine.css`, carregado após os estilos de base.
- Preparação para hospedagem e validação de arquivos: `node scripts/build.cjs`.
- Prévia local: `servidor_local.bat`.

O refinamento usa uma vitrine em duas colunas no computador e uma composição empilhada no celular. A rolagem natural permite ler todo o conteúdo em telas baixas e com texto ampliado. A animação respeita a preferência por movimento reduzido.

Os links de contato e manual ainda precisam ser preenchidos em `buy.primary.href` e `buy.ghost.href`. Até receberem destinos reais, os botões aparecem desabilitados e acompanhados de uma explicação. As fotos pendentes da 6SW+ e MICRO continuam identificadas; nenhuma especificação nova foi inventada.

A versão anterior está guardada em `.bak/refinamento-20260906/`.
