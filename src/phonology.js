import TshetUinh from 'tshet-uinh';
import layout from './data/layout.json' with { type: 'json' };
import syllables from './data/syllables.json' with { type: 'json' };
import { deriveRaw } from './scheme.js';

export { layout, syllables };
const cache = new Map();

export function derive(position, char = '') {
  const description = String(position ?? '').trim();
  const key = `${char}:${description}`;
  if (cache.has(key)) return cache.get(key);
  const supplemental = char === '怎' && description === '補充:怎';
  let p = null;
  if (!supplemental) {
    try { p = TshetUinh.音韻地位.from描述(description); }
    catch { throw new Error(`音韻地位「${description}」無效，請檢查聲母、等呼、韻與聲調。`); }
  }
  const full = deriveRaw({}, p, char);
  const parts = deriveRaw({ 輸出: '三段' }, p, char).split(' / ').map(x => x === '∅' ? '' : x);
  const triple = deriveRaw({ 輸出: '三拼' }, p, char);
  if (!/^[a-z]+$/.test(full) || !/^[A-Z]{3}$/.test(triple)) throw new Error('此讀音無可用的全拼或三拼');
  const result = { position: supplemental ? description : p.描述, full, parts, triple,
    initial: p?.母 ?? '精', rhyme: p?.韻 ?? '補充', tone: p?.聲 ?? '上',
    openness: p?.呼 ?? '—', division: p?.等 ?? '三', category: p?.類 ?? '' };
  cache.set(key, result);
  return result;
}

export function readingsFor(char) {
  if (char === '怎') return [{ ...derive('補充:怎', char), fanqie: '本方案補充' }];
  const seen = new Set();
  return TshetUinh.資料.query字頭(char).flatMap(entry => {
    const position = entry.音韻地位.描述;
    if (seen.has(position)) return [];
    seen.add(position);
    try { return [{ ...derive(position, char), fanqie: entry.反切 || '' }]; }
    catch { return []; }
  });
}

export function inDictionary(char, position) {
  return readingsFor(char).some(r => r.position === position);
}

// Keep every source entry: entries sharing a reading can have different glosses.
export function definitionsFor(char, position) {
  let normalized;
  try { normalized = TshetUinh.音韻地位.from描述(position).描述; }
  catch { return []; }
  return TshetUinh.資料.query字頭(char)
    .filter(entry => entry.音韻地位.描述 === normalized)
    .map(entry => ({
      text: entry.釋義,
      fanqie: entry.反切 || '',
      source: entry.來源?.文獻 === '王三' ? '王三《切韻》' : entry.來源?.文獻 === '廣韻' ? '《廣韻》' : '字庫',
      rhyme: entry.來源?.韻目 || '',
      group: entry.來源?.小韻號 || '',
    }));
}

// Filtering uses complete verified syllables, so keys sharing a fragment remain ambiguous until later keys.
export function keyCandidates(stage, prefix = '', additional = []) {
  const result = Object.fromEntries([... 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(k => [k, []]));
  for (const reading of [...syllables, ...additional]) {
    if (!reading.triple.startsWith(prefix.toUpperCase())) continue;
    const key = reading.triple[stage];
    const fragment = reading.parts[stage];
    if (result[key] && !result[key].includes(fragment)) result[key].push(fragment);
  }
  for (const list of Object.values(result)) list.sort();
  return result;
}

export function allKeyParts(stage) {
  const result = Object.fromEntries([... 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(k => [k, []]));
  for (const [fragment, letter] of Object.entries(layout.keys[`k${stage + 1}`])) result[letter.toUpperCase()].push(fragment);
  for (const list of Object.values(result)) list.sort();
  return result;
}
