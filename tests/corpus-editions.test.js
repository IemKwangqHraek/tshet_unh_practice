import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import TshetUinh from 'tshet-uinh';
import { romanizePolyhedron } from '../src/polyhedron-scheme.js';
import { isHan, syllablesIn } from '../src/polyhedron.js';
import { inspectToken, parseImport, exportDocument } from '../src/corpus.js';
import { reviewHeadwordVariants, matchesReviewedHeadword } from '../scripts/corpus-editions.mjs';
import { contextualNotes, parseCommentary } from '../scripts/shijing-commentary.mjs';
import { windowCoverage } from '../scripts/corpus-edition-status.mjs';
import { reviewView } from '../src/views.js';
import { rewindTangSourceReadings } from '../scripts/tang-source-readings.mjs';
const json = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

test('headword review preserves punctuation indices, original spellings and candidates, and requires unique source support', async () => {
  const rule = (await json('../scripts/corpus-headword-variants.json')).rules.find(r => r.char === '魂');
  const entry = rule.entries[0], reading = romanizePolyhedron(TshetUinh.音韻地位.from描述(entry.position), rule.dictionaryChar);
  const input = { tokens: [{ char: '。' }, { char: '魂', positions: [entry.position], sourceReading: reading, conversion: 'unattested' }] };
  const reviewed = reviewHeadwordVariants(input), token = reviewed.tokens[1];
  assert.equal(inspectToken(token).status, 'ready');
  assert.equal(token.position, entry.position);
  assert.equal(token.sourceReading, reading);
  assert.deepEqual(token.positions, input.tokens[1].positions);
  assert.equal(reviewed.provenance.editionReview.notes[0].index, 0);
  assert.equal(reviewed.provenance.editionReview.notes[0].tokenIndex, 1);
  assert.equal(input.tokens[1].confirmed, undefined);
  for (const sourceReading of ['???', `${reading}/unknown`]) {
    const uncertain = reviewHeadwordVariants({ tokens: [{ ...input.tokens[1], sourceReading }] });
    assert.equal(uncertain.tokens[0].confirmed, undefined);
  }
  assert.equal(matchesReviewedHeadword('不', 'gha'), false);
});

test('scoped text differences recover surrounding glosses without transferring a different headword sound', () => {
  const body = '鐘鼓饌玉不足貴但願長醉不願醒';
  const parsed = parseCommentary('鐘鼓饌玉何(音荷)足貴(居胃反)但願長醉不願醒');
  const differences = [{ file: 'edition', index: 4, bodyChar: '不', sourceChar: '何' }];
  const sources = [{ file: 'edition', parsed }];
  assert.equal(contextualNotes(body, sources)[6].length, 0);
  const notes = contextualNotes(body, sources, differences);
  assert.equal(notes[4].length, 0);
  assert.equal(notes[6][0].resolved.position, '見合三C微去');
  assert.equal(notes[6][0].differences[0].kind, 'edition-text-difference');
  const coverage = windowCoverage(body, sources, differences);
  assert.equal(Object.values(coverage.counts).reduce((a, b) => a + b), [...body].length);
  assert.ok(coverage.counts.scopedDifference);
  const astralSource = [{ file: 'edition', parsed: parseCommentary('𠮷鼓饌玉何足貴(居胃反)但願長醉不願醒') }];
  const astral = contextualNotes(body, astralSource, [...differences, { file: 'edition', index: 0, bodyChar: '鐘', sourceChar: '𠮷' }]);
  assert.equal(astral[6][0].char, '貴');
  assert.equal(astral[6][0].resolved.position, '見合三C微去');
});

test('Shijing restored glyph pairing exposes the actual source context and retains earlier pilots', async () => {
  const { documents } = await json('../public/corpora/shijing.json');
  const poem = documents.find(d => d.title.endsWith('羔裘') && d.tokens.some(t => t.char === '朝'));
  const note = poem.provenance.readingNotes.find(n => n.char === '朝');
  assert.equal(note.position, '澄開三宵平');
  assert.ok(note.references.some(r => r.sourceContext.includes('逍遥') && r.editionDifferences.some(d => d.bodyChar === '遙' && d.sourceChar === '遥')));
  const qi = documents.find(d => d.title.endsWith('淇奧'));
  assert.ok(qi.provenance.readingNotes.some(n => n.char === '諼' && n.references.some(r => r.sourceContext.includes('奥'))));
  assert.ok(documents.some(d => d.id === 'shijing-fuyi'));
  assert.ok(documents.some(d => d.id === 'shijing-taoyao'));
});

