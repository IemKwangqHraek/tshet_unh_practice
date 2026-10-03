import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { reviewCorpusAlignment } from '../scripts/corpus-alignment-review.mjs';
import rules from '../scripts/corpus-alignment-review.json' with { type: 'json' };
import { convertReading, isHan, syllablesIn } from '../src/polyhedron.js';
import { documentStatus, inspectToken, parseImport, exportDocument } from '../src/corpus.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const originalAlignment = rule => ({ id: rule.id, title: rule.title,
  tokens: [...rule.originalText].map(char => ({ char })),
  provenance: { originalRomanization: rule.originalRomanization, alignmentError: rule.originalAlignmentError } });
const han = doc => doc.tokens.filter(token => isHan(token.char));
async function originalAnnotated(id) {
  const pack = id.startsWith('poly-analects-') ? 'analects' : 'tang';
  const raw = JSON.parse(await readFile(new URL(`../public/corpora/${pack}.json`, import.meta.url), 'utf8')).documents.find(d => d.id === id);
  const { corpusAlignmentReview, ...provenance } = raw.provenance;
  const tokens = raw.tokens.map(token => isHan(token.char) ? convertReading(token.char, token.sourceReading) : { char: token.char });
  // A subsequent verified edition may have already put this pair in source order.
  for (const rule of rules.orders.filter(r => r.id === id)) {
    const chars = tokens.filter(token => isHan(token.char));
    [...rule.chars].forEach((char, i) => Object.assign(chars[rule.index + i], convertReading(char, rule.sourceReadings[i])));
  }
  return { ...raw, tokens, provenance };
}

test('reviewed alignment consumes every source syllable once or explicitly records it as unpaired', () => {
  let restored = 0, missing = 0, total = 0;
  for (const rule of rules.alignment) {
    const input = originalAlignment(rule), snapshot = structuredClone(input);
    const result = reviewCorpusAlignment(input), metadata = result.provenance.corpusAlignmentReview.alignment;
    assert.deepEqual(input, snapshot);
    assert.equal(result.tokens.map(t => t.char).join(''), rule.originalText);
    assert.equal(result.provenance.originalRomanization, rule.originalRomanization);
    assert.equal(result.provenance.alignmentError, undefined);
    assert.equal(metadata.previousAlignmentError, rule.originalAlignmentError);
    const spellings = syllablesIn(rule.originalRomanization);
    const indexes = [...metadata.characterToSource.flat(), ...metadata.unpairedSourceIndexes].sort((a, b) => a - b);
    assert.deepEqual(indexes, spellings.map((_, index) => index));
    for (const [index, token] of han(result).entries()) {
      const sourceIndexes = metadata.characterToSource[index];
      if (!sourceIndexes.length) {
        assert.equal(token.sourceReading, undefined);
        assert.deepEqual(token.positions, []);
        assert.equal(inspectToken(token).status, 'missing');
      } else assert.equal(token.sourceReading, sourceIndexes.map(i => spellings[i]).join('/'));
    }
    restored += documentStatus(result).ready;
    missing += metadata.unpairedTextIndexes.length;
    total += han(result).length;
    assert.equal(reviewCorpusAlignment(result), result);
  }
  assert.equal(total, 819);
  assert.equal(missing, 13);
  assert.equal(restored, 791);
});

test('source gaps retain empty readings and do not shift the following phrase; extra source words are retained in metadata', () => {
  const rule = rules.alignment.find(r => r.id === 'poly-analects-195');
  const result = reviewCorpusAlignment(originalAlignment(rule)), chars = han(result);
  assert.equal(chars.slice(21, 25).map(t => t.char).join(''), '如臨深淵');
  assert.ok(chars.slice(21, 25).every(t => !t.sourceReading && !t.confirmed));
  assert.equal(chars[25].char, '如');
  assert.equal(chars[25].sourceReading, 'njo');
  assert.equal(chars[26].char, '履');
  assert.equal(chars[26].sourceReading, 'liix');
  const extraRule = rules.alignment.find(r => r.id === 'poly-analects-84');
  const extra = reviewCorpusAlignment(originalAlignment(extraRule));
  assert.deepEqual(extra.provenance.corpusAlignmentReview.alignment.unpairedSourceIndexes, [12]);
  assert.equal(han(extra)[12].sourceReading, 'siengx');
  assert.match(extra.provenance.originalRomanization, /nuaih ziih siengx/);
});

