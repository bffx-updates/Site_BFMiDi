/* Valida o conteúdo e copia apenas os arquivos públicos da vitrine. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'js/content.js'), 'utf8'), context);
for (const match of html.matchAll(/<script\s+src="(js\/[^"?#]+)"/g)) {
  new vm.Script(fs.readFileSync(path.join(root, match[1]), 'utf8'), { filename: match[1] });
}
const content = context.window.BF_CONTENT;
assert.equal(content.models.length, 4, 'A vitrine deve conter os quatro modelos.');
assert.equal(new Set(content.models.map(m => m.hash)).size, 4, 'Links dos modelos repetidos.');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(ids.length, new Set(ids).size, 'IDs repetidos no HTML.');
const sections = content.sub.items.concat(content.resources ? content.resources.items : []);
for (const section of sections) assert(ids.includes('panel-' + section.key));
let images = 0;
for (const model of content.models) {
  assert(model.specs.length && model.h1.length === 2 && model.switches > 0);
  const keys = [model.shot, ...model.bands.map(b => b.img)].filter(Boolean);
  for (const key of keys) for (const size of ['', '-sm']) {
    assert(fs.existsSync(path.join(root, 'assets', key + size + '.webp')), 'Foto ausente: ' + key + size);
    images++;
  }
}
for (const model of content.models) for (const key of model.ports || []) {
  assert(content.ports && content.ports[key], 'Porta desconhecida em ' + model.id + ': ' + key);
  assert(fs.existsSync(path.join(root, 'assets', content.ports[key].img + '.webp')), 'Ícone de porta ausente: ' + content.ports[key].img);
}
for (const match of html.matchAll(/(?:src|href)="((?:assets|css|js)\/[^"?#]+)"/g)) {
  assert(fs.existsSync(path.join(root, match[1])), 'Arquivo ausente: ' + match[1]);
}
const output = path.join(root, 'dist');
fs.mkdirSync(output, { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(output, 'index.html'));
for (const folder of ['assets', 'css', 'js', 'backup-view']) fs.cpSync(path.join(root, folder), path.join(output, folder), { recursive: true });
console.log('Validação concluída: quatro modelos, ' + sections.length + ' painéis, ' + images + ' imagens e referências locais válidas.');
console.log('Site estático preparado em dist/.');
