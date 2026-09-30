/* BFMIDI · Monitor MIDI — Web MIDI API, roda direto no navegador
   (Chrome/Edge/Opera). Para usar:
     1. Abrir index.html (file:// funciona; HTTPS/localhost também)
     2. Aceitar o pedido de permissão MIDI
     3. Escolher a entrada USB e tocar — as mensagens aparecem em tempo real.

   NOMES AMIGÁVEIS (opcional): cada canal pode apontar para um pedal do MODO
   AMIGÁVEL do editor (a tabela vem de pedal_data.js, gerado por
   Site/scripts/monitor_pedals.mjs a partir do webApp), e o usuário pode dar nomes próprios a qualquer CC, PC ou
   nota. Ordem de prioridade: nome do usuário > nome do pedal > só o número.
   Tudo fica no localStorage deste navegador. */
'use strict';

const $ = (sel) => document.querySelector(sel);
const DATA = window.BF_MONITOR_DATA || null;
const STORE_KEY = 'bfmidi_monitor_v2';
const NAME_MAX = 32;
const CHANNELS = 16;

// ─── Utilidades ───────────────────────────────────────────────────
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function noteName(num) {
  const n = num | 0;
  return NOTE_NAMES[n % 12] + (Math.floor(n / 12) - 1);
}
function hex2(n) { return (n & 0xff).toString(16).padStart(2, '0').toUpperCase(); }
function rawBytes(data) { return Array.from(data).map(hex2).join(' '); }
function nowTime() {
  const d = new Date();
  return d.toTimeString().slice(0, 8) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
function icon(id, cls = 'mon-ico') {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(ns, 'use');
  use.setAttribute('href', '#' + id);
  svg.appendChild(use);
  return svg;
}

// ─── Decodificação ────────────────────────────────────────────────
const SYS_INFO = {
  0xf1: ['MTC', 'MTC quarter frame'],
  0xf2: ['SPP', 'Song position'],
  0xf3: ['SSEL', 'Song select'],
  0xf6: ['TUNE', 'Tune request'],
  0xf7: ['EOX', 'Fim de SysEx'],
  0xf8: ['CLOCK', 'Clock · 24 por batida'],
  0xfa: ['START', 'Start'],
  0xfb: ['CONT', 'Continue'],
  0xfc: ['STOP', 'Stop'],
  0xfe: ['A-SENS', 'Active sensing'],
  0xff: ['RESET', 'System reset'],
};

// Uint8Array MIDI → objeto estruturado pra render.
function decode(data) {
  if (!data || data.length === 0) return null;
  const b0 = data[0];
  const raw = rawBytes(data);

  if (b0 >= 0xf0) {
    if (b0 === 0xf0) {
      return { kind: 'sysex', label: 'SYSEX', status: b0, len: data.length,
               desc: `${data.length} bytes`, raw, key: 'sys:240' };
    }
    const [label, desc] = SYS_INFO[b0] || ['SYS', 'Mensagem de sistema'];
    return { kind: 'sys', label, status: b0, desc, raw, key: 'sys:' + b0 };
  }

  const status = b0 & 0xf0;
  const ch = (b0 & 0x0f) + 1;
  const d1 = data[1] || 0;
  const d2 = data[2] || 0;

  if (status === 0x80 || (status === 0x90 && d2 === 0)) {
    return { kind: 'note-off', label: 'NOTE OFF', ch, num: d1, val: d2,
             noteName: noteName(d1), raw, key: `noff:${ch}:${d1}` };
  }
  if (status === 0x90) {
    return { kind: 'note', label: 'NOTE ON', ch, num: d1, val: d2,
             noteName: noteName(d1), raw, key: `non:${ch}:${d1}` };
  }
  if (status === 0xa0) {
    return { kind: 'at', label: 'POLY-AT', ch, num: d1, val: d2,
             noteName: noteName(d1), raw, key: `at:${ch}:${d1}` };
  }
  if (status === 0xb0) {
    return { kind: 'cc', label: 'CC', ch, num: d1, val: d2, raw, key: `cc:${ch}:${d1}` };
  }
  if (status === 0xc0) {
    return { kind: 'pc', label: 'PC', ch, pc: d1, raw, key: `pc:${ch}` };
  }
  if (status === 0xd0) {
    return { kind: 'cp', label: 'CH-PRESS', ch, val: d1, raw, key: `cp:${ch}` };
  }
  if (status === 0xe0) {
    return { kind: 'pb', label: 'PITCH-B', ch, val: ((d2 << 7) | d1) - 8192, raw, key: `pb:${ch}` };
  }
  return { kind: 'sys', label: 'RAW', desc: '', raw, key: 'raw:' + b0 };
}

// ─── Estado + persistência ────────────────────────────────────────
const DEFAULT_OPT = {
  clock: false, active: false, collapse: true, autoscroll: true,
  autoclear: false, time: true, max: 300,
};
const state = {
  midi: null,
  currentInputId: null,
  paused: false,
  events: [],           // [{time, d, count, el, refs}]
  filterCh: 0,          // 0 = todos
  following: true,
  editing: false,
  total: 0,
  stamps: [],
  seen: new Set(),
  lastMsgTs: 0,
  lastInputName: '',
  opt: { ...DEFAULT_OPT },
  names: { enabled: true, map: [], custom: {} },
};

function loadPrefs() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (_) { saved = null; }
  if (!saved || typeof saved !== 'object') return;
  if (saved.opt && typeof saved.opt === 'object') {
    for (const k of Object.keys(DEFAULT_OPT)) {
      if (typeof saved.opt[k] === typeof DEFAULT_OPT[k]) state.opt[k] = saved.opt[k];
    }
    state.opt.max = clampMax(state.opt.max);
  }
  if (saved.names && typeof saved.names === 'object') {
    state.names.enabled = saved.names.enabled !== false;
    if (Array.isArray(saved.names.map)) {
      const used = new Set();
      for (const m of saved.names.map) {
        const ch = Number(m && m.ch);
        if (!Number.isInteger(ch) || ch < 0 || ch > CHANNELS || used.has(ch)) continue;
        used.add(ch);
        const p = m.pedal == null || m.pedal === '' ? null : Number(m.pedal);
        state.names.map.push({ ch, pedal: Number.isInteger(p) && (!DATA || DATA.pedals[p]) ? p : null });
      }
    }
    if (saved.names.custom && typeof saved.names.custom === 'object') {
      for (const [k, v] of Object.entries(saved.names.custom)) {
        if (/^(cc|pc|note):\d{1,2}:\d{1,3}$/.test(k) && typeof v === 'string' && v.trim()) {
          state.names.custom[k] = v.trim().slice(0, NAME_MAX);
        }
      }
    }
  }
  if (typeof saved.input === 'string') state.lastInputName = saved.input;
}
function savePrefs() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      v: 2, opt: state.opt, names: state.names, input: state.lastInputName,
    }));
  } catch (_) { /* sem storage (janela privada, bloqueio): segue sem lembrar */ }
}
function clampMax(v) { return Math.max(20, Math.min(2000, Math.round(Number(v) || DEFAULT_OPT.max))); }
// Antes de qualquer controle ler o estado (os toggles copiam o valor ao ligar).
loadPrefs();

