import TshetUinh from 'tshet-uinh';
import { romanizePolyhedron } from './polyhedron-scheme.js';

export const isHan = char => /\p{Script=Han}/u.test(char);
export const syllablesIn = text => (text.split(/\r?\n/).map(line=>line.split('#')[0]).join('\n').replaceAll('’', "'")
  .replace(/([a-z]+)\(([a-z]+)\?\)/gi, '$1/$2')
  .replace(/([a-z]+)\s*\(\?+\)/gi, '$1/unknown')
  .match(/[a-z]+(?:'[a-z]+)*(?:\/[a-z]+(?:'[a-z]+)*)*|\?{2,}/gi) ?? []).map(s => s.toLowerCase());
const charCache = new Map();
let reverse;

function dictionaryReadings(char) {
  if (!charCache.has(char)) charCache.set(char, TshetUinh.資料.query字頭(char).map(entry => ({
    position: entry.音韻地位.描述, spelling: romanizePolyhedron(entry.音韻地位, char)
  })));
  return charCache.get(char);
}

export function matchesPolyhedron(char, spelling) {
  return dictionaryReadings(char).some(r => spelling.split('/').includes(r.spelling));
}

function reverseIndex() {
  if (!reverse) {
    reverse = new Map();
    for (const p of TshetUinh.資料.iter音韻地位()) {
      const spelling = romanizePolyhedron(p);
      if (!reverse.has(spelling)) reverse.set(spelling, []);
      reverse.get(spelling).push(p.描述);
    }
  }
  return reverse;
}

// A source reading selects among this character's attested readings first.
// Global matches remain unconfirmed, even if there is only one position.
export function convertReading(char, sourceReading) {
  const spellings = sourceReading.toLowerCase().split('/');
  const attested = [...new Set(dictionaryReadings(char).filter(r => spellings.includes(r.spelling)).map(r => r.position))];
  const positions = attested.length ? attested : [...new Set(spellings.flatMap(s => reverseIndex().get(s) ?? []))];
  return { char, positions, sourceReading, conversion: attested.length === 1 && spellings.length === 1 ? 'dictionary-match'
    : attested.length ? 'ambiguous' : positions.length ? 'unattested' : 'unmapped' };
}

export function alignPolyhedron(text, romanization) {
  const chars = [...text];
  const syllables = syllablesIn(romanization);
  const count = chars.filter(isHan).length;
  if (count !== syllables.length) throw new Error(`原文 ${count} 字與拼音 ${syllables.length} 音節不一致，未進行錯位配對。`);
  let index = 0;
  return chars.map(char => isHan(char) ? convertReading(char, syllables[index++]) : { char });
}

// Supports the original Analects file and plain text/pinyin line pairs.
export function parsePolyhedronPairs(input, options = {}) {
  const lines = input.replace(/^\uFEFF/, '').split(/\r?\n/);
  const documents = [];
  let section = options.title || 'polyhedron 語料';
  let number = 0;
  if (/^#licence:\s*cc by-nc-sa 3\.0/im.test(input)) options = {
    ...options,
    source: options.source || 'https://github.com/biopolyhedron/middle-chinese-text-label',
    license: options.license || 'CC BY-NC-SA 3.0 · polyhedron'
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#')) {
      if (/^#[^a-z]/i.test(line) && !line.includes('論語中古') && !line.includes('版權') && !line.includes('修改')) {
        const title = line.slice(1).trim();
        if (/第[一二三四五六七八九十]+$/.test(title)) { section = title; number = 0; }
      }
      continue;
    }
    if (![...line].some(isHan)) continue;
    const next = lines[i + 1]?.trim();
    if (!next || /\p{Script=Han}/u.test(next.split('#')[0]) || !/[a-z]/i.test(next)) continue;
    // Skip the book's bilingual title, which is metadata rather than a passage.
    if (/^(論語|唐詩三百首)$/.test(line)) { i++; continue; }
    number++;
    let tokens;
    let alignmentError = '';
    try { tokens = alignPolyhedron(line, next); }
    catch (error) {
      if (!options.allowUnaligned) throw new Error(`${section} · ${number}：${error.message}`);
      alignmentError = error.message;
      tokens = [...line].map(char => ({ char }));
    }
    const { allowUnaligned, ...meta } = options;
    documents.push({ ...meta, title: `${section} · ${number}`, tokens,
      provenance: { originalRomanization: next, ...(alignmentError ? { alignmentError } : {}) } });
    i++;
  }
  if (!documents.length) throw new Error('沒有找到原文／polyhedron 拼音行。純拼音《唐詩三百首》須先配對原文，請使用內建語料庫。');
  return documents;
}
