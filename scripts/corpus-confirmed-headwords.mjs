import { createHash } from 'node:crypto';
import TshetUinh from 'tshet-uinh';
import { romanizePolyhedron } from '../src/polyhedron-scheme.js';
import rules from './corpus-confirmed-headwords.json' with { type: 'json' };
import commentary from './snapshots/analects-commentary.json' with { type: 'json' };

const hash = value => createHash('sha256').update(value).digest('hex');
const rulesSha256 = hash(JSON.stringify(rules));
const isHan = char => /\p{Script=Han}/u.test(char);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const byDocument = new Map();

function verifyDictionary(reference) {
  if (!TshetUinh.資料.query字頭(reference.dictionaryChar).some(entry =>
    entry.音韻地位.描述 === reference.position && entry.反切 === reference.fanqie && entry.釋義 === reference.quote)) {
    throw new Error(`已核詞頭的韻書依據失效：${reference.dictionaryChar} ${reference.position}`);
  }
}

for (const [file, book] of Object.entries(commentary.books)) {
  if (hash(book.text) !== book.sha256) throw new Error(`古注快照雜湊不符：${file}`);
}
const keys = new Set();
for (const rule of rules.cases) {
  const key = `${rule.id}:${rule.index}`;
  if (keys.has(key)) throw new Error(`重複已核字位：${key}`);
  keys.add(key);
  const position = TshetUinh.音韻地位.from描述(rule.position);
  if (rule.sourceReading != null && (/[/?]/.test(rule.sourceReading) ||
    romanizePolyhedron(position, rule.dictionaryChar) !== rule.sourceReading)) {
    throw new Error(`已核字位不保留原注單讀：${key}`);
  }
  if (!same(rule.sourcePositions, [rule.position])) throw new Error(`已核字位不保留原音候選：${key}`);
  for (const reference of rule.references) {
    if (reference.kind === 'dictionary-entry') verifyDictionary(reference);
    if (reference.kind === 'fixed-commentary') {
      const book = commentary.books[reference.file];
      if (!book || book.sha256 !== reference.sourceSha256 || book.url !== reference.url ||
        reference.commit !== commentary.commit || reference.sourceOffsetConvention !== 'JavaScript UTF-16 code-unit offset' ||
        book.text.slice(reference.sourceOffset, reference.sourceOffset + reference.quote.length) !== reference.quote) {
        throw new Error(`已核詞頭的古注引文失效：${key} ${reference.file}`);
      }
      const page = [...book.text.slice(0, reference.sourceOffset).matchAll(/<pb:KR1h0007_WYG_([^>]+)>/g)].at(-1)?.[1];
      if (page !== reference.page) throw new Error(`已核詞頭的古注起頁失效：${key}`);
    }
    if (reference.kind === 'fanqie-analysis') {
      verifyDictionary(reference.upper);
      verifyDictionary(reference.lower);
      const upper = TshetUinh.音韻地位.from描述(reference.upper.position);
      const lower = TshetUinh.音韻地位.from描述(reference.lower.position);
      // The two reviewed 七雷 instances have no 重紐 or 等呼 ambiguity.
      if (reference.fanqie !== reference.upper.dictionaryChar + reference.lower.dictionaryChar ||
        reference.position !== TshetUinh.音韻地位.from描述(upper.母 + lower.描述.slice(1)).描述 || reference.position !== rule.position) {
        throw new Error(`已核反切組合不符：${key}`);
      }
    }
  }
  byDocument.set(rule.id, [...(byDocument.get(rule.id) || []), rule]);
}

/** Select only reviewed occurrences; retain the exact source text, spelling and candidate array. */
export function reviewConfirmedHeadwords(document, id = document.id) {
  const entries = byDocument.get(id);
  if (!entries) return document;
  const previous = document.provenance?.confirmedHeadwords;
  if (previous && (previous.method !== rules.method || previous.rulesSha256 !== rulesSha256)) {
    throw new Error(`已核詞頭規則版本過期：${id}`);
  }
  const tokens = document.tokens.slice();
  const hanTokenIndexes = tokens.flatMap((token, index) => isHan(token.char) ? [index] : []);
  const text = hanTokenIndexes.map(index => tokens[index].char);
  const notes = [];
  for (const rule of entries) {
    const tokenIndex = hanTokenIndexes[rule.index], token = tokens[tokenIndex];
    const context = text.slice(Math.max(0, rule.index - 6), rule.index + 7).join('');
    if (token?.char !== rule.char || context !== rule.context || (token.sourceReading ?? null) !== rule.sourceReading ||
      !same(token.positions || [], rule.sourcePositions)) {
      throw new Error(`已核字位的原字、上下文或原音已變：${id}:${rule.index}`);
    }
    if (token.position || token.confirmed) {
      if (token.position !== rule.position || !token.confirmed) throw new Error(`已核詞頭與已有選讀衝突：${id}:${rule.index}`);
    } else {
      if (token.conversion && token.conversion !== 'unattested') throw new Error(`已核詞頭的候選狀態已變：${id}:${rule.index}`);
      tokens[tokenIndex] = { ...token, position: rule.position, confirmed: true,
        audit: [...(token.audit || []), { action: 'source-and-confirmed-headword', at: rules.editedOn,
          before: token.positions || [], after: rule.position, originalSourceReading: token.sourceReading ?? null,
          reason: rule.basis, references: rule.references }] };
    }
    notes.push({ index: rule.index, tokenIndex, char: rule.char, context: rule.context, sourceReading: rule.sourceReading,
      dictionaryChar: rule.dictionaryChar, position: rule.position, basis: rule.basis, references: rule.references });
  }
  return { ...document, tokens, provenance: { ...document.provenance,
    confirmedHeadwords: { method: rules.method, editedOn: rules.editedOn, rulesSha256, indexConvention: rules.indexConvention, notes } } };
}
