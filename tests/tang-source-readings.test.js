import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { documentStatus, inspectToken } from '../src/corpus.js';
import { convertReading, isHan } from '../src/polyhedron.js';
import { reviewTangSourceReadings, rewindTangSourceReadings, validateTangSourceEvidence } from '../scripts/tang-source-readings.mjs';
import rules from '../scripts/tang-source-readings.json' with { type: 'json' };
import editionSnapshot from '../scripts/snapshots/tang-dongli.json' with { type: 'json' };

const documents = new Map(JSON.parse(readFileSync(new URL('../public/corpora/tang.json', import.meta.url))).documents
  .map(document => [document.id, rewindTangSourceReadings(document)]));
const han = document => document.tokens.filter(token => isHan(token.char));

test('the full 194-position review has a disjoint, complete selected/deferred partition', () => {
  const keys = [...rules.cases, ...rules.deferred].map(rule => `${rule.id}:${rule.index}`);
  assert.equal(keys.length, 194);
  assert.equal(new Set(keys).size, 194);
  assert.equal(rules.cases.length, 152);
  assert.equal(rules.deferred.length, 42);
  let remaining = 0;
  for (const document of documents.values()) remaining += documentStatus(reviewTangSourceReadings(document)).pending;
  assert.equal(remaining, 42);
  for (const rule of rules.cases) {
    const token = han(reviewTangSourceReadings(documents.get(rule.id)))[rule.index];
    assert.equal(token.position, rule.position, `${rule.id}:${rule.index}`);
    assert.equal(inspectToken(token).status, 'ready');
  }
});

test('review preserves every original spelling/candidate and can restore the entire input document', () => {
  for (const document of documents.values()) {
    const before = structuredClone(document);
    const after = reviewTangSourceReadings(document);
    assert.deepEqual(document, before, `mutated input: ${document.id}`);
    assert.deepEqual(after.tokens.map(token => [token.sourceReading, token.positions]),
      document.tokens.map(token => [token.sourceReading, token.positions]), document.id);
    assert.equal(after.provenance.originalRomanization, document.provenance.originalRomanization);
    assert.deepEqual(rewindTangSourceReadings(after), document, document.id);
    assert.equal(reviewTangSourceReadings(after), after, `not idempotent: ${document.id}`);
  }
});

test('text changes are scoped to 69 cited occurrences, including a complete paired word reversal', () => {
  const changes = rules.cases.filter(rule => rule.char !== rule.targetChar);
  assert.equal(changes.length, 69);
  for (const document of documents.values()) {
    const before = han(document);
    const after = han(reviewTangSourceReadings(document));
    const expected = new Map(changes.filter(rule => rule.id === document.id).map(rule => [rule.index, rule.targetChar]));
    assert.deepEqual(after.map(token => token.char), before.map((token, index) => expected.get(index) || token.char));
  }
  const after = han(reviewTangSourceReadings(documents.get('poly-tang-65')));
  assert.deepEqual(after.slice(655, 657).map(token => token.char), ['迤', '邐']);
  const dream = han(reviewTangSourceReadings(documents.get('poly-tang-8')));
  assert.equal(dream[43].char, '林');
  assert.equal(dream[43].sourceReading, 'lim');
});

test('source readings can be used without dictionary coverage, including newly enumerated legal positions', () => {
  const insert = han(reviewTangSourceReadings(documents.get('poly-tang-7')))[103];
  assert.equal(insert.char, '插');
  assert.equal(insert.sourceReading, 'chret');
  assert.equal(insert.position, '初開二山入');
  const expected = {
    zsjye: '船合三支平', cjyih: '章合三脂去', ginx: '羣開三B真上',
    ngrang: '疑開二庚平', ghruaix: '匣合二皆上', zsinh: '邪開三真去',
  };
  const recovered = rules.cases.filter(rule => rule.sourcePositions.length === 0);
  assert.equal(recovered.length, 10);
  for (const rule of recovered) {
    assert.equal(rule.position, expected[rule.sourceReading]);
    assert.deepEqual(convertReading(rule.char, rule.sourceReading, { includeUnattestedPositions: true }).positions, [rule.position]);
    assert.equal(han(reviewTangSourceReadings(documents.get(rule.id)))[rule.index].sourceReading, rule.sourceReading);
  }
});