// ─── Nomes amigáveis ──────────────────────────────────────────────
function nameKeyOf(d) {
  if (!d || !d.ch) return null;
  if (d.kind === 'cc') return `cc:${d.ch}:${d.num}`;
  if (d.kind === 'pc') return `pc:${d.ch}:${d.pc}`;
  if (d.kind === 'note' || d.kind === 'note-off' || d.kind === 'at') return `note:${d.ch}:${d.num}`;
  return null;
}
// Pedal do canal: o mapeamento do canal exato vence o de "todos os canais".
function pedalForChannel(ch) {
  if (!DATA || !ch) return null;
  let any = null;
  for (const m of state.names.map) {
    if (m.pedal == null || !DATA.pedals[m.pedal]) continue;
    if (m.ch === ch) return DATA.pedals[m.pedal];
    if (m.ch === 0) any = DATA.pedals[m.pedal];
  }
  return any;
}
function pedalNameFor(d, pedal) {
  if (!pedal) return '';
  if (d.kind === 'cc' && pedal.cc) {
    const t = DATA.CC_LABELS[pedal.cc];
    return (t && t[d.num]) || '';
  }
  if (d.kind === 'pc' && pedal.pc) {
    const t = DATA.PC_LABELS[pedal.pc];
    return (t && t[d.pc]) || '';
  }
  return '';
}
// Nome do VALOR (ex.: Bypass/Model Select). Em defs `sparse` (faixas) só as
// âncoras exatas ganham nome — adivinhar a faixa erraria em pedais cuja
// divisão não é a do rótulo (o bypass dos VTR Gold é 0-63/64-127).
function valueLabelFor(d, pedal) {
  if (d.kind !== 'cc' || !pedal || !pedal.cc || !DATA.VALUE_LABELS) return '';
  const t = DATA.VALUE_LABELS[pedal.cc];
  const def = t && t[d.num];
  if (!def || d.val < def.min || d.val > def.max) return '';
  return def.labels[d.val] || '';
}
function resolveName(d) {
  const key = nameKeyOf(d);
  if (!key) return { text: '', source: '' };
  const custom = state.names.custom[key];
  if (custom) return { text: custom, source: 'custom' };
  const pedal = pedalForChannel(d.ch);
  const pn = pedalNameFor(d, pedal);
  if (pn) return { text: pn, source: 'pedal', pedal: pedal.name };
  return { text: '', source: '' };
}
function shortDescribe(d) {
  if (d.kind === 'cc') return `CC ${d.num} no canal ${d.ch}`;
  if (d.kind === 'pc') return `PC ${d.pc} no canal ${d.ch}`;
  return `nota ${d.noteName} (${d.num}) no canal ${d.ch}`;
}

