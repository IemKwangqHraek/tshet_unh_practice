import TshetUinh from 'tshet-uinh';
import editionVariants from './shijing-variants.json' with { type: 'json' };

const han = c => c !== '〇' && /\p{Script=Han}/u.test(c);
// Orthographic equivalences used only for pairing; never rewrite the practice text.
const variants = new Map([... '爲為羣群丗世囬回冝宜别別况況徳德敎教眞真閒閑旣既㑹會夲本兎兔𡔷鼓鼔鼓緑綠髙高矦侯宫宮汚汙緫總釡釜㵎澗靁雷'].join('').match(/../gu)?.map(pair => [...pair]) ?? []);
const baseVariants = new Map(variants);
for (const { source, body } of editionVariants.orthography) variants.set(source, body);
export const normalizeChar = c => variants.get(c.normalize('NFKC')) ?? c.normalize('NFKC');
export const normalizeHan = text => [...text].filter(han).map(normalizeChar).join('');

// Sound-gloss glyphs only: these equivalences do not broaden body-text pairing.
// Keep the original gloss in the evidence ledger; an uncertain glyph stays unresolved.
const soundVariants = new Map('遥遙吕呂乆久戸戶户戶歴歷畱留鋭銳逈迥𥙷補氷冰叙敘貟員呉吳畧略覧覽渉涉内內衘銜㕓廛䖍虔䑕鼠輙輒藴蘊㳟恭亾亡荘莊恵惠悦悅歩步桺柳廻回囘回劎劍靣面衞衛謡謠虗虛𥘉初'.match(/../gu).map(pair => [...pair]));
export const normalizeSoundChar = c => {
  const base = baseVariants.get(c.normalize('NFKC')) ?? c.normalize('NFKC');
  return soundVariants.get(base) ?? base;
};

