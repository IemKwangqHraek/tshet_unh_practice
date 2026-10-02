import { derive, inDictionary, readingsFor } from './phonology.js';

const isHan = char => /\p{Script=Han}/u.test(char);
export const newId = () => globalThis.crypto?.randomUUID?.() ?? `text-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[x]));
const positions = value => Array.isArray(value) ? value.map(String) : String(value ?? '').split(/[|｜;；]/).map(s => s.trim()).filter(Boolean);

function makeToken(char, position = '', extra = {}) {
  return { char, positions: positions(position), position: '', confirmed: false, skip: false, audit: [], ...extra };
}

export function parseAnnotated(text) {
  const chars = [...text];
  const tokens = [];
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const open = chars[i + 1];
    if (isHan(char) && (open === '(' || open === '（')) {
      const close = open === '(' ? ')' : '）';
      let j = i + 2;
      while (j < chars.length && chars[j] !== close && j - i < 100 && chars[j] !== '\n' && chars[j] !== '(' && chars[j] !== '（') j++;
      if (open === '(' && chars[j] !== close) throw new Error(`「${char}」後的標註缺少右括號，或標註內容過長。`);
      if (chars[j] === close) {
        const label = chars.slice(i + 2, j).join('');
        // Fullwidth prose parentheses such as （孟浩然） remain part of the original text.
        if (open === '(' || /[一二三四ABC].*[平上去入]$/.test(label) || label === '補充:怎') {
          tokens.push(makeToken(char, label));
          i = j;
          continue;
        }
      }
    }
    tokens.push(makeToken(char));
  }
  return tokens;
}

export function inspectToken(token) {
  if (!isHan(token.char)) return { status: 'punctuation' };
  if (token.skip) return { status: 'skipped' };
  const candidates = token.position ? [token.position] : token.positions ?? [];
  if (candidates.length === 0) return { status: 'missing' };
  if (candidates.length > 1 && !token.position) return { status: 'multiple' };
  try {
    const reading = derive(candidates[0], token.char);
    if (!inDictionary(token.char, reading.position) && !token.confirmed) return { status: 'absent', reading };
    return { status: 'ready', reading };
  } catch (error) { return { status: 'invalid', error: error.message }; }
}

export function confirmToken(token, position) {
  const reading = derive(position, token.char);
  token.audit ??= [];
  token.audit.push({ action: 'confirm', before: token.position || token.positions, after: reading.position, at: new Date().toISOString() });
  token.position = reading.position;
  token.confirmed = true;
  token.skip = false;
  return reading;
}

export function skipToken(token) {
  token.audit ??= [];
  token.audit.push({ action: 'skip', at: new Date().toISOString() });
  token.skip = true;
}

function documentFromTokens(tokens, meta = {}) {
  if (!tokens.some(t => isHan(t.char))) throw new Error('語料中沒有可練習的漢字');
  return { id: newId(), title: meta.title || '未命名語料', author: meta.author || '', source: meta.source || '',
    license: meta.license || '', createdAt: new Date().toISOString(), tokens };
}

export function parseText(text, options = {}) {
  const cleaned = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (!cleaned) throw new Error('請先選擇文件或貼入標註文本');
  const blocks = options.split !== false ? cleaned.split(/\n\s*\n/) : [cleaned];
  return blocks.filter(s => s.trim()).map((block, blockIndex) => {
    const lines = block.split('\n');
    let title = options.title || (options.filename || '我的練習').replace(/\.[^.]+$/, '');
    let author = options.author || '';
    const first = parseAnnotated(lines[0]).map(t => t.char).join('');
    if (lines.length > 1 && (/^#\s/.test(first) || /（[^）]+）$/.test(first))) {
      const match = first.match(/^(.*?)（([^）]+)）$/);
      title = match ? match[1].trim() : first.replace(/^#\s*/, '').trim();
      author = match ? match[2] : author;
      lines.shift();
    } else if (blocks.length > 1) title += ` · ${blockIndex + 1}`;
    return documentFromTokens(parseAnnotated(lines.join('\n')), { ...options, title, author });
  });
}

export function parseTSV(text, options = {}) {
  const lines = text.replace(/^\uFEFF/, '').trimEnd().split(/\r?\n/).filter(l => l.trim());
  const first = lines[0]?.split('\t') ?? [];
  const charNames = ['字', '字頭', '原文字', 'char', 'character'];
  const posNames = ['音韻地位', '地位', 'position', 'positions'];
  let charCol = first.findIndex(s => charNames.includes(s.trim()));
  let posCol = first.findIndex(s => posNames.includes(s.trim()));
  if (charCol >= 0 && posCol >= 0) lines.shift();
  else { charCol = 0; posCol = 1; }
  const tokens = lines.map((line, i) => {
    const row = line.split('\t');
    const char = row[charCol] || '';
    if ([...char].length !== 1) throw new Error(`TSV 第 ${i + 1} 個資料列的「字」欄必須只有一個字`);
    return makeToken(char, row[posCol]);
  });
  return [documentFromTokens(tokens, { ...options, title: options.title || options.filename?.replace(/\.[^.]+$/, '') })];
}

function parseJSONDocument(item, options) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('JSON 每篇語料必須是物件');
  for (const key of ['title', 'author', 'source', 'license']) {
    if (item[key] !== undefined && typeof item[key] !== 'string') throw new Error(`JSON 的 ${key} 欄必須是文字`);
  }
  let tokens;
  if (Array.isArray(item.tokens)) {
    tokens = item.tokens.flatMap(entry => {
      if (typeof entry === 'string') return [...entry].map(c => makeToken(c));
      if (!entry || typeof entry.char !== 'string' || [...entry.char].length !== 1) throw new Error('每個 token 的 char 必須是一個字');
      return [makeToken(entry.char, entry.positions || entry.position, {
        position: typeof entry.position === 'string' ? entry.position : '',
        confirmed: entry.confirmed === true, skip: entry.skip === true,
        audit: Array.isArray(entry.audit) ? entry.audit : [] })];
    });
  } else if (typeof item.text === 'string') {
    tokens = [...item.text].map(c => makeToken(c));
    if (item.annotations !== undefined && !Array.isArray(item.annotations)) throw new Error('JSON 的 annotations 必須是陣列');
    for (const annotation of item.annotations ?? []) {
      if (!Number.isInteger(annotation.index) || !tokens[annotation.index]) throw new Error('annotations.index 必須是有效的零起始字元索引');
      if (annotation.char && annotation.char !== tokens[annotation.index].char) throw new Error('標註的字與原文索引不一致');
      tokens[annotation.index] = makeToken(tokens[annotation.index].char, annotation.positions || annotation.position);
    }
  } else throw new Error('JSON 必須包含 tokens 或 text 與 annotations');
  return documentFromTokens(tokens, { ...options, title: item.title || options.title, author: item.author,
    source: item.source || options.source, license: item.license || options.license });
}

export function parseImport(text, format = 'auto', options = {}) {
  if (text.length > 2_000_000) throw new Error('單次導入上限為 2 MB，請將語料分篇導入');
  const trimmed = text.trim();
  if (format === 'auto') format = /^[\[{]/.test(trimmed) ? 'json' : trimmed.includes('\t') ? 'tsv' : 'txt';
  if (format === 'txt') return parseText(text, options);
  if (format === 'tsv') return parseTSV(text, options);
  if (format === 'json') {
    let parsed;
    try { parsed = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw new Error('JSON 格式無效，請檢查引號、逗號與括號'); }
    const documents = Array.isArray(parsed) ? parsed : Array.isArray(parsed.documents) ? parsed.documents : [parsed];
    if (!documents.length) throw new Error('JSON 沒有語料');
    return documents.map(item => parseJSONDocument(item, options));
  }
  throw new Error('不支援的文件格式');
}

export function documentStatus(doc) {
  const stats = { ready: 0, missing: 0, multiple: 0, absent: 0, invalid: 0, skipped: 0, total: 0, pending: 0 };
  for (const token of doc.tokens) {
    const { status } = inspectToken(token);
    if (status === 'punctuation') continue;
    stats[status]++;
    stats.total++;
  }
  stats.pending = stats.missing + stats.multiple + stats.absent + stats.invalid;
  return stats;
}

export function practiceTokens(doc) {
  if (documentStatus(doc).pending) throw new Error('請先完成讀音校對');
  return doc.tokens.flatMap((token, index) => {
    const info = inspectToken(token);
    return info.status === 'ready' ? [{ ...info.reading, char: token.char, sourceIndex: index }] : [];
  });
}

export function suggestions(token) {
  const suggested = readingsFor(token.char);
  for (const position of token.positions ?? []) {
    try {
      const reading = derive(position, token.char);
      if (!suggested.some(r => r.position === reading.position)) suggested.unshift({ ...reading, fanqie: '原始標註' });
    } catch { /* Invalid original annotations remain visible in the review row. */ }
  }
  return suggested;
}

export function exportDocument(doc) {
  return { version: 1, title: doc.title, author: doc.author, source: doc.source, license: doc.license, tokens: doc.tokens };
}
