# Vitrine BFMIDI

Site estático em português, com quatro modelos e painéis de detalhes, conexões e compra.

- Conteúdo e destinos comerciais: `js/content.js`.
- Navegação, links diretos e acessibilidade: `js/main.js`.
- Composição e ajustes responsivos atuais: `css/refine.css`, carregado após os estilos de base.
- Preparação para hospedagem e validação de arquivos: `node scripts/build.cjs`.
- Prévia local: `servidor_local.bat`.

O tema escuro apresenta a controladora centralizada, com nome do modelo e informações diretas. O fundo usa partículas discretas em `js/particles.js`: até 100 pontos, atualização limitada a 30 quadros por segundo e resolução limitada para reduzir o custo em telas de alta densidade. A animação pausa quando a aba fica oculta e permanece estática quando o visitante prefere movimento reduzido. O canvas é decorativo e não intercepta cliques.

A rolagem natural permite ler todo o conteúdo no celular, em telas baixas e com texto ampliado.

Os links de contato e manual ainda precisam ser preenchidos em `buy.primary.href` e `buy.ghost.href`. Até receberem destinos reais, os botões aparecem desabilitados e acompanhados de uma explicação. As fotos pendentes da 6SW+ e MICRO continuam identificadas; nenhuma especificação nova foi inventada.

A versão anterior está guardada em `.bak/refinamento-20260906/`.