// Grava (ou apaga) um nome do usuário. Vazio ou igual ao nome do pedal =
// apaga, pra não guardar uma cópia que deixaria de acompanhar a tabela.
function setCustomName(key, raw, pedalDefault) {
  const v = String(raw || '').trim().slice(0, NAME_MAX);
  if (!v || v === pedalDefault) delete state.names.custom[key];
  else state.names.custom[key] = v;
  savePrefs();
  renderCustomList();
  refreshAllNames();
}

// ─── Elementos ────────────────────────────────────────────────────
const eventsEl = $('#monitor-events');
const statusEl = $('#monitor-status');
const statusTextEl = statusEl.querySelector('.mon-status-text');
const selectEl = $('#midi-input');
const btnPause = $('#btn-pause');
const btnClear = $('#btn-clear');
const btnCopy = $('#btn-copy');
const btnFollow = $('#btn-follow');
const activityLed = $('#activity-led');
const stripEl = $('#channel-strip');
const namesCard = $('#names-card');
const namesEnabledEl = $('#names-enabled');
const mapEl = $('#names-map');
const mapAddBtn = $('#names-add');
const customListEl = $('#custom-list');
const customCountEl = $('#custom-count');
const customForm = $('#custom-form');

function setStatus(text, st) {
  statusTextEl.textContent = text;
  statusEl.dataset.state = st || 'idle';
}

// ─── Linha de mensagem ────────────────────────────────────────────
function buildRow(ev, isNew) {
  const d = ev.d;
  const row = el('div', 'mon-ev' + (isNew ? ' is-new' : ''));
  row.dataset.kind = d.kind;
  ev.refs = {};

  row.appendChild(el('span', 'mon-ev-time', ev.time));
  row.appendChild(el('span', 'mon-ev-type', d.label));

  const main = el('div', 'mon-ev-main');
  if (d.kind === 'cc') {
    main.appendChild(el('span', 'mon-ev-num', String(d.num)));
  } else if (d.kind === 'pc') {
    main.appendChild(el('span', 'mon-ev-num', String(d.pc)));
  } else if (d.kind === 'note' || d.kind === 'note-off' || d.kind === 'at') {
    main.appendChild(el('span', 'mon-ev-num', d.noteName));
    main.appendChild(el('span', 'mon-ev-sub', String(d.num)));
  } else if (d.kind === 'pb') {
    main.appendChild(el('span', 'mon-ev-desc', 'Pitch bend'));
  } else if (d.kind === 'cp') {
    main.appendChild(el('span', 'mon-ev-desc', 'Channel pressure'));
  } else if (d.desc) {
    main.appendChild(el('span', 'mon-ev-desc', d.desc));
  }
  if (nameKeyOf(d)) {
    const btn = el('button', 'mon-ev-name');
    btn.type = 'button';
    btn.addEventListener('click', () => startEdit(ev, btn));
    main.appendChild(btn);
    ev.refs.name = btn;
  }
  row.appendChild(main);

  const val = el('div', 'mon-ev-val');
  if (d.kind === 'cc' || d.kind === 'note' || d.kind === 'note-off' || d.kind === 'at' || d.kind === 'cp') {
    val.appendChild(el('span', 'mon-ev-valnum', String(d.val)));
    if (d.kind === 'cc') {
      const vl = el('span', 'mon-ev-vlabel');
      val.appendChild(vl);
      ev.refs.vlabel = vl;
    }
    val.appendChild(valueBar(d.val / 127));
  } else if (d.kind === 'pb') {
    val.appendChild(el('span', 'mon-ev-valnum', (d.val > 0 ? '+' : '') + d.val));
    val.appendChild(valueBar(d.val / 8192, true));
  }
  row.appendChild(val);

  const ch = el('span', 'mon-ev-ch');
  if (d.ch) {
    ch.append('CH ');
    ch.appendChild(el('b', null, String(d.ch)));
  }
  row.appendChild(ch);

  const count = el('span', 'mon-ev-count');
  row.appendChild(count);
  ev.refs.count = count;
  updateCount(ev, false);

  const raw = el('span', 'mon-ev-raw', d.raw);
  raw.title = d.raw;
  row.appendChild(raw);

  updateNames(ev);
  return row;
}

function valueBar(frac, centered) {
  const bar = el('span', 'mon-ev-bar' + (centered ? ' is-center' : ''));
  bar.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('i');
  if (centered) {
    const f = Math.max(-1, Math.min(1, frac));
    const w = Math.abs(f) * 50;
    fill.style.left = (f >= 0 ? 50 : 50 - w) + '%';
    fill.style.width = w + '%';
  } else {
    fill.style.width = Math.max(0, Math.min(1, frac)) * 100 + '%';
  }
  bar.appendChild(fill);
  return bar;
}