test('the alternate tone of 文 is preserved as two candidates and cannot become an automatic confirmed reading', () => {
  const rule = rules.alignment.find(r => r.id === 'poly-analects-513');
  const reviewed = reviewCorpusAlignment(originalAlignment(rule)), token = han(reviewed)[9];
  assert.equal(token.sourceReading, 'myon/myonh');
  assert.deepEqual(token.positions, ['明三C文平', '明三C文去']);
  assert.equal(token.confirmed, false);
  assert.equal(inspectToken(token).status, 'multiple');
  assert.equal(documentStatus(reviewed).ready, 9);
  const [reimported] = parseImport(JSON.stringify(exportDocument(reviewed)), 'json');
  assert.deepEqual(reimported.provenance, reviewed.provenance);
  for (const [index, original] of han(reviewed).entries()) {
    const imported = han(reimported)[index];
    for (const field of ['char', 'positions', 'sourceReading', 'conversion', 'audit']) assert.deepEqual(imported[field], original[field]);
  }
  assert.equal(inspectToken(han(reimported)[9]).status, 'multiple');
});

test('format correction is restricted to five reviewed tone markers and preserves original spellings and candidates', async () => {
  const seen = new Set();
  for (const rule of rules.formats) {
    if (seen.has(rule.id)) continue;
    seen.add(rule.id);
    const input = await originalAnnotated(rule.id), before = structuredClone(input);
    const result = reviewCorpusAlignment(input);
    assert.deepEqual(input, before);
    for (const format of rules.formats.filter(r => r.id === rule.id)) {
      const original = han(input)[format.index], token = han(result)[format.index];
      assert.equal(token.sourceReading, format.sourceReading);
      assert.deepEqual(token.positions, original.positions);
      assert.equal(inspectToken(token).status, 'ready');
      assert.equal(token.audit.at(-1).interpretedSourceReading, format.interpretedSourceReading);
      assert.equal(token.audit.at(-1).action, 'source-spelling-format');
    }
  }
  const untouched = { id: 'unreviewed', tokens: [convertReading('組', 'coq'), convertReading('澹', 'damx/unknown')] };
  assert.equal(reviewCorpusAlignment(untouched), untouched);
  assert.notEqual(inspectToken(untouched.tokens[0]).status, 'ready');
  assert.equal(inspectToken(untouched.tokens[1]).status, 'multiple');
});

test('local source order uses both original syllables, and leaves already corrected editions alone', async () => {
  for (const rule of rules.orders) {
    const input = await originalAnnotated(rule.id), before = structuredClone(input);
    const result = reviewCorpusAlignment(input), chars = han(result);
    assert.deepEqual(input, before);
    for (let i = 0; i < 2; i++) {
      const token = chars[rule.index + i];
      assert.equal(token.sourceReading, rule.sourceReadings[i]);
      assert.equal(inspectToken(token).status, 'ready');
      assert.equal(token.audit.at(-1).interpretedSourceReading, rule.sourceReadings[1 - i]);
    }
    const fixed = structuredClone(input), fixedChars = han(fixed);
    [...rule.chars].reverse().forEach((char, i) => Object.assign(fixedChars[rule.index + i], convertReading(char, rule.sourceReadings[i])));
    assert.deepEqual(reviewCorpusAlignment(fixed).provenance.corpusAlignmentReview.orders, []);
  }
});

test('stale original text or sound evidence rejects the old positional review', async () => {
  const rule = rules.alignment[0], input = originalAlignment(rule);
  input.provenance.originalRomanization += ' cix';
  assert.throws(() => reviewCorpusAlignment(input), /原注已變動/);
  const changedText = originalAlignment(rule);
  changedText.tokens[0].char = '孔';
  assert.throws(() => reviewCorpusAlignment(changedText), /原文或未對齊狀態已變動/);
  const changedReviewed = reviewCorpusAlignment(originalAlignment(rule));
  changedReviewed.tokens[0].char = '孔';
  assert.throws(() => reviewCorpusAlignment(changedReviewed), /已覆核正文已變/);
  const order = rules.orders[0], changedOrder = await originalAnnotated(order.id);
  han(changedOrder)[order.index].char = '甲';
  assert.throws(() => reviewCorpusAlignment(changedOrder), /相鄰正文已變/);
});

test('review rules are anchored to the pinned source files, including raw annotation lines', async () => {
  const sourceFiles = new Map();
  for (const rule of [...rules.alignment, ...rules.formats, ...rules.orders]) {
    if (!sourceFiles.has(rule.source.file)) {
      const bytes = await readFile(new URL(`../.cache/corpus-sources/${rule.source.file}`, import.meta.url));
      assert.equal(hash(bytes), rule.source.sha256);
      sourceFiles.set(rule.source.file, bytes.toString('utf8'));
    }
    const source = sourceFiles.get(rule.source.file);
    if (rule.originalRomanization) {
      assert.equal(hash(rule.originalRomanization), rule.sourceRomanizationSha256);
      assert.ok(source.includes(rule.originalText));
      assert.ok(source.includes(rule.originalRomanization));
    }
    for (const ref of rule.references || []) if (ref.kind === 'same-passage-reading') assert.ok(source.includes(ref.quote));
  }
});
