import { createHash } from 'node:crypto';
import TshetUinh from 'tshet-uinh';
import { convertReading, isHan, syllablesIn } from '../src/polyhedron.js';
import { romanizePolyhedron } from '../src/polyhedron-scheme.js';
import rules from './corpus-alignment-review.json' with { type: 'json' };

const method = 'reviewed-source-alignment-v1';
const hash = value => createHash('sha256').update(value).digest('hex');
const rulesHash = hash(JSON.stringify(rules));
const alignmentRules = new Map(rules.alignment.map(rule => [rule.id, rule]));
const sourceReference = rule => ({ ...rule.source, kind: 'reviewed-upstream-alignment', ruleId: rule.id, reason: rule.basis });

for (const rule of rules.formats) {
  if (!rule.sourceReading.endsWith('q') || rule.interpretedSourceReading !== `${rule.sourceReading.slice(0, -1)}x`) {
    throw new Error(`不是已覆核的標調字母校訂：${rule.id}:${rule.index}`);
  }
  for (const entry of rule.dictionaryEntries) {
    if (!TshetUinh.資料.query字頭(entry.dictionaryChar).some(actual =>
      actual.音韻地位.描述 === entry.position && actual.反切 === entry.fanqie && actual.釋義 === entry.quote &&
      romanizePolyhedron(actual.音韻地位, entry.dictionaryChar) === rule.interpretedSourceReading)) {
      throw new Error(`格式校訂字庫依據失效：${rule.id}:${rule.index}`);
    }
  }
}

function checkSource(document, rule) {
  if (typeof document.provenance?.originalRomanization !== 'string' ||
    hash(document.provenance.originalRomanization) !== rule.sourceRomanizationSha256) {
    throw new Error(`原注已變動，不能沿用對齊覆核：${rule.id}`);
  }
}

function restoreAlignment(document, rule) {
  checkSource(document, rule);
  if (document.tokens.map(token => token.char).join('') !== rule.originalText ||
    document.provenance.alignmentError !== rule.originalAlignmentError) {
    throw new Error(`原文或未對齊狀態已變動：${rule.id}`);
  }
  const chars = document.tokens.filter(token => isHan(token.char));
  const spellings = syllablesIn(document.provenance.originalRomanization);
  const characterToSource = [], unpairedSourceIndexes = [];
  let textIndex = 0, sourceIndex = 0;
  const pairUntil = end => {
    while (textIndex < end) {
      if (sourceIndex >= spellings.length) throw new Error(`對齊規則越過原音末尾：${rule.id}`);
      characterToSource[textIndex++] = [sourceIndex++];
    }
  };
  for (const operation of rule.operations) {
    pairUntil(operation.textStart);
    if (textIndex !== operation.textStart || sourceIndex !== operation.sourceStart) throw new Error(`對齊規則索引不符：${rule.id}`);
    if (operation.kind === 'text-gap') {
      const missing = [...operation.chars];
      if (chars.slice(textIndex, textIndex + missing.length).map(t => t.char).join('') !== operation.chars) throw new Error(`漏音字位不符：${rule.id}`);
      for (const _ of missing) characterToSource[textIndex++] = [];
    } else if (operation.kind === 'source-extra' || operation.kind === 'source-alternatives') {
      if (JSON.stringify(spellings.slice(sourceIndex, sourceIndex + operation.readings.length)) !== JSON.stringify(operation.readings)) throw new Error(`原音片段不符：${rule.id}`);
      const indexes = operation.readings.map(() => sourceIndex++);
      if (operation.kind === 'source-extra') unpairedSourceIndexes.push(...indexes);
      else {
        if (chars[textIndex].char !== operation.char) throw new Error(`括注另音字位不符：${rule.id}`);
        characterToSource[textIndex++] = indexes;
      }
    } else throw new Error(`未知對齊操作：${operation.kind}`);
  }
  pairUntil(chars.length);
  if (sourceIndex !== spellings.length) throw new Error(`對齊規則遺留未記錄原音：${rule.id}`);
  let hanIndex = -1;
  const tokens = document.tokens.map(token => {
    if (!isHan(token.char)) return token;
    const index = ++hanIndex, indexes = characterToSource[index];
    const before = token.position || token.positions || [];
    if (!indexes.length) return { ...token, positions: [], position: '', confirmed: false,
      audit: [...(token.audit || []), { action: 'source-reading-gap', at: rules.editedOn, before, after: [],
        reason: '本字在原注缺少對應音節；只恢復周圍字位配對，未補入推測讀音。', references: [sourceReference(rule)] }] };
    const sourceReading = indexes.map(i => spellings[i]).join('/');
    const converted = convertReading(token.char, sourceReading);
    // Keep both stated alternatives even when only one is under this dictionary headword.
    if (indexes.length > 1) {
      converted.positions = [...new Set(indexes.flatMap(i => convertReading(token.char, spellings[i]).positions))];
      converted.conversion = 'ambiguous';
    }
    return { ...token, ...converted, position: '', confirmed: false,
      audit: [...(token.audit || []), { action: 'source-alignment', at: rules.editedOn, before, after: converted.positions,
        sourceIndexes: indexes, sourceReading, reason: rule.basis, references: [sourceReference(rule)] }] };
  });
  const { alignmentError, ...provenance } = document.provenance;
  return { document: { ...document, tokens, provenance }, review: {
    source: rule.source, originalText: rule.originalText, originalRomanization: rule.originalRomanization,
    previousAlignmentError: alignmentError, operations: rule.operations, characterToSource,
    unpairedTextIndexes: characterToSource.flatMap((indexes, index) => indexes.length ? [] : [index]),
    unpairedSourceIndexes, basis: rule.basis,
  } };
}

