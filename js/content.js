/* ============================================================================
   BFMIDI — LANDING (Site/) · CONTEÚDO
   ============================================================================
   ESTE ARQUIVO É A ÚNICA FONTE DE TEXTO DA PÁGINA.
   Nenhuma frase de modelo, ficha, painel ou rótulo deve ser escrita direto no
   index.html nem no main.js. Quem edita copy mexe só aqui.

   Carregue ANTES de js/main.js:
       <script src="js/content.js" defer></script>
       <script src="js/main.js"    defer></script>

   ----------------------------------------------------------------------------
   A ORDEM DO ARRAY É A ORDEM DO SELETOR.
   O índice também é o que o link direto usa (#8sw, #6sw, #nano, #micro), então
   reordenar troca o destino de links já publicados. Modelo novo vai no FIM.

   ----------------------------------------------------------------------------
   A PÁGINA NÃO ROLA. Tudo cabe numa tela só, e quem troca o que está em cena é
   o seletor: escolher um modelo troca a cápsula de MODELOS para o SUBMENU
   (INFO · CONECTS · COMPRAR), e cada item do submenu é um painel.

   ONDE CADA TEXTO DESTE ARQUIVO APARECE
     · `h1`, `shot` .......................... painel HOME (a lista de modelos)
       (`lead` não aparece mais em lugar nenhum: abria o painel INFO e saiu
        em 19/09/2026; fica no arquivo como descrição do modelo)
     · `specs` + banda `panel:'info'` ...... painel INFO
     · banda `panel:'conects'` ............. painel CONECTS
     · `ports` (chaves de `ports`) ......... painel CONECTS, a faixa de ícones
                                              das conexões sob foto e texto
     · `buy` (compartilhado) ............... painel COMPRAR

   MODELO SEM FOTO  ->  `shot: null`
   O main.js troca a foto por um MAPA DE FOOTSWITCHES daquele modelo (desenhado
   a partir de `switches`), que já entrega o fato principal — quantos pés o
   aparelho tem — enquanto a fotografia não existe. Não é caixa de erro: é
   informação verdadeira num formato provisório.

   MODELO SEM BANDA  ->  o painel correspondente cai no texto de espera. A
   banda exige foto: sem arquivo, ela vira meia tela vazia. A BANDA É ROTULADA
   PELO CAMPO `panel`, e não pela posição no array — é ele que decide se o
   texto vai para INFO ou para CONECTS.

   ----------------------------------------------------------------------------
   DE ONDE VÊM OS NÚMEROS
   Do firmware, não do marketing:
     · 10 bancos (A..J) x 6 presets .......... BANK_MEMORY_LETTERS / _PRESETS
     · alcance do pé por banco ............... boardPresetCount() — as placas de
       4 footswitches chegam a 4 presets por letra, não 6, então MICRO diz 40 e
       não 60. Vender 60 numa MICRO seria vender um número que o pé não alcança.
     · 480x320 ............................... DISPLAY_480x320, família BFMIDI-3
     · rótulos do painel ..................... silkscreen real das fotos
   Mudou o firmware? Este arquivo é o espelho — corrija aqui também.
   ========================================================================== */