test('the user-requested 將 reading overrides only 將進酒 and records the unmodified source', () => {
  const after = han(reviewTangSourceReadings(documents.get('poly-tang-77')));
  assert.equal(after[82].position, '精開三陽平');
  assert.equal(after[82].sourceReading, 'chiang');
  assert.deepEqual(after[82].positions, ['清開三陽平']);
  assert.equal(after[82].audit.at(-1).action, 'user-reading-override');
  assert.equal(after[82].audit.at(-1).originalSourceReading, 'chiang');
  assert.ok(after[82].audit.at(-1).references.some(reference => reference.kind === 'user-instruction'));
  assert.equal(after[164].sourceReading, 'ciang');
  assert.deepEqual(after[164], han(documents.get('poly-tang-77'))[164]);
  assert.equal(inspectToken(after[164]).reading.position, '精開三陽平');
});

test('uncertain source readings and unresolved pairings stay pending with per-document reasons', () => {
  assert.equal(rules.deferred.filter(rule => /[/?]/.test(rule.sourceReading)).length, 8);
  assert.equal(rules.deferred.filter(rule => rule.reason === 'source-spelling-unconverted').length, 8);
  for (const rule of rules.deferred) {
    const before = documents.get(rule.id);
    const after = reviewTangSourceReadings(before);
    assert.deepEqual(han(after)[rule.index], han(before)[rule.index]);
    assert.notEqual(inspectToken(han(after)[rule.index]).status, 'ready');
    assert.ok(after.provenance.tangSourceReadings.deferred.some(item => item.index === rule.index && item.basis === rule.basis));
  }
  const id = rules.deferred.find(rule => !rules.cases.some(selected => selected.id === rule.id)).id;
  assert.equal(reviewTangSourceReadings(documents.get(id)).provenance.tangSourceReadings.notes.length, 0);
});

test('changed source/text/candidates and stale or altered review metadata are rejected', () => {
  for (const mutate of [
    document => { han(document)[82].char = '異'; },
    document => { han(document)[82].sourceReading = 'ciang'; },
    document => { han(document)[82].positions = ['精開三陽平']; },
    document => { document.provenance.originalRomanization += ' '; },
  ]) {
    const changed = structuredClone(documents.get('poly-tang-77'));
    mutate(changed);
    assert.throws(() => reviewTangSourceReadings(changed), /已變/);
  }
  const stale = structuredClone(reviewTangSourceReadings(documents.get('poly-tang-77')));
  stale.provenance.tangSourceReadings.rulesSha256 = 'obsolete';
  assert.throws(() => reviewTangSourceReadings(stale), /規則版本過期/);
  const changed = structuredClone(reviewTangSourceReadings(documents.get('poly-tang-77')));
  han(changed)[82].confirmed = false;
  assert.throws(() => reviewTangSourceReadings(changed), /選讀已變/);
});

const cachedSources = ['poly-tang.txt', 'rime-tang.txt', 'tang-original.json'];
const cachePath = file => new URL(`../.cache/corpus-sources/${file}`, import.meta.url);
test('all edition references validate against fixed build inputs, including removed editorial note markers',
  { skip: !cachedSources.every(file => existsSync(cachePath(file))) }, () => {
    const files = Object.fromEntries(cachedSources.map(file => [file, readFileSync(cachePath(file), 'utf8')]));
    validateTangSourceEvidence(files, editionSnapshot);
    const changed = structuredClone(editionSnapshot);
    const reference = rules.cases.flatMap(rule => rule.references)
      .find(reference => reference.kind === 'fixed-poem-text' && reference.file === 'tang-dongli.json');
    changed.documents[reference.recordIndex].paragraphs[0] += '異';
    assert.throws(() => validateTangSourceEvidence(files, changed), /固定正文證據已變/);
    assert.throws(() => validateTangSourceEvidence({ ...files, 'poly-tang.txt': '\n' + files['poly-tang.txt'] }, editionSnapshot), /原注引文已變/);
  });