function updateCount(ev, bump) {
  const c = ev.refs && ev.refs.count;
  if (!c) return;
  c.textContent = ev.count > 1 ? '×' + ev.count : '';
  c.hidden = ev.count <= 1;
  if (bump) {
    c.classList.remove('is-bump');
    void c.offsetWidth; // reinicia a animação
    c.classList.add('is-bump');
  }
}

function updateNames(ev) {
  const r = ev.refs;
  if (!r) return;
  const on = state.names.enabled;
  if (r.name) {
    r.name.hidden = !on;
    if (on) {
      const res = resolveName(ev.d);
      r.name.textContent = res.text || '+ NOME';
      r.name.classList.toggle('is-empty', !res.text);
      r.name.classList.toggle('is-custom', res.source === 'custom');
      const what = shortDescribe(ev.d);
      r.name.title = res.source === 'custom' ? 'Nome seu — clique para editar'
        : res.source === 'pedal' ? `Nome do ${res.pedal} — clique para trocar`
        : 'Dar um nome a esta mensagem';
      r.name.setAttribute('aria-label', res.text
        ? `${res.text} (${what}). Editar nome`
        : `Dar um nome a ${what}`);
    }
  }
  if (r.vlabel) {
    const t = on ? valueLabelFor(ev.d, pedalForChannel(ev.d.ch)) : '';
    r.vlabel.textContent = t;
    r.vlabel.title = t;
    r.vlabel.hidden = !t;
  }
}
function refreshAllNames() {
  for (const ev of state.events) if (ev.el) updateNames(ev);
}

// Edição direto na linha: o chip vira um campo. Enter/sair do campo salva,
// Esc cancela.
function startEdit(ev, btn) {
  const key = nameKeyOf(ev.d);
  if (!key || !btn.isConnected) return;
  const pedalDefault = pedalNameFor(ev.d, pedalForChannel(ev.d.ch));
  const input = el('input', 'mon-ev-name-input');
  input.type = 'text';
  input.maxLength = NAME_MAX;
  input.value = resolveName(ev.d).text;
  input.placeholder = 'Nome…';
  input.setAttribute('aria-label', `Nome para ${shortDescribe(ev.d)}`);
  btn.replaceWith(input);
  state.editing = true;
  input.focus();
  input.select();

  let done = false;
  const finish = (save, refocus) => {
    if (done) return;
    done = true;
    state.editing = false;
    if (input.isConnected) input.replaceWith(btn);
    if (save) setCustomName(key, input.value, pedalDefault);
    else updateNames(ev);
    if (refocus && btn.isConnected) btn.focus();
    scheduleScroll();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true, true); }
    else if (e.key === 'Escape') { e.preventDefault(); finish(false, true); }
  });
  input.addEventListener('blur', () => finish(true, false));
}

// ─── Lista ────────────────────────────────────────────────────────
function passesFilter(ev) {
  return state.filterCh === 0 || ev.d.ch === state.filterCh;
}

function renderEmpty() {
  let title, text;
  if (!navigator.requestMIDIAccess) {
    title = 'Navegador sem Web MIDI';
    text = 'Abra esta página no Chrome, Edge ou Opera.';
  } else if (state.midiDenied) {
    title = 'Acesso MIDI negado';
    text = 'Libere o MIDI nas permissões do site (cadeado na barra de endereço) e recarregue.';
  } else if (!state.midi) {
    title = 'Aguardando permissão';
    text = 'Aceite o pedido de acesso MIDI do navegador.';
  } else if (!state.currentInputId) {
    title = 'Nenhuma entrada MIDI';
    text = 'Conecte um dispositivo pelo USB. A lista de entradas atualiza sozinha.';
  } else if (state.filterCh && state.events.length) {
    title = `Nada no canal ${state.filterCh}`;
    text = 'Clique em TODOS, ou no mesmo canal de novo, para ver tudo.';
  } else {
    title = 'Aguardando mensagens';
    text = 'Toque algo no dispositivo — cada mensagem aparece aqui.';
  }
  const box = el('div', 'mon-empty');
  box.appendChild(icon('i-din', ''));
  box.appendChild(el('div', 'mon-empty-title', title));
  box.appendChild(el('div', 'mon-empty-text', text));
  eventsEl.replaceChildren(box);
}

function renderAll() {
  const frag = document.createDocumentFragment();
  let shown = 0;
  for (const ev of state.events) {
    if (passesFilter(ev)) {
      ev.el = buildRow(ev, false);
      frag.appendChild(ev.el);
      shown++;
    } else {
      ev.el = null;
      ev.refs = null;
    }
  }
  if (!shown) { renderEmpty(); return; }
  eventsEl.replaceChildren(frag);
  state.following = true;
  btnFollow.hidden = true;
  eventsEl.scrollTop = eventsEl.scrollHeight;
}