function selectSourceReading(token, spelling, action, reason, references) {
  const result = convertReading(token.char, spelling);
  if (result.conversion !== 'dictionary-match' || result.positions.length !== 1) throw new Error(`校訂原音不能與本字唯一互證：${token.char} ${spelling}`);
  if (token.confirmed || token.position) {
    if ((token.position || token.positions?.[0]) !== result.positions[0]) throw new Error(`覆核與已有選音衝突：${token.char}`);
    return token;
  }
  return { ...token, position: result.positions[0], confirmed: true,
    audit: [...(token.audit || []), { action, at: rules.editedOn, before: token.positions || [], after: result.positions[0],
      originalSourceReading: token.sourceReading, interpretedSourceReading: spelling, reason, references }] };
}

/** Apply only the fixed, reviewed alignment/format rules for an immutable built-in document. */
export function reviewCorpusAlignment(document, id = document.id) {
  const alignment = alignmentRules.get(id), formats = rules.formats.filter(rule => rule.id === id), orders = rules.orders.filter(rule => rule.id === id);
  if (!alignment && !formats.length && !orders.length) return document;
  const previous = document.provenance?.corpusAlignmentReview;
  if (previous) {
    if (previous.method !== method || previous.rulesSha256 !== rulesHash) throw new Error(`對齊覆核版本過期：${id}`);
    for (const rule of [alignment, ...formats, ...orders].filter(Boolean)) checkSource(document, rule);
    const chars = document.tokens.filter(token => isHan(token.char));
    if (alignment && document.tokens.map(token => token.char).join('') !== alignment.originalText) throw new Error(`已覆核正文已變：${id}`);
    for (const note of [...previous.formats, ...previous.orders]) {
      const token = chars[note.index];
      if (token?.char !== note.char || token.sourceReading !== note.originalSourceReading || token.position !== note.position) throw new Error(`已覆核字位已變：${id}:${note.index}`);
    }
    return document;
  }
  let reviewed = document;
  const review = { method, editedOn: rules.editedOn, rulesSha256: rulesHash, indexConvention: rules.indexConvention, formats: [], orders: [] };
  if (alignment) {
    const restored = restoreAlignment(reviewed, alignment);
    reviewed = restored.document;
    review.alignment = restored.review;
  }
  const tokens = reviewed.tokens.slice(), hanTokenIndexes = tokens.flatMap((token, i) => isHan(token.char) ? [i] : []);
  for (const rule of formats) {
    checkSource(reviewed, rule);
    const tokenIndex = hanTokenIndexes[rule.index], token = tokens[tokenIndex];
    if (token?.char !== rule.char || token.sourceReading !== rule.sourceReading) throw new Error(`格式校訂字位已變：${id}:${rule.index}`);
    const references = [sourceReference(rule), ...rule.references, ...rule.dictionaryEntries];
    tokens[tokenIndex] = selectSourceReading(token, rule.interpretedSourceReading, 'source-spelling-format', rule.basis, references);
    review.formats.push({ index: rule.index, char: rule.char, originalSourceReading: rule.sourceReading,
      interpretedSourceReading: rule.interpretedSourceReading, position: tokens[tokenIndex].position, basis: rule.basis, references });
  }
  for (const rule of orders) {
    checkSource(reviewed, rule);
    const indexes = [rule.index, rule.index + 1], pair = indexes.map(i => tokens[hanTokenIndexes[i]]);
    if (JSON.stringify(pair.map(t => t?.sourceReading)) !== JSON.stringify(rule.sourceReadings)) throw new Error(`相鄰原音已變：${id}:${rule.index}`);
    if (pair.map(t => t.char).join('') !== rule.chars) {
      // A separately verified edition may already restore the source's word order.
      if (pair.every(token => convertReading(token.char, token.sourceReading).conversion === 'dictionary-match')) continue;
      throw new Error(`相鄰正文已變，須重核原音次序：${id}:${rule.index}`);
    }
    for (const [i, token] of pair.entries()) {
      const sourceIndex = indexes[1 - i], spelling = rule.sourceReadings[1 - i];
      const references = [sourceReference(rule), { kind: 'neighbor-source-reading', index: sourceIndex,
        char: pair[1 - i].char, sourceReading: spelling }];
      tokens[hanTokenIndexes[indexes[i]]] = selectSourceReading(token, spelling, 'source-order-alignment', rule.basis, references);
      review.orders.push({ index: indexes[i], char: token.char, sourceIndex, originalSourceReading: token.sourceReading,
        interpretedSourceReading: spelling, position: tokens[hanTokenIndexes[indexes[i]]].position, basis: rule.basis, references });
    }
  }
  return { ...reviewed, tokens, provenance: { ...reviewed.provenance, corpusAlignmentReview: review } };
}
