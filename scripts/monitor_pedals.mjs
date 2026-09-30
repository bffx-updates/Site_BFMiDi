// Gera `pedal_data.js` pro Monitor MIDI a partir do que já existe no webApp:
//   - a lista de pedais do MODO AMIGÁVEL (MATCH_MODE_OPTIONS / MATCH_MODE_PEDAL /
//     MATCH_MODE_BRANDS, lidos do próprio app.jsx — sem cópia à mão)
//   - PC_LABELS / CC_LABELS (webApp/pedal_labels.js)
//   - PEDAL_VALUE_LABELS (webApp/pedal_values.js) — nome do VALOR de alguns CCs
// Saída: Site/monitor-midi/pedal_data.js — a página do monitor mora na vitrine
// (bffx.com.br, cartão "Monitor MIDI" do painel Downloads) e é a ÚNICA cópia.
// A página também abre por file:// (duplo-clique), então NÃO pode importar
// módulos ES nem fazer fetch — tudo vira um script clássico `pedal_data.js`.
// Rodar (na raiz do projeto) sempre que entrar pedal novo no MODO AMIGÁVEL:
//   node Site/scripts/monitor_pedals.mjs
// Lê o webApp, que fica FORA do repo do site (pasta irmã do Site/).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));   // Site/scripts
const siteRoot = path.resolve(here, '..');                      // Site
const root = path.resolve(siteRoot, '..');                      // raiz do projeto
const webApp = path.join(root, 'webApp');
const outDir = path.join(siteRoot, 'monitor-midi');

// Recorta `const NAME = [ ... ];` do app.jsx e avalia o literal. As três
// tabelas terminam num `];` no início da linha; comentários dentro do array
// são JS válido e somem na avaliação.
const appSrc = fs.readFileSync(path.join(webApp, 'app.jsx'), 'utf8');
function extractArray(name) {
  const head = `const ${name} = [`;
  const start = appSrc.indexOf(head);
  if (start < 0) throw new Error(`${name} não encontrado no app.jsx`);
  const end = appSrc.indexOf('\n];', start);
  if (end < 0) throw new Error(`fim de ${name} não encontrado no app.jsx`);
  const body = appSrc.slice(start + head.length, end);
  return new Function(`return [${body}\n];`)();
}

const OPTIONS = extractArray('MATCH_MODE_OPTIONS');
const PEDAL = extractArray('MATCH_MODE_PEDAL');
const BRANDS = extractArray('MATCH_MODE_BRANDS');
if (OPTIONS.length !== PEDAL.length) {
  throw new Error(`MATCH_MODE_OPTIONS (${OPTIONS.length}) e MATCH_MODE_PEDAL ` +
    `(${PEDAL.length}) com tamanhos diferentes`);
}

const labels = await import(pathToFileURL(path.join(webApp, 'pedal_labels.js')).href);
const values = await import(pathToFileURL(path.join(webApp, 'pedal_values.js')).href);

const brandOf = {};
for (const [brand, idxs] of BRANDS) for (const i of idxs) brandOf[i] = brand;

// Mesmo corte do matchModeModelLabel do editor: 'Valeton GP-5' sob VALETON
// vira 'GP-5'. Onde a marca não é prefixo, o nome fica inteiro.
function modelLabel(full, brand) {
  if (!brand) return full;
  const up = full.toLocaleUpperCase('pt-BR');
  if (!up.startsWith(brand.toLocaleUpperCase('pt-BR'))) return full;
  return full.slice(brand.length).replace(/^[\s\-–—]+/, '') || full;
}

// Entram só os pedais com tabela de nomes. Fora: índice 0 (MULTIPLE MODE, não
// é aparelho) e USER 1/2/3 (os nomes deles moram no pedal, não aqui — no
// monitor quem faz esse papel são os nomes personalizados).
const pedals = {};
const pcUsed = new Set();
const ccUsed = new Set();
PEDAL.forEach((entry, i) => {
  if (!entry || entry.user) return;
  const pc = entry.pc && labels.PC_LABELS[entry.pc] ? entry.pc : null;
  const cc = entry.cc && labels.CC_LABELS[entry.cc] ? entry.cc : null;
  if (!pc && !cc) return;
  const brand = brandOf[i] || null;
  pedals[i] = { name: OPTIONS[i], model: modelLabel(OPTIONS[i], brand), brand, pc, cc };
  if (pc) pcUsed.add(pc);
  if (cc) ccUsed.add(cc);
});

// Grupos na ordem da lista do editor: marcas em ordem alfabética, modelos em
// ordem natural ('GP-5' < 'GP-50' < 'GP-150'), OUTROS por último.
const byModel = (a, b) => pedals[a].model.localeCompare(pedals[b].model, 'pt',
  { sensitivity: 'base', numeric: true });
const groups = BRANDS
  .map(([brand, idxs]) => ({ brand, items: idxs.filter((i) => pedals[i]).sort(byModel) }))
  .filter((g) => g.items.length)
  .sort((a, b) => a.brand.localeCompare(b.brand, 'pt', { sensitivity: 'base' }));
const others = Object.keys(pedals).map(Number).filter((i) => !brandOf[i]).sort(byModel);
if (others.length) groups.push({ brand: 'OUTROS', items: others });

const pick = (src, keys) => Object.fromEntries([...keys].sort().map((k) => [k, src[k]]));
const valueLabels = {};
for (const k of ccUsed) if (values.PEDAL_VALUE_LABELS[k]) valueLabels[k] = values.PEDAL_VALUE_LABELS[k];

const out = {
  pedals,
  groups,
  PC_LABELS: pick(labels.PC_LABELS, pcUsed),
  CC_LABELS: pick(labels.CC_LABELS, ccUsed),
  VALUE_LABELS: valueLabels,
};
const js = '// GERADO por Site/scripts/monitor_pedals.mjs — não editar à mão.\n' +
  'window.BF_MONITOR_DATA = ' + JSON.stringify(out) + ';\n';
fs.writeFileSync(path.join(outDir, 'pedal_data.js'), js);
console.log(`pedal_data.js: ${(js.length / 1024).toFixed(0)} KB, ` +
  `${Object.keys(pedals).length} pedais em ${groups.length} marcas, ` +
  `${pcUsed.size} tabelas PC, ${ccUsed.size} tabelas CC, ` +
  `${Object.keys(valueLabels).length} tabelas de valor`);