function clearEvents() {
  state.events = [];
  state.total = 0;
  state.stamps = [];
  state.seen.clear();
  for (const b of stripEl.querySelectorAll('.mon-ch')) b.classList.remove('is-seen');
  btnFollow.hidden = true;
  state.following = true;
  updateStats();
  renderEmpty();
}

let scrollQueued = false;
function scheduleScroll() {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => {
    scrollQueued = false;
    if (state.editing) return;
    if (state.opt.autoscroll && state.following) {
      eventsEl.scrollTop = eventsEl.scrollHeight;
    } else if (!state.following && eventsEl.querySelector('.mon-ev')) {
      btnFollow.hidden = false;
    }
  });
}

function appendEvent(d) {
  if (!d) return;
  if (!state.opt.clock && d.status === 0xf8) return;
  if (!state.opt.active && d.status === 0xfe) return;

  const now = performance.now();
  // Limpar após 1 s sem MIDI: usa o horário da ÚLTIMA mensagem não filtrada.
  if (state.opt.autoclear && state.lastMsgTs > 0 &&
      (now - state.lastMsgTs) > 1000 && state.events.length > 0) {
    state.events = [];
    eventsEl.replaceChildren();
  }
  state.lastMsgTs = now;
  state.total++;
  state.stamps.push(now);
  if (state.stamps.length > 4000) state.stamps.splice(0, 2000);
  if (d.ch) flashChannel(d.ch);

  // Juntar repetidas: mesma chave e mesmos valores da última = só soma ×N.
  const last = state.events[state.events.length - 1];
  const same = state.opt.collapse && last &&
    last.d.key === d.key && last.d.val === d.val &&
    last.d.num === d.num && last.d.pc === d.pc && last.d.raw === d.raw;
  if (same) {
    last.count++;
    if (last.el) updateCount(last, true);
    return;
  }

  const ev = { time: nowTime(), d, count: 1, el: null, refs: null };
  state.events.push(ev);
  if (passesFilter(ev)) {
    const empty = eventsEl.querySelector('.mon-empty');
    if (empty) empty.remove();
    ev.el = buildRow(ev, true);
    eventsEl.appendChild(ev.el);
  }
  while (state.events.length > state.opt.max) {
    const old = state.events.shift();
    if (old.el) old.el.remove();
  }
  if (!eventsEl.firstElementChild) renderEmpty();
  scheduleScroll();
}

eventsEl.addEventListener('scroll', () => {
  const gap = eventsEl.scrollHeight - eventsEl.scrollTop - eventsEl.clientHeight;
  state.following = gap < 40;
  if (state.following) btnFollow.hidden = true;
}, { passive: true });
btnFollow.addEventListener('click', () => {
  state.following = true;
  btnFollow.hidden = true;
  eventsEl.scrollTo({ top: eventsEl.scrollHeight, behavior: 'smooth' });
});

// ─── Faixa de canais + atividade ──────────────────────────────────
const chButtons = [];
const chTimers = [];
function buildChannelStrip() {
  const all = el('button', 'mon-ch is-all', 'TODOS');
  all.type = 'button';
  all.dataset.ch = '0';
  all.title = 'Mostrar todos os canais';
  stripEl.appendChild(all);
  chButtons[0] = all;
  for (let ch = 1; ch <= CHANNELS; ch++) {
    const b = el('button', 'mon-ch', String(ch));
    b.type = 'button';
    b.dataset.ch = String(ch);
    b.title = `Mostrar só o canal ${ch}`;
    b.setAttribute('aria-label', `Canal ${ch}`);
    stripEl.appendChild(b);
    chButtons[ch] = b;
  }
  stripEl.addEventListener('click', (e) => {
    const b = e.target.closest('.mon-ch');
    if (!b) return;
    const ch = Number(b.dataset.ch);
    setFilter(ch === state.filterCh ? 0 : ch);
  });
  syncFilterButtons();
}
function syncFilterButtons() {
  chButtons.forEach((b, ch) => b.setAttribute('aria-pressed', String(ch === state.filterCh)));
}
function setFilter(ch) {
  state.filterCh = ch;
  syncFilterButtons();
  renderAll();
}
function flashChannel(ch) {
  const b = chButtons[ch];
  if (!b) return;
  if (!state.seen.has(ch)) { state.seen.add(ch); b.classList.add('is-seen'); }
  b.classList.add('is-hot');
  clearTimeout(chTimers[ch]);
  chTimers[ch] = setTimeout(() => b.classList.remove('is-hot'), 130);
}
let ledTimer = 0;
function flashActivity() {
  activityLed.classList.toggle('is-paused', state.paused);
  activityLed.classList.add('is-hot');
  clearTimeout(ledTimer);
  ledTimer = setTimeout(() => activityLed.classList.remove('is-hot'), 80);
}

