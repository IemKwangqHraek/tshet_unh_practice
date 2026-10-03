import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { isHan } from '../src/polyhedron.js';
import { inspectToken, parseImport, exportDocument, suggestions } from '../src/corpus.js';
import { reviewEntries, reviewView } from '../src/views.js';
import { reviewShijingRhymes, rewindShijingRhymeReview, validateShijingRhymeEvidence } from '../scripts/shijing-rhyme-review.mjs';
import rules from '../scripts/shijing-rhyme-review.json' with { type: 'json' };

const json = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const { documents } = await json('../public/corpora/shijing.json');
const byId = new Map(documents.map(d => [d.id, d]));
const han = doc => doc.tokens.filter(t => isHan(t.char));

test('rhyme review selects 18 scoped occurrences, preserves all bodies and retains 12 unresolved cases', () => {
  assert.equal(rules.cases.length, 30);
  assert.equal(rules.cases.filter(r => r.action === 'select').length, 18);
  let beforePending = 0, afterPending = 0;
  for (const doc of documents) {
    const previous = rewindShijingRhymeReview(doc);
    assert.equal(previous.tokens.map(t => t.char).join(''), doc.tokens.map(t => t.char).join(''));
    beforePending += han(previous).filter(t => inspectToken(t).status !== 'ready').length;
    afterPending += han(doc).filter(t => inspectToken(t).status !== 'ready').length;
    assert.deepEqual(reviewShijingRhymes(doc), doc);
    const [roundTrip] = parseImport(JSON.stringify(exportDocument(parseImport(JSON.stringify(doc), 'json')[0])), 'json');
    assert.deepEqual(roundTrip.provenance, doc.provenance);
  }
  assert.equal(beforePending, 651);
  assert.equal(afterPending, 633);
  for (const rule of rules.cases) {
    const doc = byId.get(rule.id), token = han(doc)[rule.index], before = han(rewindShijingRhymeReview(doc))[rule.index];
    assert.equal(before.char, rule.char);
    assert.equal(before.position, undefined);
    assert.deepEqual(before.positions, rule.sourcePositions);
    assert.ok(rule.sourcePositions.every(position => token.positions.includes(position)));
    assert.equal(inspectToken(token).status === 'ready', rule.action === 'select');
    if (rule.position) { assert.equal(token.position, rule.position); assert.equal(token.confirmed, true); }
    assert.equal(doc.provenance.pendingReadings.some(p => p.index === rule.index), rule.action === 'retain');
  }
});

test('attested missing readings are kept separate from PBOC model outputs', () => {
  const jie = han(byId.get('shijing-149'))[6];
  assert.equal(jie.position, '溪開三B仙入');
  assert.ok(jie.positions.includes('溪開三B仙入'));
  assert.ok(!suggestions(jie).some(r => r.position === '溪開三C元入'));
  for (const i of [34, 35]) {
    const tuo = han(byId.get('shijing-023'))[i];
    assert.equal(tuo.position, undefined);
    assert.ok(suggestions(tuo).some(r => r.position === '透合一泰去'));
  }
  for (const i of [4, 5]) {
    const huan = han(byId.get('shijing-095'))[i];
    assert.equal(huan.position, undefined);
    assert.ok(!huan.positions.includes('曉合一寒平'));
  }
  // This added reading is selected from the verse's ordinary fanqie, not
  // Zhu's separate rhyme adjustment 疾各反.
  assert.equal(han(byId.get('shijing-290'))[3].position, '莊開二庚入');
  // Both pillow readings and both vomit readings have the same sense in the
  // early rhyme books. A single model row must not silently select a tone.
  for (const rule of rules.cases.filter(r => ['枕', '吐', '濟', '復'].includes(r.char))) {
    assert.equal(han(byId.get(rule.id))[rule.index].position, undefined);
  }
});

test('current rhyme evidence is visible per token and survives candidate additions', () => {
  const [doc] = parseImport(JSON.stringify(byId.get('shijing-149')), 'json');
  const entry = reviewEntries(doc, 'polyphonic', '偈')[0];
  assert.ok(entry.evidence.some(n => n.rhyme?.words.join('—') === '發—偈—怛'));
  const html = reviewView(doc, 'polyphonic', 0, [doc], '偈');
  for (const text of ['章內押韻覆核', 'PBOC 擬音對照', '溪開三B仙入', '溪開三C元入', '模型推導', '並非韻書實收', '查看原文']) assert.ok(html.includes(text), text);
  const [tuoDoc] = parseImport(JSON.stringify(byId.get('shijing-023')), 'json');
  const tuo = reviewEntries(tuoDoc, 'pending', '脫')[0];
  assert.deepEqual(tuo.originalPositions, ['定合一寒入', '透合一寒入']);
  assert.deepEqual(tuo.candidates.find(r => r.position === '透合一泰去').origins, ['supplement']);
  assert.ok(reviewView(tuoDoc, 'pending', 0, [tuoDoc], '脫').includes('古注補充'));
});

test('fixed-source citations, model rows and occurrence guards reject changed evidence', async () => {
  const manifest = await json('../scripts/corpus-sources.json');
  const names = new Set(['pboc-base.json.gz', 'pboc-extra.json.gz', 'qieyun-wang3.csv', 'guangyun.csv', ...rules.cases.flatMap(r => r.references.map(ref => ref.file))]);
  const files = Object.fromEntries(await Promise.all(manifest.filter(s => names.has(s.file)).map(async source => {
    const bytes = await readFile(new URL(`../.cache/corpus-sources/${source.file}`, import.meta.url));
    return [source.file, (source.file.endsWith('.gz') ? gunzipSync(bytes) : bytes).toString('utf8')];
  })));
  validateShijingRhymeEvidence(files);
  const badModel = structuredClone(rules); badModel.cases[0].pboc[0].derivedMc = '曉合一寒平';
  assert.throws(() => validateShijingRhymeEvidence(files, badModel), /固定行已變/);
  const badQuote = structuredClone(rules); badQuote.cases[0].references[0].quote += '引文不存在';
  assert.throws(() => validateShijingRhymeEvidence(files, badQuote), /引文失效/);
  const badText = structuredClone(rewindShijingRhymeReview(byId.get('shijing-023'))); badText.tokens[0].char = '訛';
  assert.throws(() => reviewShijingRhymes(badText), /正文已變/);
  const badSelection = structuredClone(byId.get('shijing-149')); han(badSelection)[6].position = '溪開三C元入';
  assert.throws(() => reviewShijingRhymes(badSelection), /覆核後讀音已變/);
  const alteredReviewedText = structuredClone(byId.get('shijing-072')); han(alteredReviewedText)[26].char = '死';
  assert.throws(() => reviewShijingRhymes(alteredReviewedText), /正文已變/);
  for (const patch of [{ skip: true }, { audit: [] }]) {
    const changed = structuredClone(byId.get('shijing-072')); Object.assign(han(changed)[26], patch);
    assert.throws(() => reviewShijingRhymes(changed), /覆核後讀音已變/);
  }
});
