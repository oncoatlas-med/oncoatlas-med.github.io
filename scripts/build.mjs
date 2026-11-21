import { readFileSync, writeFileSync } from 'node:fs';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const index = read('index.html');
const cards = JSON.parse(read('cards.json'));
const application = read('app.js');
const stylesheet = read('style.css');

function replaceOnce(html, pattern, replacement) {
  if ([...html.matchAll(pattern)].length !== 1) throw new Error('Expected one HTML block: ' + pattern);
  return html.replace(pattern, () => replacement);
}

const dataScript = 'window.ONCO_CARDS=' + JSON.stringify(cards, null, 2).replaceAll('<', '\\u003c') + ';';
if (/<\/script/i.test(application) || /<\/style/i.test(stylesheet)) throw new Error('Embedded code contains a closing HTML tag');

let output = replaceOnce(index, /<style>[\s\S]*?<\/style>/gi, '<style>' + stylesheet + '</style>');
output = replaceOnce(output, /<script>window\.ONCO_CARDS=[\s\S]*?<\/script>/gi, '<script>' + dataScript + '</script>');
output = replaceOnce(output, /<script>const DATA=[\s\S]*?<\/script>/gi, '<script>' + application + '</script>');

if (process.argv.includes('--check')) {
  if (index !== output) throw new Error('Run node scripts/build.mjs to synchronize index.html');
} else {
  writeFileSync(new URL('../index.html', import.meta.url), output);
}