const statTotal = $('#stat-total');
const statRate = $('#stat-rate');
const statChannels = $('#stat-channels');
const nf = new Intl.NumberFormat('pt-BR');
function updateStats() {
  const now = performance.now();
  let i = 0;
  while (i < state.stamps.length && now - state.stamps[i] > 1000) i++;
  if (i) state.stamps.splice(0, i);
  statTotal.textContent = nf.format(state.total);
  statRate.textContent = nf.format(state.stamps.length);
  statChannels.textContent = String(state.seen.size);
}
setInterval(updateStats, 250);

// ─── MIDI ─────────────────────────────────────────────────────────
function refreshInputs() {
  if (!state.midi) return;
  const prev = state.currentInputId;
  const inputs = Array.from(state.midi.inputs.values());
  selectEl.replaceChildren();
  if (inputs.length === 0) {
    selectEl.appendChild(new Option('— nenhuma entrada MIDI conectada —', ''));
    selectEl.disabled = true;
    selectInput(null);
    return;
  }
  selectEl.disabled = false;
  for (const inp of inputs) {
    const label = `${inp.name || inp.id}${inp.manufacturer ? ' · ' + inp.manufacturer : ''}`;
    selectEl.appendChild(new Option(label, inp.id));
  }
  // Mantém a seleção se ainda existir; senão a última usada (pelo nome);
  // senão a primeira.
  const keep = inputs.find((i) => i.id === prev)
    || inputs.find((i) => state.lastInputName && i.name === state.lastInputName)
    || inputs[0];
  selectInput(keep.id);
}

function statusForInput() {
  const inp = state.currentInputId && state.midi && state.midi.inputs.get(state.currentInputId);
  if (!inp) return;
  const name = inp.name || state.currentInputId;
  if (state.paused) setStatus('pausado · ' + name, 'paused');
  else setStatus('conectado · ' + name, 'on');
}

function selectInput(id) {
  if (!state.midi) return;
  state.midi.inputs.forEach((inp) => { inp.onmidimessage = null; });
  const hadInput = !!state.currentInputId;
  state.currentInputId = id || null;
  selectEl.value = id || '';
  if (!id) {
    setStatus('sem entrada MIDI', 'idle');
    if (!state.events.length) renderEmpty();
    return;
  }
  const inp = state.midi.inputs.get(id);
  if (!inp) { setStatus('entrada não encontrada', 'error'); return; }
  inp.onmidimessage = onMidi;
  if (inp.name) { state.lastInputName = inp.name; savePrefs(); }
  statusForInput();
  if (!hadInput && !state.events.length) renderEmpty();
}

function onMidi(ev) {
  flashActivity();
  if (state.paused) return;
  appendEvent(decode(ev.data));
}

async function start() {
  if (!navigator.requestMIDIAccess) {
    setStatus('navegador sem Web MIDI', 'error');
    selectEl.replaceChildren(new Option('— navegador sem Web MIDI —', ''));
    selectEl.disabled = true;
    renderEmpty();
    return;
  }
  try {
    state.midi = await navigator.requestMIDIAccess({ sysex: false });
    state.midi.onstatechange = () => refreshInputs();
    refreshInputs();
  } catch (err) {
    state.midiDenied = true;
    setStatus('permissão MIDI negada', 'error');
    selectEl.replaceChildren(new Option('— acesso MIDI negado —', ''));
    selectEl.disabled = true;
    renderEmpty();
    console.error(err);
  }
}

// ─── Barra de ações ───────────────────────────────────────────────
selectEl.addEventListener('change', () => selectInput(selectEl.value));

function setPauseButton() {
  btnPause.replaceChildren(icon(state.paused ? 'i-play' : 'i-pause'),
    el('span', null, state.paused ? 'RETOMAR' : 'PAUSAR'));
  btnPause.classList.toggle('is-active', state.paused);
  btnPause.setAttribute('aria-pressed', String(state.paused));
}
btnPause.addEventListener('click', () => {
  state.paused = !state.paused;
  setPauseButton();
  statusForInput();
});

btnClear.addEventListener('click', clearEvents);

