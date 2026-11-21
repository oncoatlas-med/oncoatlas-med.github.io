import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Script, runInNewContext } from 'node:vm';

const file = name => new URL('../' + name, import.meta.url);
const read = name => readFileSync(file(name), 'utf8');
execFileSync(process.execPath, [file('scripts/build.mjs').pathname, '--check']);

const cards = JSON.parse(read('cards.json'));
const stages = ['I', 'II', 'III', 'IV'];
const ids = cards.map(c => c.id);
assert.deepEqual(ids, Array.from({length: 38}, (_, i) => 'c' + String(i + 1).padStart(3, '0')));
assert.equal(new Set(cards.map(c => c.number)).size, 38);
for (const card of cards) {
  for (const field of ['title', 'group', 'origin', 'location', 'molecular', 'diagnostics', 'markers', ...stages]) {
    assert.ok(typeof card[field] === 'string' && card[field].trim(), card.id + ' missing ' + field);
  }
}

const app = read('app.js');
new Script(app, {filename: 'app.js'});
const data = runInNewContext(app.replace(/\nstart\(\);\n$/, '\n') + `
  ({
    groups: [STAGE_PROTOCOLS, SURGERY_DETAILS, BREAST_TREATMENT, NEXT_TREATMENT, LUNG_TREATMENT,
      VERIFIED_TREATMENT_2026, AUDITED_10_REGIMENS, SECOND_PASS_REGIMENS, THIRD_PASS_REGIMENS,
      FOURTH_PASS_REGIMENS, FIFTH_PASS_REGIMENS, SIXTH_PASS_HEMATOLOGY, SEVENTH_PASS_REGIMENS,
      EIGHTH_PASS_REGIMENS, NINTH_PASS_REGIMENS, ADDITIONAL_REGIMENS, NON_TNM_CARD_INFO],
    nonTnm: Object.keys(NON_TNM_CARD_INFO),
    rows: DATA.map(c => STAGES.map(stage => ({
      id: c.id, stage, protocols: regimensFor(c.id, stage)
    })))
  })
`, {window:{ONCO_CARDS:cards, addEventListener() {}}});
assert.deepEqual([...data.nonTnm].sort(), ['c025','c029','c030','c031']);
for (const group of data.groups) {
  for (const id of Object.keys(group)) assert.ok(ids.includes(id), 'Unknown card in treatment data: ' + id);
}
const protocols = new Set();
let populated = 0;
for (const row of data.rows.flat()) {
  if (row.protocols.length) populated++;
  const seen = new Set();
  for (const protocol of row.protocols) {
    assert.ok(protocol.regimen && protocol.drugs.length && protocol.cycle && protocol.notes, row.id + ' incomplete regimen');
    assert.ok(protocol.drugs.every(drug => typeof drug === 'string' && drug.trim()), row.id + ' empty dose');
    assert.equal(new URL(protocol.url).protocol, 'https:', row.id + ' invalid source URL');
    assert.ok(!seen.has(protocol.regimen), row.id + ' duplicate regimen in ' + row.stage);
    seen.add(protocol.regimen);
    protocols.add(protocol.regimen);
  }
}
const source = id => data.rows.find(rows => rows[0].id === id);
assert.ok(source('c038')[2].protocols.some(p => p.url.endsWith('/3674')));
assert.ok(!source('c038')[3].protocols.some(p => p.url.endsWith('/3674')));
assert.ok(source('c034')[1].protocols[0].url.endsWith('/82'));
assert.ok(source('c035')[3].protocols[0].regimen.includes('M0'));
console.log(`38 cards, 152 card/stage data combinations, ${populated} with protocols, ${protocols.size} distinct displayed regimen titles.`);
if (process.argv[2] === '--inventory') {
  for (const rows of data.rows) {
    const entries = data.nonTnm.includes(rows[0].id) ? [rows[0]] : rows;
    for (const row of entries) for (const protocol of row.protocols) {
      console.log([row.id, data.nonTnm.includes(row.id) ? 'Клиническая ситуация' : row.stage, protocol.regimen, protocol.url].join('\t'));
    }
  }
}
