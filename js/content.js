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
   A PÁGINA ROLA como uma leitura normal, e cada troca de vista volta ao topo.
   Quem troca o que está em cena é a navegação: a cápsula de MODELOS em cima e a
   barra de baixo (HOME · INFO · IN/OUT · SHOP no modelo; o modelo · APPS ·
   DOWNLOADS · MANUAL nas vistas de recursos), e cada item é um painel.

   ONDE CADA TEXTO DESTE ARQUIVO APARECE
     · `h1`, `shot` .......................... painel HOME (a lista de modelos)
       (`lead` não aparece mais em lugar nenhum: abria o painel INFO e saiu
        em 19/09/2026; fica no arquivo como descrição do modelo)
     · `specs` + banda `panel:'info'` ...... painel INFO
     · banda `panel:'conects'` ............. painel CONECTS (IN/OUT): o título
                                              em duas linhas (`title` + `hot`),
                                              o lead (`body`), a foto traseira
                                              (`img`, `size` = largura×altura do
                                              arquivo) e `silk`, as etiquetas do
                                              chassi em cima de cada conector:
                                              [nome, % da largura da foto],
                                              medidas na própria foto; `floor`
                                              = % da altura da foto em que o
                                              chassi termina (dali saem a
                                              sombra no chão e os fios das
                                              etiquetas)
     · `ports` (chaves de `ports`) ......... painel CONECTS, o painel de
                                              conexões abaixo da foto
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
      footerEnd: 'Controladoras MIDI',
      /* O rótulo curto da tecla de Apps na cápsula. O leitor de tela ouve
         o mesmo rótulo em caixa normal ("App"), e a dica do mouse é o
         `label` do item 'apps' de `resources`. */
      appsShort: 'APP',
      /* O cartão de PRÓXIMO PASSO no fim do INFO e do IN/OUT. `view` é a
         chave do painel de destino (o botão leva ao #<modelo>/<view>). O
         INFO fecha com [conects, comprar]; o IN/OUT, com [apps, comprar]. */
      next: {
        kicker:  'Próximo passo',
        conects: { label: 'Ver as conexões', view: 'conects' },
        comprar: { label: 'Comprar',         view: 'comprar' },
        apps:    { label: 'Baixar o editor', view: 'apps' }
      }
    },
    /* Painel INFO. `head` é o cabeçalho (o micro-rótulo "Informações" e o
       nome do modelo vêm de `sub` e de `models`); `{w}`/`{h}` são as medidas
       de `dimensions` do modelo, `{n}` os footswitches (`switches`) e `{tela}`
       o número do cartão de tela (`specs[2].value`): o lead diz o que
       diferencia um modelo do outro. `leadNoDims` vale para modelo sem medidas.
       `dims` são as cotas da foto: `value` é a etiqueta desenhada e `label`
       a frase que o leitor de tela ouve no lugar do desenho. A foto é vista
       de cima, então a segunda medida é a PROFUNDIDADE, e não a altura. */
    infoCards: {
      head: {
        title: 'Tudo no pé,',
        hot: 'tudo à vista.',
        lead: '{n}\u00a0footswitches com anel de LED próprio e tela colorida de {tela}, num corpo de {w}\u00a0×\u00a0{h}\u00a0cm.',
        leadNoDims: '{n}\u00a0footswitches com anel de LED próprio e tela colorida de {tela}.'
      },
      dims: {
        value: '{v}\u00a0cm',
        label: 'Medidas da {model} vista de cima: {w} cm de largura por {h} cm de profundidade.'
      },
      switches: { description: 'Acesso rápido, intuitivo e total controle do seu setup em qualquer situação.' },
      presets: { description: 'Organize seus timbres e setups com liberdade e praticidade.' },
      screen: { title: 'Visualização clara e intuitiva.' },
      live: { title: 'Mais possibilidades no seu palco.' },
      leds: {
        title: 'Anéis de LED independentes',
        description: 'Cada footswitch tem o próprio anel de LED. A cor diz o estado, e o estado é seu: você escolhe a cor de ligado e de desligado em cada um.'
      }
    },
    /* O painel de conexões (IN/OUT). Uma entrada por porta; cada modelo lista
       em `ports` as chaves que tem, NA ORDEM em que devem aparecer (saídas
       MIDI, USB, sem fio, entradas). Modelo sem `ports` não mostra o painel.

       `img`   miniatura da porta: assets/<img>.webp, 240×240 com fundo
               transparente — o CONECTOR recortado da arte de 18/09/2026
               (assets/port-*.webp, 480×477), sem a moldura azul e sem a
               legenda impressa, que no painel ficava ilegível. A imagem é
               decorativa (alt vazio): o nome vem em texto (`name`).
               Bluetooth e Wi-Fi não têm conector, e as duas entradas usam o
               mesmo P10 da saída TRS; nas quatro o painel desenha um glifo
               de traço no lugar (CX_GLYPH no main.js), e o `img` delas
               aponta para a arte de origem só para o build validar.
       `label` o nome completo da porta, como está na arte.
       `tag`   a etiqueta branca, como a serigrafia do chassi. Um modelo cujo
               chassi imprima outro nome troca só o dele, na banda de
               conexões (`portTags`) — a 6SW+ chama o dual switch de SW1/2.
       `name`  o nome em texto; `role` o que a porta faz, numa frase.
       `group` a família no painel. Portas vizinhas com o mesmo `group`
               ficam sob a mesma etiqueta ("Saídas MIDI", "USB"…).
               `groupOne` é o mesmo nome no singular, para quando o modelo
               tem uma porta só daquela família (a TRS sem a DIN5). */
    ports: {
      din5:      { img: 'port-din5-240',        label: 'MIDI OUT (DIN5)',
                   tag: 'DIN5',   name: 'MIDI OUT',        group: 'Saídas MIDI', groupOne: 'Saída MIDI',
                   role: 'MIDI clássico, no cabo de 5 pinos.' },
      trs:       { img: 'port-trs-240',         label: 'MIDI OUT (TRS-A)',
                   tag: 'TRS',    name: 'MIDI OUT TRS',    group: 'Saídas MIDI', groupOne: 'Saída MIDI',
                   role: 'MIDI por cabo P10 TRS, tipo A.' },
      usbDevice: { img: 'port-usb-device-240',  label: 'USB MIDI DEVICE',
                   tag: 'DEVICE', name: 'USB MIDI DEVICE', group: 'USB',
                   role: 'MIDI por USB, com o computador.' },
      usbHost:   { img: 'port-usb-host-240',    label: 'USB HOST',
                   tag: 'HOST',   name: 'USB HOST',        group: 'USB',
                   role: 'Controla pedais USB, sem computador.' },
      bluetooth: { img: 'port-bluetooth',       label: 'Conexão Bluetooth MIDI — BLE (MIDI wireless)',
                   tag: 'BLE',    name: 'Bluetooth MIDI',  group: 'Sem fio',
                   role: 'MIDI sem fio, por Bluetooth LE.' },
      wifi:      { img: 'port-wifi',            label: 'Conexão Wi-Fi para o app',
                   tag: 'WI-FI',  name: 'Wi-Fi',           group: 'Sem fio',
                   role: 'Conecta o app e o editor, sem cabo.' },
      dualSw:    { img: 'port-dual-switch',     label: 'Entrada Dual Switch — P10 TRS',
                   tag: '2SW',    name: 'Dual Switch',     group: 'Entradas',
                   role: 'Dois footswitches externos, P10 TRS.' },
      exp:       { img: 'port-expression',      label: 'Entrada Pedal de Expressão — P10 TRS',
                   tag: 'EXP',    name: 'Expressão',       group: 'Entradas',
                   role: 'Pedal de expressão, P10 TRS.' }
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
        dimensions: { width: 18, height: 14 },
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
            size: [1200, 644],
            floor: 90.7,
            alt: 'Painel traseiro da BFMIDI 8SW+ com as entradas e saídas ' +
                 'identificadas: DEVICE, 2SW, EXP, DIN5, TRS, HOST e 9V.',
            title: 'Cabo, USB',
            hot: 'e sem fio.',
            body: 'MIDI clássico, MIDI por TRS e MIDI por USB saem juntos. A porta ' +
                  'HOST vai além: ela controla pedais USB direto, sem computador ' +
                  'no meio.',
            silk: [['DEVICE', 21.4], ['2SW', 31.3], ['EXP', 40.8], ['DIN5', 52],
                   ['TRS', 63.6], ['HOST', 75], ['9V', 86]]
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
        dimensions: { width: 26, height: 9 },
        specs: [
          specSwitches(6, 'Seis footswitches para presets, com acesso ao modo LIVE.'),
          specPresets(6),
          SPEC_SCREEN_35,
          SPEC_MODES
        ],
        buy: {
          hideDetails: true,
          /* Sem loja ainda (`href: '#'`): o botão sai desabilitado e esta
             frase o descreve. É específica do modelo porque a frase
             compartilhada fala de "canal de contato", e aqui o botão é de
             compra. */
          unavailable: 'A 6SW+ ainda não está na loja online.',
          primary: {
            label: 'Comprar 6SW+',
            href: '#'
          },
          ghost: {
            label: 'Abrir o manual',
            href: 'https://bffx-updates.github.io/Manual_BFMiDI_v13/'
          },
          /* A 6SW+ ainda não esteve à venda: "caso esteja esgotado" não
             vale para ela (aprovado em 24/09/2026). */
          waitlist: {
            text: 'Fale com o Branco, da BFFX, para entrar no grupo de espera e saber quando a 6SW+ chegar à loja.',
            label: 'Chamar no WhatsApp',
            href: 'https://wa.me/5516992274195?text=Ol%C3%A1%20Branco%21%20Quero%20entrar%20no%20grupo%20de%20espera%20do%20pr%C3%B3ximo%20lote%20da%20BFMIDI%206SW%2B.'
          }
        },
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
            size: [1600, 517],
            floor: 99.3,
            alt: 'Painel traseiro da BFMIDI 6SW+ com as conexões identificadas: ' +
                 '9V, SW1/2, EXP, USB HOST, TRS e USB DEVICE.',
            title: 'Cabo, USB',
            hot: 'e sem fio.',
            body: 'MIDI por TRS e por USB, mais a porta USB HOST para controlar pedais ' +
                  'USB sem computador. As entradas de expressão e de footswitches ' +
                  'externos ficam na mesma borda, ao lado do 9V.',
            silk: [['9V', 13.4], ['SW1/2', 19.9], ['EXP', 26.9], ['HOST', 47.2],
                   ['TRS', 74.2], ['DEVICE', 86.6]],
            /* O chassi da 6SW+ imprime SW1/2 onde as outras imprimem 2SW. */
            portTags: { dualSw: 'SW1/2' }
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
        dimensions: { width: 18, height: 11 },
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
            size: [1600, 563],
            floor: 96.2,
            alt: 'Painel traseiro da BFMIDI NANO+ com as entradas e saídas ' +
                 'identificadas: EXP, 2SW, DEVICE, 9V, HOST e TRS.',
            title: 'Cabo, USB',
            hot: 'e sem fio.',
            body: 'MIDI por TRS e por USB, mais a porta USB HOST para controlar pedais ' +
                  'USB sem computador. Entradas para pedal de expressão e para dois ' +
                  'footswitches externos.',
            silk: [['TRS', 20.8], ['HOST', 31], ['9V', 41], ['DEVICE', 61.3],
                   ['2SW', 70.5], ['EXP', 79]]
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
        shotAlt: 'BFMIDI MICRO vista de cima: quatro footswitches com anéis de LED ' +
                 'coloridos, LIVE MODE, tela colorida com o preset ROCK e as portas ' +
                 '9V, TRS, USB HOST e USB DEVICE no topo.',
        /* O que a foto mostra no topo: TRS, HOST e DEVICE (mais o 9V). Sem
           DIN5, e sem entrada de expressão ou dual switch (confirmado pelo
           usuário, 18/09/2026). */
        ports: ['trs', 'usbDevice', 'usbHost', 'bluetooth', 'wifi'],
        switches: 4,
        dimensions: { width: 14, height: 10 },
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
            size: [1600, 827],
            floor: 99.6,
            alt: 'Painel traseiro da BFMIDI MICRO com as conexões identificadas: ' +
                 '9V, TRS, USB DEVICE e USB HOST.',
            title: 'Cabo, USB',
            hot: 'e sem fio.',
            body: 'MIDI por TRS e por USB, mais a porta USB HOST para controlar pedais ' +
                  'USB sem computador. Todas as portas ficam no topo, junto da ' +
                  'alimentação de 9V.',
            silk: [['9V', 23.4], ['TRS', 39], ['DEVICE', 55.5], ['HOST', 71.6]]
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

    /* RECURSOS: Apps, Downloads e Manual. `label` é o nome da tecla da
       engrenagem na cápsula e do botão da barra do celular: a palavra da
       página onde ela chega. Nas três vistas, a barra de baixo mostra
       [o modelo] + os `label` dos itens, na ordem do array. (O antigo
       painel "Sistema BFMiDi" saiu em 24/09/2026: repetia os Apps, e o
       link #<modelo>/software abre os Apps.) */
    resources: {
      label: 'Downloads',
      items: [
        { key: 'apps', label: 'Apps', eyebrow: 'Apps', title: 'BFMiDi Editor' },
        /* PAINEL DOWNLOADS (#8sw/downloads). O título sai em duas linhas —
           `head.title` em branco, `head.hot` em laranja. Os cartões, NA
           ORDEM: o dos apps (`apps`, leva à seção Apps deste site, sem
           sair da página), o atualizador (`links`, key 'updater'), o
           manual (o link do item `manual` abaixo) e o Backup View (key
           'backup'). `kicker` é o micro-rótulo de cada cartão. A Central
           de downloads (key 'central') fica fora dos cartões: a seção Apps
           do site já cumpre esse papel. `newTabShort`/`here` dizem, à vista,
           se o cartão abre outra aba ou fica no site (`newTab`, a frase
           inteira, vai para o leitor de tela); `goLabel` é o botão do
           cartão que traz para cá a partir do painel Manual. */
        { key: 'downloads', label: 'Downloads', eyebrow: 'Downloads', title: 'Downloads e atualizações',
          head: { title: 'Downloads e', hot: 'atualizações.' },
          lead: 'O editor, o atualizador de firmware, o manual e o Backup View da sua BFMIDI.',
          newTab: 'Abre em nova aba',
          newTabShort: 'Nova aba',
          here: 'Neste site',
          goLabel: 'Ver downloads',
          apps: { kicker: 'Aplicativos', title: 'BFMiDi Editor', description: 'O mesmo editor da sua BFMIDI no navegador, no Windows, no Mac, no iPhone e no iPad.', label: 'Ver os apps' },
          links: [
            { key: 'central', kicker: 'Aplicativos', title: 'Central de downloads', description: 'Escolha o aplicativo compatível com o seu dispositivo.', label: 'Abrir downloads', href: 'https://bffx-updates.github.io/Download_Apps/' },
            { key: 'updater', kicker: 'Firmware', title: 'Atualizador BFMIDI', description: 'Consulte as instruções e atualize o firmware pelo navegador.', label: 'Abrir atualizador', href: 'https://bffx-updates.github.io/Update_BFMiDi_v14/' },
            { key: 'backup', kicker: 'Ferramenta', title: 'Backup View', description: 'Confira os presets de um backup BFMiDi: PC, canal e cada footswitch.', label: 'Abrir Backup View', href: 'backup-view/index.html' }
          ] },
        /* PAINEL MANUAL (#8sw/manual): mesmo desenho do de Downloads. Os
           `links` viram cartões e `related` acrescenta cartões internos para
           outros painéis desta lista (pela `key`). */
        { key: 'manual', label: 'Manual', eyebrow: 'Manual', title: 'Manual BFMIDI',
          head: { title: 'Manual', hot: 'da BFMIDI.' },
          lead: 'Consulte as instruções de configuração e uso da controladora.',
          related: ['downloads'],
          links: [
            { key: 'manual', kicker: 'Documentação', title: 'Manual online', description: 'Consulte os recursos, os modos de operação e as conexões.', label: 'Abrir manual', href: 'https://bffx-updates.github.io/Manual_BFMiDI_v13/' }
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
      ghost:   { label: 'Abrir o manual',   href: 'https://bffx-updates.github.io/Manual_BFMiDI_v13/' },

      /* Textos do painel SHOP redesenhado (24/09/2026). Nenhum é oferta:
         `storeNote` acompanha o endereço da loja, que o main.js tira do
         próprio `primary.href` (trocou o link, o endereço acompanha);
         `soon` é a ficha do botão sem loja (href '#'); `waitKicker`
         separa o bloco do WhatsApp; `newTab` é o aviso, para leitor de
         tela, do link que abre outra aba. `portTags` é o nome CURTO de
         cada conexão, como na serigrafia do chassi — a descrição longa
         continua em `ports` e vai para o leitor de tela. */
      storeNote: 'Loja online da BFFX',
      soon: 'Em breve',
      waitKicker: 'Grupo de espera',
      newTab: 'abre em nova aba',
      portTags: {
        din5: 'DIN5',
        trs: 'TRS',
        usbDevice: 'USB DEVICE',
        usbHost: 'USB HOST',
        bluetooth: 'BLUETOOTH',
        wifi: 'WI-FI',
        dualSw: '2SW',
        exp: 'EXP'
      }
    }
  };
})();