test('Tang edition changes preserve source alignment, stable identities and every formerly compatible word', async () => {
  const { documents } = await json('../public/corpora/tang.json');
  const baseline = (await json('../scripts/tang-edition-baseline.json')).documents;
  for (const latest of documents) {
    const doc = rewindTangSourceReadings(latest);
    const previous = baseline.find(b => b.id === doc.id);
    assert.ok(previous, doc.id);
    for (const field of ['title', 'author', 'category']) assert.equal(doc[field], previous[field]);
    const chars = doc.tokens.filter(t => isHan(t.char)), old = [...previous.text].filter(isHan);
    const spellings = syllablesIn(doc.provenance.originalRomanization);
    assert.equal(chars.length, old.length, doc.title);
    assert.equal(chars.length, spellings.length, doc.title);
    for (const [i, token] of chars.entries()) {
      assert.equal(token.sourceReading, spellings[i]);
      if (matchesReviewedHeadword(old[i], spellings[i])) assert.ok(matchesReviewedHeadword(token.char, spellings[i]), `${doc.title} ${i}`);
    }
    for (const change of doc.provenance.editionReview.textChanges) {
      assert.equal(chars[change.index].char, change.after);
      assert.equal(old[change.index], change.before);
    }
  }
  const jiang = documents.find(d => d.id === 'poly-tang-77');
  assert.match(jiang.tokens.map(t => t.char).join(''), /何足貴/);
  assert.match(jiang.provenance.editionReview.previousText, /不足貴/);
  assert.equal(jiang.tokens.filter(t => isHan(t.char))[104].sourceReading, 'gha');
  assert.equal(inspectToken(jiang.tokens.filter(t => isHan(t.char))[104]).status, 'ready');
  const [imported] = parseImport(JSON.stringify(jiang), 'json');
  assert.match(reviewView(imported, 'pending', 0, [imported]), /正文版本校對/);
  assert.match(reviewView(imported, 'pending', 0, [imported]), /其他版本用字/);
});