// SBCK separates a wrapped small-print comment into consecutive parentheses.
// Rejoin them while retaining the page and the base-text character index.
export function parseCommentary(raw) {
  const text = raw.replace(/^#.*\n/gm, '').replace(/<折[^>]*\/>/g, '');
  const tokens = []; let page = '', depth = 0, comment = '';
  for (let i = 0; i < text.length;) {
    if (text.startsWith('<pb:', i)) {
      const end = text.indexOf('>', i); page = text.slice(i + 4, end); i = end + 1; continue;
    }
    const char = String.fromCodePoint(text.codePointAt(i)); i += char.length;
    if (char === '(') { depth++; continue; }
    if (char === ')') { depth--; if (depth < 0) throw new Error('古注括號不匹配'); continue; }
    if (depth) { if (han(char) || '○，、；：。'.includes(char)) comment += char; continue; }
    if (!han(char)) continue;
    if (comment && tokens.length) { tokens.at(-1).comment += comment; comment = ''; }
    tokens.push({ char, comment: '', page, index: tokens.length });
  }
  if (depth) throw new Error('古注括號未結束');
  if (comment && tokens.length) tokens.at(-1).comment += comment;
  const offsets = new Map(); let offset = 0;
  for (const [index, token] of tokens.entries()) { offsets.set(offset, index); offset += normalizeChar(token.char).length; }
  return { tokens, offsets, text: tokens.map(t => normalizeChar(t.char)).join('') };
}

// Exact whole-poem pairing, after the small, documented orthographic map only.
// Unpaired texts stay unpaired instead of guessing an offset across an omission.
export function pairCommentary(body, parsed) {
  const wanted = normalizeHan(body); const start = parsed.text.indexOf(wanted);
  if (start < 0 || parsed.text.indexOf(wanted, start + 1) >= 0) return null;
  return parsed.tokens.slice(parsed.offsets.get(start), parsed.offsets.get(start) + [...wanted].length);
}

const positionsFor = char => [...new Map(TshetUinh.資料.query字頭(char).map(e => [e.音韻地位.描述, e.音韻地位])).values()];
const allEntries = [...TshetUinh.資料.iter音韻地位()].flatMap(p => TshetUinh.資料.query音韻地位(p));
export function initialSoundGloss(note) {
  if (/^(賦也|興也|比也)/u.test(note)) return null;
  const direct = note.match(/^音(\p{Script=Han})/u);
  if (direct) return { direct: direct[1], quote: direct[0] };
  const fanqie = note.match(/^([\p{Script=Han}]{2})反/u);
  return fanqie ? { fanqie: fanqie[1], quote: fanqie[0] } : null;
}
export function resolveNote(char, note) {
  // Only the initial conventional sound gloss; never 叶/協/又音 or prose glosses.
  // 又 can itself be the direct-sound character or a fanqie speller.
  const head = initialSoundGloss(note);
  const fq = head?.fanqie, direct = head?.direct;
  const known = TshetUinh.資料.query字頭(char);
  const entries = known.length ? known : allEntries;
  let candidates = [];
  if (fq) {
    const canonical = [...fq].map(normalizeSoundChar).join('');
    const exact = entries.filter(e => [...(e.反切 || '')].map(normalizeSoundChar).join('') === canonical).map(e => e.音韻地位.描述);
    if (exact.length) candidates = exact;
    else {
      const [upper, lower] = [...canonical];
      const initials = new Set(positionsFor(upper).map(p => p.母));
      const finals = positionsFor(lower);
      // The dictionary encodes lip initials with 呼=null. In a fanqie that is
      // not evidence against 開/合 in the other syllable. Still require the
      // rhyme, tone and division, and accept only one resulting position.
      const lip = p => '幫滂並明'.includes(p.母);
      candidates = entries.filter(e => initials.has(e.音韻地位.母) && finals.some(p =>
        p.韻 === e.音韻地位.韻 && p.聲 === e.音韻地位.聲 && p.等 === e.音韻地位.等 &&
        (p.呼 === e.音韻地位.呼 || lip(p) || lip(e.音韻地位)))).map(e => e.音韻地位.描述);
    }
  } else if (direct) {
    const sounds = new Set(positionsFor(normalizeSoundChar(direct)).map(p => p.描述));
    candidates = known.length ? entries.filter(e => sounds.has(e.音韻地位.描述)).map(e => e.音韻地位.描述) : [...sounds];
  }
  const unique = [...new Set(candidates)];
  return unique.length === 1 ? { position: unique[0], quote: fq ? `${fq}反` : `音${direct}`, method: fq ? 'fanqie' : 'direct-sound', dictionaryAbsent: !known.length } : null;
}

export function contextualNotes(body, sources, editionDifferences = []) {
  const chars = [...body].filter(han);
  return chars.map((char, index) => {
    const start = Math.max(0, Math.min(index - 5, chars.length - 11)), end = Math.min(chars.length, start + 11);
    const context = chars.slice(start, end).map(normalizeChar).join('');
    if ([...context].length < 8) return [];
    const matches = [];
    for (const { file, parsed } of sources) {
      const scoped = editionDifferences.filter(d => d.file === file && d.index >= start && d.index < end);
      // Different headwords never inherit one another's sound gloss.
      if (scoped.some(d => d.index === index)) continue;
      const wantedChars = chars.slice(start, end).map((c, i) => normalizeChar(scoped.find(d => d.index === start + i)?.sourceChar ?? c));
      const wanted = wantedChars.join('');
      let offset = -1;
      while ((offset = parsed.text.indexOf(wanted, offset + 1)) >= 0) {
        const relativeOffset = wantedChars.slice(0, index - start).join('').length;
        const token = parsed.tokens[parsed.offsets.get(offset + relativeOffset)];
        if (!token) throw new Error('古注字元索引錯位');
        if (token.comment) {
          const first = parsed.offsets.get(offset);
          const sourceContext = parsed.tokens.slice(first, first + end - start).map(t => t.char).join('');
          const differences = [...sourceContext].flatMap((sourceChar, i) => sourceChar === chars[start + i] ? [] : [{ index: start + i, bodyChar: chars[start + i], sourceChar, kind: scoped.some(d => d.index === start + i) ? 'edition-text-difference' : 'orthography' }]);
          matches.push({ file, ...token, context, sourceContext, differences, resolved: resolveNote(char, token.comment) });
        }
      }
    }
    return matches;
  });
}
