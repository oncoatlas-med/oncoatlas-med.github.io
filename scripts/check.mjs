import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { Script, runInNewContext } from 'node:vm';

const file = name => new URL('../' + name, import.meta.url);
const read = name => readFileSync(file(name), 'utf8');
execFileSync(process.execPath, [file('scripts/build.mjs').pathname, '--check']);

const cards = JSON.parse(read('cards.json'));
const additionalRegimens = JSON.parse(read('regimens.json'));
const staging = JSON.parse(read('staging.json'));
const stagingIds = new Set(staging.entries.map(entry => entry.id));
assert.equal(stagingIds.size, staging.entries.length);
const stagedCards = new Set();
for (const entry of staging.entries) {
  for (const key of ['title', 'edition', 't', 'n', 'm', 'groups']) assert.ok(entry[key]?.trim(), entry.id + ' missing ' + key);
  assert.equal(new URL(entry.url).protocol, 'https:');
  assert.ok(entry.cards.length);
  entry.cards.forEach(id => stagedCards.add(id));
  (entry.related ?? []).forEach(id => assert.ok(stagingIds.has(id), entry.id + ' invalid related entry'));
}
for (const id of Object.keys(staging.other)) {
  assert.ok(!stagedCards.has(id), id + ' appears in both staging indexes');
  stagedCards.add(id);
}
assert.deepEqual([...stagedCards].sort(), cards.map(card => card.id));
const stages = ['I', 'II', 'III', 'IV'];
const ids = cards.map(c => c.id);
const contextualCards = ['c025', 'c029', 'c030', 'c031', 'c045', 'c046', 'c050', 'c056'];
assert.deepEqual(ids, Array.from({length: 56}, (_, i) => 'c' + String(i + 1).padStart(3, '0')));
assert.equal(new Set(cards.map(c => c.number)).size, 56);
for (const card of cards) {
  assert.ok(Array.isArray(card.icd10) && card.icd10.length, card.id + ' missing ICD-10 codes');
  assert.equal(new Set(card.icd10).size, card.icd10.length, card.id + ' duplicate ICD-10 code');
  for (const code of card.icd10) assert.match(code, /^C\d{2}(?:\.\d)?$/, card.id + ' invalid ICD-10 code');

  for (const field of ['title', 'group', 'origin', 'location', 'molecular', 'diagnostics', 'markers', ...(contextualCards.includes(card.id) ? [] : card.id === 'c014' ? stages.slice(0, 3) : stages)]) {
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
    rows: DATA.map(c => (NON_TNM_CARD_INFO[c.id] ? ['I'] : CARD_STAGES[c.id] ?? STAGES).map(stage => ({
      id: c.id, stage, protocols: regimensFor(c.id, stage)
    })))
  })
`, {window:{ONCO_CARDS:cards, ONCO_REGIMENS:additionalRegimens, addEventListener() {}}});
assert.deepEqual([...data.nonTnm].sort(), contextualCards);
for (const [id, groups] of Object.entries(additionalRegimens)) {
  for (const [context, regimens] of Object.entries(groups)) {
    assert.ok(data.nonTnm.includes(id) ? context === 'all' : stages.includes(context), id + ' invalid context');
    for (const protocol of regimens) {
      assert.match(protocol.checkedOn, /^\d{4}-\d{2}-\d{2}$/, id + ' invalid review date format');
      const reviewDate = new Date(protocol.checkedOn + 'T00:00:00Z');
      assert.ok(!Number.isNaN(reviewDate.getTime()) && reviewDate.toISOString().slice(0, 10) === protocol.checkedOn,
        id + ' impossible review date');
      assert.ok(reviewDate.getTime() <= Date.now(), id + ' future review date');
      for (const field of ['sourceVersion', 'safety', 'notes', 'regimen', 'cycle']) {
        assert.ok(typeof protocol[field] === 'string' && protocol[field].trim(), id + ' missing ' + field);
      }
      assert.ok(Array.isArray(protocol.drugs) && protocol.drugs.length > 0 &&
        protocol.drugs.every(drug => typeof drug === 'string' && drug.trim()), id + ' missing drug instructions');
      assert.equal(new URL(protocol.url).protocol, 'https:', id + ' invalid protocol URL');
      if (protocol.reference !== undefined) {
        assert.ok(Array.isArray(protocol.reference) && protocol.reference.length === 2 &&
          typeof protocol.reference[0] === 'string' && protocol.reference[0].trim(),
          id + ' invalid reference metadata');
        assert.equal(new URL(protocol.reference[1]).protocol, 'https:', id + ' invalid reference URL');
      }
    }
  }
}
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
assert.equal(source('c014').length, 3);
assert.ok(source('c038')[2].protocols.some(p => p.url.endsWith('/3674')));
assert.ok(!source('c038')[3].protocols.some(p => p.url.endsWith('/3674')));
assert.ok(source('c034')[1].protocols[0].url.endsWith('/82'));
assert.ok(source('c035')[3].protocols[0].regimen.includes('M0'));
console.log(`${cards.length} cards, ${data.rows.flat().length} available treatment views, ${populated} with protocols, ${protocols.size} distinct displayed regimen titles.`);
if (process.argv[2] === '--inventory') {
  for (const rows of data.rows) {
    const entries = data.nonTnm.includes(rows[0].id) ? [rows[0]] : rows;
    for (const row of entries) for (const protocol of row.protocols) {
      console.log([row.id, data.nonTnm.includes(row.id) ? 'Клиническая ситуация' : row.stage, protocol.regimen, protocol.url].join('\t'));
    }
  }
}