test('new Tang snapshot is fixed and selected snapshot texts remain whole attested poems', async () => {
  const bytes = await readFile(new URL('../scripts/snapshots/tang-dongli.json', import.meta.url));
  const manifest = await json('../scripts/corpus-edition-sources.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest[0].sha256);
  const snapshot = JSON.parse(bytes);
  assert.equal(snapshot.coverage.availablePages, snapshot.coverage.listedPages);
  const { documents } = await json('../public/corpora/tang.json');
  for (const doc of documents.filter(d => d.provenance.editionReview.snapshotSha256)) {
    const chars = rewindTangSourceReadings(doc).tokens.filter(t => isHan(t.char));
    for (const part of doc.provenance.textParts.filter(p => p.source.startsWith('https://www.donglishuzhai.net/'))) {
      const selected = chars.slice(part.start, part.start + part.length).map(t => t.char).join('');
      assert.ok(snapshot.documents.some(p => p.textSource === part.source && p.paragraphs.join('').replace(/[^\p{Script=Han}]/gu, '') === selected), doc.title);
    }
  }
});

test('every Tang text part exactly matches a whole poem in its recorded source', async () => {
  const manifest = await json('../scripts/corpus-sources.json');
  const readSource = async file => {
    const bytes = await readFile(new URL(`../.cache/corpus-sources/${file}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.find(s => s.file === file).sha256);
    return bytes.toString('utf8');
  };
  const original = JSON.parse(await readSource('tang-original.json')).map(p => ({ ...p, textSource: manifest.find(s => s.file === 'tang-original.json').url }));
  for (const block of (await readSource('rime-tang.txt')).split(/\n\s*\n/)) {
    const body = block.match(/^詩文:(.+)$/m)?.[1]?.replace(/^\([^)]*\)/, '');
    if (body) original.push({ paragraphs: [body], textSource: manifest.find(s => s.file === 'rime-tang.txt').url });
  }
  original.push(...(await json('../scripts/snapshots/tang-dongli.json')).documents);
  const { documents } = await json('../public/corpora/tang.json');
  for (const doc of documents) {
    // textParts records the complete base edition; scoped source corrections
    // are independently checked against their fixed text witnesses.
    const chars = rewindTangSourceReadings(doc).tokens.filter(t => isHan(t.char));
    assert.equal(doc.provenance.textParts.reduce((n, p) => n + p.length, 0), chars.length);
    for (const part of doc.provenance.textParts) {
      const selected = chars.slice(part.start, part.start + part.length).map(t => t.char).join('');
      assert.ok(original.some(p => p.textSource === part.source && p.paragraphs.join('').replace(/[^\p{Script=Han}]/gu, '') === selected), doc.title);
    }
  }
});

test('whole-corpus audit covers every word and every unresolved item; evidence survives import/export', async () => {
  const audit = await json('../docs/corpus-edition-status.json');
  assert.equal(audit.documents.length, 1157);
  let total = 0, ready = 0, pending = 0;
  for (const pack of ['classics', 'analects', 'tang', 'shijing']) {
    const { documents } = await json(`../public/corpora/${pack}.json`);
    for (const raw of documents) {
      const row = audit.documents.find(d => d.id === raw.id), chars = raw.tokens.filter(t => isHan(t.char));
      assert.equal(row.total, chars.length);
      assert.equal(row.pending.length, chars.filter(t => inspectToken(t).status !== 'ready').length);
      for (const item of row.pending) assert.equal(chars[item.index].char, item.char);
      for (const note of raw.provenance.editionReview?.notes || []) {
        assert.equal(chars[note.index].char, note.char);
        assert.equal(raw.tokens[note.tokenIndex].position, note.position);
        const token = chars[note.index];
        if (token.sourceReading) assert.equal(romanizePolyhedron(TshetUinh.音韻地位.from描述(token.position), token.char), token.sourceReading);
      }
      if (row.pairing) assert.equal(Object.values(row.pairing.counts).reduce((a, b) => a + b), chars.length);
      total += row.total; ready += row.states.ready || 0; pending += row.pending.length;
      if (raw.provenance.editionReview) {
        const [doc] = parseImport(JSON.stringify(raw), 'json');
        assert.deepEqual(exportDocument(doc).provenance.editionReview, raw.provenance.editionReview);
      }
    }
  }
  assert.deepEqual([total, ready, pending], [audit.totals.characters, audit.totals.ready, audit.totals.pending]);
  assert.equal(audit.documents.filter(d => d.alignmentError).length, 0);
});

test('built Analects retains all fourteen reviewed alignments, thirteen source gaps and the explicit alternate tone of 文', async () => {
  const { documents } = await json('../public/corpora/analects.json');
  const rules = (await json('../scripts/corpus-alignment-review.json')).alignment;
  const reviewed = documents.filter(d => d.provenance.corpusAlignmentReview?.alignment);
  assert.equal(reviewed.length, 14);
  assert.deepEqual(reviewed.map(d => d.id).sort(), rules.map(r => r.id).sort());
  let total = 0, missing = 0;
  for (const raw of reviewed) {
    const rule = rules.find(r => r.id === raw.id);
    const alignment = raw.provenance.corpusAlignmentReview.alignment;
    const chars = raw.tokens.filter(t => isHan(t.char));
    assert.equal(raw.tokens.map(t => t.char).join(''), rule.originalText, raw.id);
    assert.equal(raw.provenance.originalRomanization, rule.originalRomanization, raw.id);
    assert.equal(raw.provenance.alignmentError, undefined, raw.id);
    assert.equal(alignment.previousAlignmentError, rule.originalAlignmentError, raw.id);
    const spellings = syllablesIn(raw.provenance.originalRomanization);
    assert.equal(alignment.characterToSource.length, chars.length, raw.id);
    assert.deepEqual([...alignment.characterToSource.flat(), ...alignment.unpairedSourceIndexes].sort((a, b) => a - b), spellings.map((_, index) => index), raw.id);
    for (const [index, token] of chars.entries()) {
      const sourceIndexes = alignment.characterToSource[index];
      if (!sourceIndexes.length) {
        missing++;
        assert.equal(token.sourceReading, undefined, `${raw.id}:${index}`);
        assert.deepEqual(token.positions || [], [], `${raw.id}:${index}`);
        assert.ok(!token.position && !token.confirmed, `${raw.id}:${index}`);
        assert.equal(inspectToken(token).status, 'missing', `${raw.id}:${index}`);
        assert.ok(token.audit.some(entry => entry.action === 'source-reading-gap'), `${raw.id}:${index}`);
      } else assert.equal(token.sourceReading, sourceIndexes.map(i => spellings[i]).join('/'), `${raw.id}:${index}`);
    }
    const [imported] = parseImport(JSON.stringify(raw), 'json');
    assert.deepEqual(exportDocument(imported).provenance.corpusAlignmentReview, raw.provenance.corpusAlignmentReview);
    total += chars.length;
  }
  assert.equal(total, 819);
  assert.equal(missing, 13);
  const wenDoc = reviewed.find(d => d.id === 'poly-analects-513');
  const wen = wenDoc.tokens.filter(t => isHan(t.char))[9];
  assert.equal(wen.char, '文');
  assert.equal(wen.sourceReading, 'myon/myonh');
  assert.deepEqual(wen.positions, ['明三C文平', '明三C文去']);
  assert.ok(!wen.position && !wen.confirmed);
  assert.equal(inspectToken(wen).status, 'multiple');
  const [imported] = parseImport(JSON.stringify(wenDoc), 'json');
  const importedWen = imported.tokens.filter(t => isHan(t.char))[9];
  assert.deepEqual(importedWen.positions, wen.positions);
  assert.equal(inspectToken(importedWen).status, 'multiple');
});