function lineFor(ev) {
  const d = ev.d;
  const on = state.names.enabled;
  const nm = on ? resolveName(d).text : '';
  const vl = on ? valueLabelFor(d, pedalForChannel(d.ch)) : '';
  const name = nm ? ` (${nm})` : '';
  let body;
  if (d.kind === 'cc') body = `CC ${d.num}${name} = ${d.val}${vl ? ` [${vl}]` : ''} · CH ${d.ch}`;
  else if (d.kind === 'pc') body = `PC ${d.pc}${name} · CH ${d.ch}`;
  else if (d.kind === 'note' || d.kind === 'note-off' || d.kind === 'at') {
    body = `${d.label} ${d.noteName} (${d.num})${name} = ${d.val} · CH ${d.ch}`;
  } else if (d.kind === 'pb') body = `PITCH-B ${d.val > 0 ? '+' : ''}${d.val} · CH ${d.ch}`;
  else if (d.kind === 'cp') body = `CH-PRESS ${d.val} · CH ${d.ch}`;
  else body = `${d.label} ${d.kind === 'sysex' ? d.desc + ' ' : ''}[${d.raw}]`;
  const time = state.opt.time ? ev.time + '  ' : '';
  return time + body + (ev.count > 1 ? ` ×${ev.count}` : '');
}

async function copyText(txt) {
  try {
    await navigator.clipboard.writeText(txt);
    return true;
  } catch (_) {
    // file:// em alguns navegadores não expõe a Clipboard API.
    const ta = el('textarea');
    ta.value = txt;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
    ta.remove();
    return ok;
  }
}
let copyTimer = 0;
btnCopy.addEventListener('click', async () => {
  const visible = state.events.filter(passesFilter);
  if (!visible.length) return;
  const ok = await copyText(visible.map(lineFor).join('\n'));
  clearTimeout(copyTimer);
  btnCopy.replaceChildren(icon(ok ? 'i-check' : 'i-x'), el('span', null, ok ? 'COPIADO' : 'FALHOU'));
  btnCopy.classList.toggle('is-done', ok);
  copyTimer = setTimeout(() => {
    btnCopy.replaceChildren(icon('i-copy'), el('span', null, 'COPIAR'));
    btnCopy.classList.remove('is-done');
  }, 1400);
});

// ─── Card NOMES AMIGÁVEIS ─────────────────────────────────────────
// Rótulo curto no seletor (a coluna é estreita) e por extenso pra leitor de tela.
function channelShort(ch) { return ch === 0 ? 'Todos' : `CH ${ch}`; }
function channelLabel(ch) { return ch === 0 ? 'todos os canais' : `canal ${ch}`; }

function pedalSelect(current) {
  const sel = el('select', 'mon-select mon-map-pedal');
  sel.setAttribute('aria-label', 'Pedal');
  sel.appendChild(new Option('— escolha o pedal —', ''));
  for (const g of DATA.groups) {
    const og = document.createElement('optgroup');
    og.label = g.brand;
    for (const i of g.items) og.appendChild(new Option(DATA.pedals[i].name, String(i)));
    sel.appendChild(og);
  }
  sel.value = current == null ? '' : String(current);
  return sel;
}

function renderMap() {
  mapEl.replaceChildren();
  if (!DATA) {
    const n = el('div', 'mon-notice');
    n.append('Lista de pedais não encontrada. Rode ');
    n.appendChild(el('code', null, 'node Site/scripts/monitor_pedals.mjs'));
    n.append(' na raiz do projeto para gerar o pedal_data.js. Os nomes seus funcionam mesmo assim.');
    mapEl.appendChild(n);
    mapAddBtn.disabled = true;
    return;
  }
  const used = new Set(state.names.map.map((m) => m.ch));
  state.names.map.forEach((m, idx) => {
    const row = el('div', 'mon-map-row' + (m.pedal == null ? ' is-idle' : ''));
    const chSel = el('select', 'mon-select');
    chSel.setAttribute('aria-label', 'Canal');
    for (let ch = 0; ch <= CHANNELS; ch++) {
      const o = new Option(channelShort(ch), String(ch));
      o.disabled = ch !== m.ch && used.has(ch);
      chSel.appendChild(o);
    }
    chSel.value = String(m.ch);
    chSel.addEventListener('change', () => {
      m.ch = Number(chSel.value);
      onNamesChanged(true);
    });
    const pSel = pedalSelect(m.pedal);
    pSel.addEventListener('change', () => {
      m.pedal = pSel.value === '' ? null : Number(pSel.value);
      onNamesChanged(true);
    });
    const del = el('button', 'mon-icon-btn');
    del.type = 'button';
    del.title = 'Remover';
    del.setAttribute('aria-label', `Remover o pedal de ${channelLabel(m.ch)}`);
    del.appendChild(icon('i-x'));
    del.addEventListener('click', () => {
      state.names.map.splice(idx, 1);
      onNamesChanged(true);
    });
    row.append(chSel, pSel, del);
    mapEl.appendChild(row);
  });
  mapAddBtn.disabled = used.size > CHANNELS;
}

function onNamesChanged(rerenderMap) {
  savePrefs();
  if (rerenderMap) renderMap();
  refreshAllNames();
}

