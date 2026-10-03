import { createHash } from 'node:crypto';
import TshetUinh from 'tshet-uinh';
import { convertReading, isHan } from '../src/polyhedron.js';
import { romanizePolyhedron } from '../src/polyhedron-scheme.js';
import rules from './tang-source-readings.json' with { type: 'json' };

const hash = value => createHash('sha256').update(value).digest('hex');
const rulesSha256 = hash(JSON.stringify(rules));
const byDocument = new Map();
const deferredByDocument = new Map();
const keys = new Set();
for (const rule of rules.cases) {
  const key = `${rule.id}:${rule.index}`;
  if (keys.has(key)) throw new Error(`重複唐詩原注採讀字位：${key}`);
  keys.add(key);
  const position = TshetUinh.音韻地位.from描述(rule.position);
  if (!rule.sourceReading || /[/?]/.test(rule.sourceReading)) throw new Error(`原注疑讀不得自動採讀：${key}`);
  if (rule.category !== 'user-reading-override' && romanizePolyhedron(position, rule.targetChar) !== rule.sourceReading) {
    throw new Error(`唐詩選讀不能回拼原音：${key}`);
  }
  if (rule.char !== rule.targetChar && !rule.references.some(reference => reference.kind === 'fixed-poem-text')) {
    throw new Error(`唐詩改字缺少固定正文證據：${key}`);
  }
  if (rule.category === 'user-reading-override' && !rule.references.some(reference => reference.kind === 'user-instruction')) {
    throw new Error(`唐詩覆寫缺少使用者指示：${key}`);
  }
  byDocument.set(rule.id, [...(byDocument.get(rule.id) || []), rule]);
}
for (const rule of rules.deferred) {
  const key = `${rule.id}:${rule.index}`;
  if (keys.has(key)) throw new Error(`唐詩採讀與待核範圍重複：${key}`);
  keys.add(key);
  if (!byDocument.has(rule.id)) byDocument.set(rule.id, []);
  deferredByDocument.set(rule.id, [...(deferredByDocument.get(rule.id) || []), rule]);
}
if (keys.size !== rules.reviewedPendingScope) throw new Error('唐詩原注覆核範圍不完整');

/** Called by the builder after its fixed source files have been loaded. */
export function validateTangSourceEvidence(sourceFiles, editionSnapshot) {
  const polyLines = sourceFiles['poly-tang.txt'].split(/\r?\n/);
  const textRecords = {
    'tang-original.json': JSON.parse(sourceFiles['tang-original.json']),
    'tang-dongli.json': editionSnapshot.documents,
    'rime-tang.txt': sourceFiles['rime-tang.txt'].split(/\n\s*\n/).map(block => {
      const body = block.match(/^詩文:(.+)$/m)?.[1]?.replace(/^\([^)]*\)/, '');
      return { title: block.match(/^詩名:(.+)$/m)?.[1], author: block.match(/^作者:(.+)$/m)?.[1], paragraphs: [body || ''] };
    }),
  };
  for (const rule of [...rules.cases, ...rules.deferred]) {
    for (const reference of rule.references) {
      if (reference.kind === 'polyhedron-annotation' && polyLines[reference.line - 1] !== reference.quote) {
        throw new Error(`唐詩原注引文已變：${rule.id}:${rule.index}`);
      }
      if (reference.kind !== 'fixed-poem-text') continue;
      const record = textRecords[reference.file]?.[reference.recordIndex];
      const text = (record?.paragraphs || []).join('');
      const normalized = reference.textNormalization === 'remove-editorial-note-markers-v1' ? text.replace(/\[按\d+\]/gu, '') : text;
      const chars = [...normalized].filter(isHan);
      if (record?.title !== reference.title || record?.author !== reference.author ||
        hash(chars.join('')) !== reference.hanTextSha256 || chars[reference.hanIndex] !== rule.targetChar ||
        chars.slice(Math.max(0, reference.hanIndex - 6), reference.hanIndex + 7).join('') !== reference.context) {
        throw new Error(`唐詩固定正文證據已變：${rule.id}:${rule.index}`);
      }
    }
  }
}

/** Restore this review layer, for independent build-layer tests and provenance inspection. */
export function rewindTangSourceReadings(document) {
  const review = document.provenance?.tangSourceReadings;
  if (!review) return document;
  const tokens = document.tokens.slice();
  for (const note of review.notes) tokens[note.tokenIndex] = structuredClone(note.originalToken);
  const provenance = { ...document.provenance };
  delete provenance.tangSourceReadings;
  return { ...document, tokens, provenance };
}

