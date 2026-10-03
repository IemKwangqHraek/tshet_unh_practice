import TshetUinh from 'tshet-uinh';
import { romanizePolyhedron } from '../src/polyhedron-scheme.js';
import { matchesPolyhedron } from '../src/polyhedron.js';
import variants from './corpus-headword-variants.json' with { type: 'json' };

const rules = new Map(variants.rules.map(rule => [rule.char, rule]));
export const matchesReviewedHeadword = (char, spelling) => matchesPolyhedron(char, spelling) || !!rules.get(char)?.entries.some(entry =>
  spelling.split('/').includes(romanizePolyhedron(TshetUinh.音韻地位.from描述(entry.position), rules.get(char).dictionaryChar)));
for (const rule of variants.rules) for (const entry of rule.entries) {
  if (!TshetUinh.資料.query字頭(rule.dictionaryChar).some(e => e.音韻地位.描述 === entry.position && e.反切 === entry.fanqie && e.釋義 === entry.quote)) {
    throw new Error(`字庫別體依據失效：${rule.char}/${rule.dictionaryChar}`);
  }
}

export function reviewHeadwordVariants(document) {
  const notes = [];
  let hanIndex = -1;
  const tokens = document.tokens.map((token, tokenIndex) => {
    if (!/\p{Script=Han}/u.test(token.char)) return token;
    const index = ++hanIndex;
    const rule = rules.get(token.char);
    if (!rule || token.position || token.confirmed || token.conversion && token.conversion !== 'unattested') return token;
    const candidates = rule.entries.filter(entry => token.sourceReading
      ? !token.sourceReading.includes('/') && romanizePolyhedron(TshetUinh.音韻地位.from描述(entry.position), rule.dictionaryChar) === token.sourceReading
      : token.positions?.length === 1 && token.positions[0] === entry.position);
    const positions = [...new Set(candidates.map(entry => entry.position))];
    if (positions.length !== 1 || TshetUinh.資料.query字頭(token.char).some(e => e.音韻地位.描述 === positions[0])) return token;
    const references = candidates.map(entry => ({ dictionaryChar: rule.dictionaryChar, ...entry, dictionary: 'tshet-uinh 0.15.4 · 廣韻' }));
    const note = { index, tokenIndex, char: token.char, dictionaryChar: rule.dictionaryChar, position: positions[0], basis: rule.basis, references };
    notes.push(note);
    return { ...token, position: positions[0], confirmed: true,
      audit: [...(token.audit || []), { action: 'source-and-headword-variant', before: token.positions, after: positions[0], at: variants.editedOn, reason: rule.basis, references }] };
  });
  return { ...document, tokens, provenance: { ...document.provenance,
    editionReview: { ...document.provenance?.editionReview, headwordMethod: 'source-constrained-headword-review-v1', notes } } };
}