mapAddBtn.addEventListener('click', () => {
  if (!DATA) return;
  const used = new Set(state.names.map.map((m) => m.ch));
  let ch = 0;
  while (used.has(ch) && ch <= CHANNELS) ch++;
  if (ch > CHANNELS) return;
  state.names.map.push({ ch, pedal: null });
  onNamesChanged(true);
  const sel = mapEl.querySelector('.mon-map-row:last-child .mon-map-pedal');
  if (sel) sel.focus();
});

namesEnabledEl.addEventListener('change', () => {
  state.names.enabled = namesEnabledEl.checked;
  namesCard.classList.toggle('is-off', !state.names.enabled);
  onNamesChanged(false);
});

// Lista de nomes do usuário: cada nome é um campo editável na hora.
const KIND_ORDER = { cc: 0, pc: 1, note: 2 };
function parseKey(k) {
  const [kind, ch, num] = k.split(':');
  return { kind, ch: Number(ch), num: Number(num) };
}
function keyTitle(p) {
  if (p.kind === 'cc') return `CC ${p.num}`;
  if (p.kind === 'pc') return `PC ${p.num}`;
  return `${noteName(p.num)} · ${p.num}`;
}
function renderCustomList() {
  const keys = Object.keys(state.names.custom).sort((a, b) => {
    const pa = parseKey(a), pb = parseKey(b);
    return pa.ch - pb.ch || KIND_ORDER[pa.kind] - KIND_ORDER[pb.kind] || pa.num - pb.num;
  });
  customCountEl.textContent = keys.length ? String(keys.length) : '';
  customListEl.replaceChildren();
  for (const k of keys) {
    const p = parseKey(k);
    const row = el('div', 'mon-custom-row');
    const label = el('div', 'mon-custom-key');
    label.appendChild(el('b', null, keyTitle(p)));
    label.appendChild(el('span', null, `CANAL ${p.ch}`));
    const input = el('input', 'mon-input mon-input-sm');
    input.type = 'text';
    input.maxLength = NAME_MAX;
    input.value = state.names.custom[k];
    input.setAttribute('aria-label', `Nome de ${keyTitle(p)} no canal ${p.ch}`);
    input.addEventListener('change', () => setCustomName(k, input.value, ''));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
    const del = el('button', 'mon-icon-btn');
    del.type = 'button';
    del.title = 'Apagar este nome';
    del.setAttribute('aria-label', `Apagar o nome de ${keyTitle(p)} no canal ${p.ch}`);
    del.appendChild(icon('i-x'));
    del.addEventListener('click', () => setCustomName(k, '', ''));
    row.append(label, input, del);
    customListEl.appendChild(row);
  }
}

const cfCh = $('#cf-ch');
for (let ch = 1; ch <= CHANNELS; ch++) cfCh.appendChild(new Option(`CH ${ch}`, String(ch)));
customForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const kind = $('#cf-type').value;
  const numEl = $('#cf-num');
  const nameEl = $('#cf-name');
  const num = Number(numEl.value);
  if (numEl.value === '' || !Number.isInteger(num) || num < 0 || num > 127) {
    numEl.focus();
    numEl.select();
    return;
  }
  if (!nameEl.value.trim()) { nameEl.focus(); return; }
  setCustomName(`${kind}:${cfCh.value}:${num}`, nameEl.value, '');
  nameEl.value = '';
  numEl.value = '';
  numEl.focus();
});

// ─── Opções ───────────────────────────────────────────────────────
function bindToggle(id, key, after) {
  const input = $(id);
  input.checked = !!state.opt[key];
  input.addEventListener('change', () => {
    state.opt[key] = input.checked;
    savePrefs();
    if (after) after();
  });
}
bindToggle('#opt-clock', 'clock');
bindToggle('#opt-active', 'active');
bindToggle('#opt-collapse', 'collapse');
bindToggle('#opt-autoscroll', 'autoscroll', () => { if (state.opt.autoscroll) { state.following = true; scheduleScroll(); } });
bindToggle('#opt-autoclear', 'autoclear');
bindToggle('#opt-time', 'time', () => eventsEl.classList.toggle('no-time', !state.opt.time));

const maxEl = $('#opt-max');
maxEl.addEventListener('change', () => {
  state.opt.max = clampMax(maxEl.value);
  maxEl.value = state.opt.max;
  savePrefs();
  while (state.events.length > state.opt.max) {
    const old = state.events.shift();
    if (old.el) old.el.remove();
  }
  if (!eventsEl.firstElementChild) renderEmpty();
});

// ─── Início ───────────────────────────────────────────────────────
maxEl.value = state.opt.max;
eventsEl.classList.toggle('no-time', !state.opt.time);
namesEnabledEl.checked = state.names.enabled;
namesCard.classList.toggle('is-off', !state.names.enabled);

buildChannelStrip();
renderMap();
renderCustomList();
setPauseButton();
updateStats();
renderEmpty();
start();