/** Adopt scoped, explicit source readings; dictionary headword coverage is not a veto. */
export function reviewTangSourceReadings(document, id = document.id) {
  const entries = byDocument.get(id);
  if (!entries) return document;
  const guard = rules.documents[id];
  const previous = document.provenance?.tangSourceReadings;
  if (previous) {
    if (previous.method !== rules.method || previous.rulesSha256 !== rulesSha256) throw new Error(`唐詩原注規則版本過期：${id}`);
    if (hash(document.tokens.map(token => token.char).join('')) !== previous.reviewedTextSha256 ||
      hash(document.provenance.originalRomanization) !== guard.romanizationSha256) throw new Error(`唐詩覆核後原文或原音已變：${id}`);
    for (const note of previous.notes) {
      const token = document.tokens[note.tokenIndex];
      if (token.char !== note.targetChar || token.sourceReading !== note.sourceReading || token.position !== note.position || !token.confirmed) {
        throw new Error(`唐詩覆核後選讀已變：${id}:${note.index}`);
      }
    }
    return document;
  }
  const originalText = document.tokens.map(token => token.char).join('');
  if (hash(originalText) !== guard.textSha256 ||
    hash(document.provenance?.originalRomanization || '') !== guard.romanizationSha256 ||
    document.provenance?.sourceNumber !== guard.sourceNumber) throw new Error(`唐詩原文或原注版本已變：${id}`);
  const tokens = document.tokens.slice();
  const hanIndexes = tokens.flatMap((token, index) => isHan(token.char) ? [index] : []);
  const chars = hanIndexes.map(index => tokens[index].char);
  const notes = [];
  for (const rule of entries) {
    const tokenIndex = hanIndexes[rule.index];
    const originalToken = document.tokens[tokenIndex];
    if (originalToken?.char !== rule.char || originalToken.sourceReading !== rule.sourceReading ||
      chars.slice(Math.max(0, rule.index - 6), rule.index + 7).join('') !== rule.context ||
      JSON.stringify(originalToken.positions || []) !== JSON.stringify(rule.sourcePositions)) {
      throw new Error(`唐詩已核字位的原字、原音或候選已變：${id}:${rule.index}`);
    }
    const sourceReference = rule.references.find(reference => reference.kind === 'polyhedron-annotation');
    if (!document.provenance.originalRomanization.split('\n').some(line => line.trim() === sourceReference.quote.trim())) {
      throw new Error(`唐詩本篇原注不含核定引文：${id}:${rule.index}`);
    }
    const converted = convertReading(rule.targetChar, rule.sourceReading, { includeUnattestedPositions: true });
    if (rule.category !== 'user-reading-override' &&
      (converted.positions.length !== 1 || converted.positions[0] !== rule.position)) {
      throw new Error(`唐詩原注不再唯一對應核定音位：${id}:${rule.index}`);
    }
    if (originalToken.position && originalToken.position !== rule.position && rule.category !== 'user-reading-override') {
      throw new Error(`唐詩原注採讀與既有選讀衝突：${id}:${rule.index}`);
    }
    tokens[tokenIndex] = { ...originalToken, char: rule.targetChar, position: rule.position, confirmed: true,
      audit: [...(originalToken.audit || []), { action: rule.category === 'user-reading-override' ? 'user-reading-override' : 'polyhedron-source-reading',
        at: rules.editedOn, before: { char: originalToken.char, position: originalToken.position || '', positions: originalToken.positions || [],
          confirmed: originalToken.confirmed === true }, after: { char: rule.targetChar, position: rule.position },
        originalSourceReading: rule.sourceReading, reason: rule.basis, references: rule.references }] };
    notes.push({ index: rule.index, tokenIndex, char: rule.char, targetChar: rule.targetChar, sourceReading: rule.sourceReading,
      position: rule.position, category: rule.category, basis: rule.basis, references: rule.references, originalToken: structuredClone(originalToken) });
  }
  return { ...document, tokens, provenance: { ...document.provenance,
    tangSourceReadings: { method: rules.method, editedOn: rules.editedOn, rulesSha256,
      indexConvention: rules.indexConvention, textPolicy: '有固定正文證據的逐字局部校訂；原配對正文及原拼音保留。',
      originalPairedText: originalText, originalTextSha256: guard.textSha256,
      reviewedTextSha256: hash(tokens.map(token => token.char).join('')), notes,
      deferred: deferredByDocument.get(id) || [] } } };
}