window.BF_CONTENT = (function () {
  'use strict';

  /* Os 9 comportamentos de footswitch do modo LIVE. Lista compartilhada: é a
     mesma em todos os modelos, porque quem a define é o firmware, não a placa. */
  var LIVE_MODES = 'Stomp, macros, momentâneo, tap tempo, spin, rampa, ' +
                   'envio único, steps e control.';

  function specSwitches(n, note) {
    return { value: String(n), label: 'Footswitches', note: note };
  }
  function specPresets(perBank) {
    return {
      value: String(perBank * 10),
      label: 'Presets ao alcance do pé',
      note: '10 bancos, de A a J, com ' + perBank + ' presets cada.'
    };
  }
  var SPEC_SCREEN = {
    value: '480×320',
    label: 'Tela colorida',
    note: 'Fundo por imagem, ícone e cor próprios em cada footswitch.'
  };
  var SPEC_SCREEN_35 = {
    value: '3,5″',
    label: 'Tela colorida',
    note: 'Fundo por imagem, ícone e cor próprios em cada footswitch.'
  };
  var SPEC_SCREEN_24 = {
    value: '2,4″',
    label: 'Tela colorida',
    note: 'Fundo por imagem, ícone e cor próprios em cada footswitch.'
  };
  var SPEC_MODES = {
    value: '9',
    label: 'Comportamentos em LIVE',
    note: LIVE_MODES
  };

  return {
    ui: {
      header: 'CONTROLADORAS MIDI DE PALCO',
      headerLink: 'Conexões',
      collection: 'MODELOS',
      overview: 'Visão geral',
      buy: 'Comprar',
      footerEnd: 'Controladoras MIDI'
    },
    /* Os ícones das conexões do painel CONECTS (18/09/2026, arte do usuário):
       um tile por conexão, com o nome já impresso na própria imagem — o
       `label` é só o texto alternativo. Cada modelo lista em `ports` as
       chaves que tem, NA ORDEM em que devem aparecer (saídas MIDI, USB, sem
       fio, entradas); modelo sem `ports` não mostra a faixa. Arquivo: assets/<img>.webp, 480×477 com alfa —
       TODOS na mesma caixa ("deixe os ícones do mesmo tamanho"): a arte dos
       USB era 6% mais baixa e foi esticada na exportação, o que não se nota.
       `h` é a altura em px, para o <img> reservar a proporção antes de
       carregar. */
    ports: {
      din5:      { img: 'port-din5',       h: 477, label: 'MIDI OUT (DIN5)' },
      trs:       { img: 'port-trs',        h: 477, label: 'MIDI OUT (TRS-A)' },
      usbDevice: { img: 'port-usb-device', h: 477, label: 'USB MIDI DEVICE' },
      usbHost:   { img: 'port-usb-host',   h: 477, label: 'USB HOST' },
      bluetooth: { img: 'port-bluetooth',  h: 477, label: 'Conexão Bluetooth MIDI — BLE (MIDI wireless)' },
      wifi:      { img: 'port-wifi',       h: 477, label: 'Conexão Wi-Fi para o app' },
      dualSw:    { img: 'port-dual-switch',h: 477, label: 'Entrada Dual Switch — P10 TRS' },
      exp:       { img: 'port-expression', h: 477, label: 'Entrada Pedal de Expressão — P10 TRS' }
    },

    models: [
      /* ---------------------------------------------------------------- 8SW+ */
      {
        hash: '8sw',
        tab: '8SW+',
        id: 'BFMIDI 8SW+',
        h1: ['BFMIDI', '8SW+'],
        lead: 'MIDI DIN5, TRS e USB. Entradas para expressão e footswitches externos.',
        cta: 'Ver detalhes',
        shot: '8sw-hero-front',
        shotAlt: 'BFMIDI 8SW+ visto de frente: oito footswitches, LIVE MODE e GLOBAL SWITCH, ' +
                 'tela colorida com amplificador e o anel azul do footswitch 1 aceso.',
        ports: ['din5', 'trs', 'usbDevice', 'usbHost', 'bluetooth', 'wifi', 'dualSw', 'exp'],
        switches: 8,
        specs: [
          specSwitches(8, 'Seis para presets, mais LIVE MODE e GLOBAL SWITCH dedicados.'),
          specPresets(6),
          SPEC_SCREEN_35,
          SPEC_MODES
        ],
        buy: {
          hideDetails: true,
          primary: {
            label: 'Comprar 8SW+',
            href: 'https://loja.bffx.com.br/produtos/bfmidi-s3-8sw-417n6'
          },
          waitlist: {
            text: 'Caso esteja esgotado, fale com o Branco para entrar no grupo de espera do próximo lote.',
            label: 'Chamar no WhatsApp',
            href: 'https://wa.me/5516992274195?text=Ol%C3%A1%20Branco%21%20Quero%20entrar%20no%20grupo%20de%20espera%20do%20pr%C3%B3ximo%20lote%20da%20BFMIDI%208SW%2B.'
          }
        },
        bands: [
          {
            panel: 'info',
            img: '8sw-top',
            alt: 'BFMIDI 8SW+ vista de cima com os anéis de LED acesos em cores ' +
                 'diferentes e a tela mostrando seis ícones de efeito.',
            title: 'Anéis de LED independentes',
            body: 'Cada footswitch tem o próprio anel de LED. A cor diz o estado, ' +
                  'e o estado é seu: você escolhe a cor de ligado e de desligado ' +
                  'em cada um.',
            list: [
              'Anel independente por footswitch',
              'Cor de ligado e desligado definidas por você',
              'A tela repete a mesma cor no ícone do efeito'
            ]
          },
          {
            panel: 'conects',
            img: '8sw-rear',
            alt: 'Painel traseiro da BFMIDI 8SW+ com as entradas e saídas ' +
                 'identificadas: DEVICE, 2SW, EXP, DIN5, TRS, HOST e 9V.',
            title: 'Conexões MIDI e USB HOST',
            body: 'MIDI clássico, MIDI por TRS e MIDI por USB saem juntos. A porta ' +
                  'HOST vai além: ela controla pedais USB direto, sem computador ' +
                  'no meio.',
            list: [
              'Saídas MIDI DIN5, TRS e USB simultâneas',
              'Porta USB HOST para controlar pedais USB',
              'Entradas para pedal de expressão e dois footswitches externos'
            ]
          }
        ]
      },

      /* ---------------------------------------------------------------- 6SW+ */
      {
        hash: '6sw',
        tab: '6SW+',
        id: 'BFMIDI 6SW+',
        h1: ['BFMIDI', '6SW+'],
        lead: 'Seis footswitches, tela colorida e acesso ao modo LIVE.',
        cta: 'Ver detalhes',
        shot: '6sw-hero',
        shotAlt: 'BFMIDI 6SW+ vista de cima: seis footswitches em linha, tela colorida ' +
                 'com amplificador e o preset Classic Rock, anel verde aceso no ' +
                 'footswitch 2, e as conexões DEVICE, TRS, HOST, EXP, SW1/2 e 9V na ' +
                 'borda de cima.',
        /* O que a foto mostra na borda de cima: DEVICE, TRS, HOST, EXP e SW1/2
           (mais o 9V). Sem DIN5, como a NANO+. */
        ports: ['trs', 'usbDevice', 'usbHost', 'bluetooth', 'wifi', 'dualSw', 'exp'],
        switches: 6,
        specs: [
          specSwitches(6, 'Seis footswitches para presets, com acesso ao modo LIVE.'),
          specPresets(6),
          SPEC_SCREEN,
          SPEC_MODES
        ],
        /* A banda de INFO não traz `img` e cai na foto principal (main.js);
           a de CONEXÕES tem a foto traseira. */
        bands: [
          {
            panel: 'info',
            title: 'Recursos da 6SW+',
            body: 'Seis footswitches em linha e a mesma tela colorida da 8SW+, num ' +
                  'corpo baixo e estreito. Sem footswitch dedicado, o LIVE MODE ' +
                  'entra pisando o 1 e o 2 juntos.',
            list: [
              'Seis footswitches com anel de LED próprio',
              'LIVE MODE pisando os footswitches 1 e 2 juntos',
              'Mesmo editor, mesmos presets, mesma memória'
            ]
          },
          {
            panel: 'conects',
            img: '6sw-rear',
            alt: 'Painel traseiro da BFMIDI 6SW+ com as conexões identificadas: ' +
                 '9V, SW1/2, EXP, USB HOST, TRS e USB DEVICE.',
            title: 'Conexões da 6SW+',
            body: 'MIDI por TRS e por USB, mais a porta USB HOST para controlar pedais ' +
                  'USB sem computador. As entradas de expressão e de footswitches ' +
                  'externos ficam na mesma borda, ao lado do 9V.',
            list: [
              'Saídas MIDI TRS e USB',
              'Porta USB HOST para pedais USB',
              'Pedal de expressão e dois footswitches externos'
            ]
          }
        ]
      },

      /* --------------------------------------------------------------- NANO+ */
      {
        hash: 'nano',
        tab: 'NANO+',
        id: 'BFMIDI NANO+',
        h1: ['BFMIDI', 'NANO+'],
        lead: 'Seis footswitches e tela colorida em formato compacto.',
        cta: 'Ver detalhes',
        shot: 'nano-hero',
        shotAlt: 'BFMIDI NANO+ vista de frente: seis footswitches, tela colorida ' +
                 'com o preset CLASSIC ROCK e anel azul aceso no footswitch 1.',
        ports: ['trs', 'usbDevice', 'usbHost', 'bluetooth', 'wifi', 'dualSw', 'exp'],
        switches: 6,
        specs: [
          specSwitches(6, 'Os mesmos seis presets por banco, num corpo bem menor.'),
          specPresets(6),
          SPEC_SCREEN_35,
          SPEC_MODES
        ],
        buy: {
          hideDetails: true,
          primary: {
            label: 'Comprar NANO+',
            href: 'https://loja.bffx.com.br/produtos/bfmidi-s3-nano-1o1uu'
          },
          waitlist: {
            text: 'Caso esteja esgotado, fale com o Branco para entrar no grupo de espera do próximo lote.',
            label: 'Chamar no WhatsApp',
            href: 'https://wa.me/5516992274195?text=Ol%C3%A1%20Branco%21%20Quero%20entrar%20no%20grupo%20de%20espera%20do%20pr%C3%B3ximo%20lote%20da%20BFMIDI%20NANO%2B.'
          }
        },
        bands: [
          {
            panel: 'info',
            img: 'nano-top',
            alt: 'BFMIDI NANO+ vista de cima com os seis anéis de LED acesos em ' +
                 'cores diferentes e a tela mostrando ícones de efeito.',
            title: 'Recursos da NANO+',
            body: 'Mesmos seis presets por banco, mesma tela colorida, mesmos nove ' +
                  'comportamentos de footswitch. O que encolheu foi o corpo.',
            list: [
              'Seis footswitches com anel de LED próprio',
              'Mesma tela colorida da 8SW+',
              'Mesmo editor, mesmos presets, mesma memória'
            ]
          },
          {
            panel: 'conects',
            img: 'nano-gallery-6',
            alt: 'Painel traseiro da BFMIDI NANO+ com as entradas e saídas ' +
                 'identificadas: EXP, 2SW, DEVICE, 9V, HOST e TRS.',
            title: 'Conexões da NANO+',
            body: 'A NANO+ oferece MIDI por TRS e USB, além da porta USB HOST para ' +
                  'controlar pedais sem computador.',
            list: [
              'Saídas MIDI TRS e USB',
              'Porta USB HOST para pedais USB',
              'Pedal de expressão e dois footswitches externos'
            ]
          }
        ]
      },

      /* --------------------------------------------------------------- MICRO */
      {
        hash: 'micro',
        tab: 'MICRO',
        id: 'BFMIDI MICRO',
        h1: ['BFMIDI', 'MICRO'],
        lead: 'Quatro footswitches e 40 presets ao alcance do pé.',
        cta: 'Ver detalhes',
        shot: 'micro-hero',
        shotAlt: 'BFMIDI 3 MICRO vista de cima: quatro footswitches com anéis de LED ' +
                 'coloridos, LIVE MODE, tela colorida com o preset ROCK e as portas ' +
                 '9V, TRS, USB HOST e USB DEVICE no topo.',
        /* O que a foto mostra no topo: TRS, HOST e DEVICE (mais o 9V). Sem
           DIN5, e sem entrada de expressão ou dual switch (confirmado pelo
           usuário, 18/09/2026). */
        ports: ['trs', 'usbDevice', 'usbHost', 'bluetooth', 'wifi'],
        switches: 4,
        specs: [
          specSwitches(4, 'Quatro footswitches, para quem conta cada centímetro da placa.'),
          /* 4 por banco, e não 6: nas placas de quatro footswitches o pé alcança
             quatro presets por letra. Ver boardPresetCount() no firmware. */
          specPresets(4),
          SPEC_SCREEN_24,               /* tela de 2,4″, informação do usuário */
          SPEC_MODES
        ],
        buy: {
          hideDetails: true,
          primary: {
            label: 'Comprar MICRO',
            href: 'https://loja.bffx.com.br/produtos/bfmidi-3-micro-qdul0'
          },
          waitlist: {
            text: 'Caso esteja esgotado, fale com o Branco para entrar no grupo de espera do próximo lote.',
            label: 'Chamar no WhatsApp',
            href: 'https://wa.me/5516992274195?text=Ol%C3%A1%20Branco%21%20Quero%20entrar%20no%20grupo%20de%20espera%20do%20pr%C3%B3ximo%20lote%20da%20BFMIDI%20MICRO.'
          }
        },
        /* A banda de INFO não traz `img` e cai na foto principal (main.js);
           a de CONEXÕES tem a foto traseira. */
        bands: [
          {
            panel: 'info',
            title: 'Recursos da MICRO',
            body: 'Quatro footswitches, tela colorida e os mesmos nove comportamentos ' +
                  'de LIVE das maiores. Sem footswitch dedicado, o LIVE MODE entra ' +
                  'pisando o 1 e o 3 juntos.',
            list: [
              'Quatro footswitches com anel de LED próprio',
              'LIVE MODE pisando os footswitches 1 e 3 juntos',
              'Mesmo editor, mesmos presets, mesma memória'
            ]
          },
          {
            panel: 'conects',
            img: 'micro-rear',
            alt: 'Painel traseiro da BFMIDI 3 MICRO com as conexões identificadas: ' +
                 '9V, TRS, USB DEVICE e USB HOST.',
            title: 'Conexões da MICRO',
            body: 'MIDI por TRS e por USB, mais a porta USB HOST para controlar pedais ' +
                  'USB sem computador. Tudo no topo, com a alimentação de 9V.',
            list: [
              'Saídas MIDI TRS e USB',
              'Porta USB HOST para pedais USB',
              'Editor por Wi-Fi ou pelo cabo USB'
            ]
          }
        ]
      }
    ],

    /* ------------------------------------------------------- AS OPÇÕES ----
       A segunda cápsula, embaixo da de modelos. A ORDEM É A ORDEM DAS ABAS, e `key` é ao
       mesmo tempo o id do painel (`#panel-<key>`) e o pedaço do link direto
       (`#8sw/info`). Renomear uma chave quebra links já publicados.

       `eyebrow` é o micro-rótulo impresso no topo do painel — ele existe para
       o painel se identificar sozinho quando a aba já rolou para longe do
       olho, e por isso é uma palavra por extenso, não a sigla da aba. */
    sub: {
      items: [
        { key: 'info',    label: 'INFO',   eyebrow: 'Informações' },
        { key: 'conects', label: 'IN/OUT', eyebrow: 'Conexões' },
        { key: 'comprar', label: 'SHOP',   eyebrow: 'Comprar' }
      ]
    },

    software: {
      key: 'software',
      label: 'Sistema BFMiDi',
      eyebrow: 'Software',
      title: 'Sistema BFMiDi',
      lead: 'O centro de configuração da sua controladora. Crie presets, personalize cada footswitch e envie tudo para o pedal em uma interface visual.',
      features: [
        { title: 'Editor visual', description: 'Organize bancos, presets e comandos MIDI com uma visão clara do seu setup.' },
        { title: 'Cores e tela', description: 'Defina as cores dos anéis de LED e o conteúdo exibido na tela da controladora.' },
        { title: 'Pronto para tocar', description: 'Conecte, configure e salve. As alterações ficam prontas para usar no palco.' }
      ],
      action: { label: 'Abrir Sistema BFMiDi', href: 'https://bffx-updates.github.io/Editor_BFMiDi_v13/' }
    },

    resources: {
      label: 'Recursos',
      softwareLabel: 'Sistema BFMiDi',
      items: [
        { key: 'apps', label: 'Apps', eyebrow: 'Apps', title: 'BFMiDi Editor' },
        { key: 'downloads', label: 'Downloads', eyebrow: 'Downloads', title: 'Downloads e atualizações',
          lead: 'Acesse os aplicativos e o atualizador da controladora.',
          links: [
            { title: 'Central de downloads', description: 'Escolha o aplicativo compatível com o seu dispositivo.', label: 'Abrir downloads', href: 'https://bffx-updates.github.io/Download_Apps/' },
            { title: 'Atualizador BFMIDI', description: 'Consulte as instruções e atualize o firmware pelo navegador.', label: 'Abrir atualizador', href: 'https://bffx-updates.github.io/BFMiDi_v13/' }
          ] },
        { key: 'manual', label: 'Manual', eyebrow: 'Manual', title: 'Manual BFMIDI',
          lead: 'Consulte as instruções de configuração e uso da controladora.',
          links: [
            { title: 'Manual online', description: 'Consulte os recursos, os modos de operação e as conexões.', label: 'Abrir manual', href: 'https://bffx-updates.github.io/Manual_BFMiDI_v13/' }
          ] }
      ]
    },

    /* Texto do estado provisório. Fica aqui, e não no main.js, porque é copy. */
    pending: {
      shot:  'Fotografia em produção',
      bands: 'As fotos de detalhe deste modelo estão em produção. ' +
             'A ficha ao lado já é a definitiva.',
      /* PREENCHER quando a traseira da 6SW+ e da MICRO estiver confirmada:
         basta acrescentar ao modelo uma banda com `panel: 'conects'`, e este
         texto some sozinho. Enquanto isso, o painel não inventa conexão que
         não foi conferida no aparelho. */
      conects: 'A ficha de conexões deste modelo está em confirmação. ' +
               'Fale com a BFFX que a gente responde com o painel completo.'
    },

    /* Bloco do editor — igual para todos os modelos, e por isso vive fora da
       lista. Aparece no fim do painel CONECTS: conectar ao editor é a última
       conexão da lista, e é a que diferencia o aparelho. */

    /* ----------------------------------------------------------- COMPRAR ----
       PREENCHER: `price` e os dois `href`. Eles nascem em '#' de propósito —
       um link falso que parece real é pior que um placeholder visível. Troque
       por link de loja, WhatsApp ou e-mail e nada mais precisa mudar.

       Os itens de `list` são fatos do produto (firmware e editor), não
       promessa comercial: só entre aqui o que a BFFX consegue cumprir. */
    buy: {
      unavailable: 'O canal de contato estará disponível em breve.',
      price: 'Sob consulta',
      lead: 'Fale direto com a BFFX: a gente confirma preço, prazo e a versão ' +
            'certa para o seu setup antes de fechar.',
      list: [
        'Editor no navegador, sem instalar nada e sem assinatura',
        'Atualização de firmware pelo próprio navegador',
        'Presets de fábrica já gravados, prontos para tocar'
      ],
      primary: { label: 'Falar com a BFFX', href: '#' },
      ghost:   { label: 'Abrir o manual',   href: 'https://bffx-updates.github.io/Manual_BFMiDI_v13/' }
    }
  };
})();
