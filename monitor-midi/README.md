# BFMIDI · Monitor MIDI

Monitor MIDI USB standalone, externo ao firmware do pedal. Lê as mensagens
MIDI que chegam pelo USB e mostra em tempo real, no visual carvão do editor.

Mora **só aqui**, dentro da vitrine: é publicado em bffx.com.br junto com o
resto do site (painel **Downloads**, cartão "Monitor MIDI"). A pasta
`MONITOR_MIDI/` da raiz do projeto, onde ele nasceu, foi removida em
30/set/2026. Depois de mexer aqui, publique o site
(`Site/SUBIR_SITE_GITHUB.sh` no Mac, `.bat` no Windows).

## Uso

1. Abra `index.html` no Chrome, Edge ou Opera (navegadores com [Web MIDI
   API](https://caniuse.com/midi)).
2. Aceite a permissão MIDI quando o navegador pedir.
3. Escolha a entrada USB e toque algo no dispositivo.

Funciona por `file://` (duplo-clique). Para usar de outra máquina, sirva a
pasta com qualquer servidor estático e abra por HTTPS/`localhost`.

## Tela

- **Entrada** — a lista atualiza sozinha ao plugar/desplugar. A última
  entrada usada é lembrada pelo nome.
- **PAUSAR / RETOMAR** — congela a lista sem desconectar (o LED MIDI IN
  continua piscando em âmbar, pra mostrar que ainda chega mensagem).
- **LIMPAR** — esvazia a lista e zera os contadores.
- **COPIAR** — copia as mensagens visíveis como texto, já com os nomes
  (pronto pra colar no WhatsApp).
- **Contadores** — total de mensagens, mensagens por segundo e canais ativos.
- **Faixa de canais** — cada canal acende quando recebe MIDI e fica marcado
  depois da primeira mensagem. Clicar filtra só aquele canal; clicar de novo
  (ou em TODOS) volta a mostrar tudo.
- **NOVAS MENSAGENS** — se você rolar pra cima, a lista para de acompanhar e
  aparece esse botão pra voltar ao fim.

## Nomes amigáveis (opcional)

Card **Nomes amigáveis**, com uma chave pra ligar/desligar tudo:

- **Pedal por canal** — escolha um pedal da lista do MODO AMIGÁVEL do editor
  (agrupada por marca) para um canal, ou para "Todos". As mensagens daquele
  canal passam a mostrar o nome do CC e do PC (ex.: `CC 48 · ON/OFF Noise
  Gate`) e, onde o pedal tem, o nome do valor (ex.: `127 · Active (ON)`). O
  canal específico vence o "Todos".
- **Nomes seus** — dê um nome a qualquer CC, PC ou nota de um canal, pelo
  formulário do card ou clicando em **+ NOME** direto numa mensagem da lista
  (Enter salva, Esc cancela). Um nome seu vale mais que o do pedal; apagar o
  texto volta ao nome do pedal.

Tudo fica salvo no navegador (`localStorage`), só nesta máquina.

### A lista de pedais é gerada

`pedal_data.js` é **gerado** por `Site/scripts/monitor_pedals.mjs` a partir
do editor (`webApp/app.jsx` → `MATCH_MODE_OPTIONS`/`MATCH_MODE_PEDAL`/
`MATCH_MODE_BRANDS`, `webApp/pedal_labels.js` e `webApp/pedal_values.js`).
Quando entrar pedal novo no MODO AMIGÁVEL, regenere na raiz do projeto:

```bash
node Site/scripts/monitor_pedals.mjs
```

Sem o `pedal_data.js` o monitor funciona igual; só a lista de pedais some (os
nomes seus continuam).

## Opções

- **Mostrar horário** — coluna com hora:minuto:segundo.milissegundo.
- **Juntar mensagens repetidas** — a mesma mensagem seguida soma `×N` em vez
  de criar outra linha.
- **Acompanhar as novas** — rola sozinho até a última mensagem.
- **Limpar após 1 s sem MIDI** — cada rajada começa com a lista limpa.
- **Mostrar Clock (F8) / Active Sense (FE)** — escondidos por padrão (lotam a
  lista).
- **Máximo na lista** — quantas mensagens manter (as mais antigas saem).

## Mensagens reconhecidas

| Status   | Rótulo    | Mostra                                   |
|----------|-----------|------------------------------------------|
| `8x`     | NOTE OFF  | nota (número) · nome · velocidade · canal |
| `9x`     | NOTE ON   | nota (número) · nome · velocidade · canal |
| `Ax`     | POLY-AT   | nota (número) · nome · valor · canal     |
| `Bx`     | CC        | número · nome · valor (+ nome do valor) · canal |
| `Cx`     | PC        | programa · nome · canal                  |
| `Dx`     | CH-PRESS  | valor · canal                            |
| `Ex`     | PITCH-B   | ±valor (barra centrada) · canal          |
| `F0…F7`  | SYSEX     | N bytes + hex                            |
| `F1…FF`  | CLOCK/START/STOP/… | descrição                       |

Os bytes brutos aparecem no fim de cada linha.

## Notas

- Sem build pra rodar, sem dependências — só o `pedal_data.js` é gerado.
- Não envia MIDI, só recebe. SysEx não é pedido na permissão, então não chega.
- As fontes da marca (Inter Tight / JetBrains Mono) só aparecem se estiverem
  instaladas: por `file://` o navegador bloqueia fonte carregada de arquivo.
