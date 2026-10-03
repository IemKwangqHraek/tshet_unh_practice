import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { reviewCorpusAlignment } from '../scripts/corpus-alignment-review.mjs';
import { reviewConfirmedHeadwords } from '../scripts/corpus-confirmed-headwords.mjs';
import rules from '../scripts/corpus-confirmed-headwords.json' with { type: 'json' };
import { rewindTangSourceReadings } from '../scripts/tang-source-readings.mjs';

// Rewind only this module's own audit entries so the tests exercise selection
// even after build:corpora has already generated confirmed public documents.
function beforeHeadwordReview(document) {
  const source = structuredClone(document);
  delete source.provenance.confirmedHeadwords;
  for (const token of source.tokens) {
    if (token.audit?.at(-1)?.action !== 'source-and-confirmed-headword') continue;
    delete token.position;
    delete token.confirmed;
    token.audit = token.audit.filter(item => item.action !== 'source-and-confirmed-headword');
    if (!token.audit.length) delete token.audit;
  }
  return source;
}

const documents = new Map(['classics', 'analects', 'tang'].flatMap(pack =>
  JSON.parse(readFileSync(new URL(`../public/corpora/${pack}.json`, import.meta.url))).documents
    .map(document => [document.id, beforeHeadwordReview(reviewCorpusAlignment(rewindTangSourceReadings(document)))])));
const han = document => document.tokens.filter(token => /\p{Script=Han}/u.test(token.char));

test('reviewed occurrences retain the original text, source readings and candidates', () => {
  const reviewed = new Map();
  for (const [id, document] of documents) {
    const before = structuredClone(document);
    const after = reviewConfirmedHeadwords(document);
    assert.deepEqual(document, before, `input mutation: ${id}`);
    assert.deepEqual(after.tokens.map(t => [t.char, t.sourceReading, t.positions]), document.tokens.map(t => [t.char, t.sourceReading, t.positions]), id);
    assert.deepEqual(reviewConfirmedHeadwords(after), after, `not idempotent: ${id}`);
    reviewed.set(id, after);
  }
  for (const rule of rules.cases) {
    const token = han(reviewed.get(rule.id))[rule.index];
    assert.equal(token.position, rule.position, `${rule.id}:${rule.index}`);
    assert.equal(token.confirmed, true);
    assert.ok(token.audit.some(item => item.action === 'source-and-confirmed-headword'));
  }
});

test('specific old-commentary alternatives and version mismatches stay unresolved', () => {
  for (const [id, index] of [
    ['poly-analects-17', 15], ['poly-analects-169', 4], ['poly-analects-180', 19],
    ['poly-analects-251', 101], ['poly-analects-507', 18], ['poly-tang-50', 44], ['poly-tang-66', 182],
    ['poly-tang-73', 33], ['poly-analects-489', 41],
  ]) {
    const before = han(documents.get(id))[index];
    const after = han(reviewConfirmedHeadwords(documents.get(id)))[index];
    assert.deepEqual(after, before, `${id}:${index}`);
    assert.ok(!after.position && !after.confirmed, `${id}:${index}`);
  }
});

test('restored alignment distinguishes two 期 readings in the same chapter', () => {
  const after = han(reviewConfirmedHeadwords(documents.get('poly-analects-489')));
  assert.equal(after[7].position, '見開三C之平');
  assert.equal(after[41].position || '', '');
  for (const index of [54, 59, 87]) assert.equal(after[index].position, '日開三魚上');
});

test('occurrence rules reject altered text, sound or context and do not apply to other documents', () => {
  const document = documents.get('poly-analects-33');
  const target = document.tokens.findIndex(t => t.char === '女');
  for (const mutate of [
    doc => { doc.tokens[target].char = '男'; },
    doc => { doc.tokens[target].sourceReading = 'njox/nriox'; },
    doc => { doc.tokens[target - 1].char = '異'; },
    doc => { doc.tokens[target].positions = ['日開三魚去']; },
  ]) {
    const changed = structuredClone(document);
    mutate(changed);
    assert.throws(() => reviewConfirmedHeadwords(changed), /已變/);
  }
  const unrelated = { ...document, id: 'user-document' };
  assert.equal(reviewConfirmedHeadwords(unrelated), unrelated);
});

test('stale review metadata is rejected instead of silently reused', () => {
  const changed = structuredClone(documents.get('poly-analects-33'));
  changed.provenance.confirmedHeadwords = { method: rules.method, rulesSha256: 'obsolete' };
  assert.throws(() => reviewConfirmedHeadwords(changed), /規則版本過期/);
});
