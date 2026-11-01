import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import wangScans from './snapshots/shijing-wang-scans.json' with { type: 'json' };

const root = fileURLToPath(new URL('../', import.meta.url));
const archivePath = path.join(root, 'public/collations/shijing-three-schools-archive.json');
const indexPath = path.join(root, 'src/data/shijing-three-schools-archive-index.json');
const textPath = path.join(root, 'public/collations/shijing-three-schools-archive.txt');
const hash = value => createHash('sha256').update(value).digest('hex');
const norm = text => [...text.normalize('NFKC')].filter(c => /\p{Script=Han}/u.test(c)).join('');
const json = value => JSON.stringify(value, null, 2) + '\n';
const chapterName = chapter => chapter.chapterName.map(item => item.content).join('');

export const sourceBooks = [
  { id: 'chen', title: '詩經四家異文考', author: '陳喬樅', edition: '皇清經解續編卷一千一百七十一至一千一百七十五', bookId: 'CADAL06210229',
    catalogueNote: '識典書目誤標《群經識小》；書名及作者據各卷內題，不沿用外部書目。',
    referenceUrl: 'https://ctext.org/library.pl?if=en&res=1361', volumes: 5 },
  { id: 'feng', title: '三家詩異文疏證', author: '王應麟集考、馮登府補釋', edition: '識典古籍所載影印轉錄，六卷、補遺三卷及卷首、目錄', bookId: 'NGJ89241200000252019990',
    catalogueNote: '補充參照書；家別分卷編排仍保留於原書，不據單字或家名出現自動歸屬。', volumes: 11 },
  { id: 'yishuo', title: '三家詩遺說考', author: '陳壽祺撰、陳喬樅述', edition: '光緒八年本（識典古籍轉錄），魯詩六卷、齊詩四卷、韓詩五卷及卷首目錄，電子目錄分為58段', bookId: 'CADAL01032644',
    catalogueNote: '兼收佚文、詩說、訓詁及異文。分家沿用輯書分類，仍須逐條辨別直接證據與輯者推論，不將全書都當成經文字異。', volumes: 58 },
];

export function alignQuotation(text, documents, windows) {
  // A single-character mismatch is only a search aid. It never becomes an
  // attributed reading, nor is an OCR glyph silently corrected to the corpus.
  const lead = text.split(/[，。；：！？\n]/u)[0].trim();
  const quote = norm(lead);
  if ([...quote].length < 4 || [...quote].length > 10 || /^(案|按|又|毛詩|皇淸|皇清|三家詩)/u.test(lead)) return null;
  if (documents.some(doc => doc.normalized.includes(quote))) return null;
  const hits = [];
  for (const item of windows.get([...quote].length) || []) {
    const chars = [...quote];
    let count = 0;
    for (let n = 0; n < chars.length; n++) if (chars[n] !== item.chars[n]) count++;
    if (count === 1) hits.push(item);
  }
  const unique = [...new Map(hits.map(item => [item.poemId + ':' + item.siteQuote, item])).values()];
  if (unique.length !== 1) return null;
  const hit = unique[0];
  return { poemId: hit.poemId, title: hit.title, siteQuote: hit.siteQuote, sourceQuote: lead, position: hit.position, status: '自動對句・待核' };
}

export function buildCandidates(records, documents) {
  const docs = documents.map(doc => ({ ...doc, body: doc.tokens.map(token => token.char).join('') }));
  for (const doc of docs) doc.normalized = norm(doc.body);
  const windows = new Map();
  for (const doc of docs) {
    const chars = [...doc.body];
    // Keep token offsets, including punctuation and supplementary-plane glyphs.
    // A comparison window must contain exactly the requested number of Han
    // characters; a short window ending at punctuation is not a one-letter hit.
    for (let length = 4; length <= 10; length++) {
      const bucket = windows.get(length) || [];
      for (let position = 0; position <= chars.length - length; position++) {
        const siteQuote = chars.slice(position, position + length).join('');
        if ([...norm(siteQuote)].length !== length) continue;
        bucket.push({ poemId: doc.id, title: doc.title, siteQuote, chars: [...norm(siteQuote)], position });
      }
      windows.set(length, bucket);
    }
  }
  return records.flatMap(record => {
    const text = record.lines.filter(line => line.type === 1).map(line => line.text).join('');
    const match = alignQuotation(text, docs, windows);
    return match ? [{ id: 'candidate-' + record.id, recordId: record.id, ...match }] : [];
  });
}

async function importCache(cache) {
  const records = [], volumes = [];
  for (const book of sourceBooks) {
    const filenames = (await readdir(cache)).filter(file => book.id === 'chen' ? /^chen-[1-5]\.json$/u.test(file) : new RegExp('^' + book.id + '-1[a-z0-9]+\\.json$', 'u').test(file));
    if (filenames.length !== book.volumes) throw new Error(`${book.title} 缺卷：${filenames.length}/${book.volumes}`);
    const sources = await Promise.all(filenames.map(async filename => {
      const raw = await readFile(path.join(cache, filename), 'utf8');
      return { filename, raw, source: JSON.parse(raw) };
    }));
    sources.sort((a, b) => a.source.chapter.startPageNum - b.source.chapter.startPageNum);
    for (const [number, { filename, raw, source }] of sources.entries()) {
      const { chapter, paragraphs, ssrChapterId, sourceUrl } = source;
      if (ssrChapterId !== chapter.chapterId || paragraphs.length !== chapter.paragraphCount) throw new Error(`轉錄不完整：${filename}`);
      const id = `${book.id}-v${number + 1}`;
      const name = book.id === 'chen' ? `卷${['一','二','三','四','五'][number]}` : chapterName(chapter);
      const volume = { id, bookId: book.id, name, sourceChapterName: chapterName(chapter), chapterId: chapter.chapterId,
        volumeId: chapter.volumeId, volumeVersion: chapter.volumeVersion, url: sourceUrl,
        expectedParagraphs: chapter.paragraphCount, sourceFile: filename, sourceFileSha256: hash(raw) };
      const school = book.id === 'yishuo' && name.match(/^([魯齊韓])詩遺說攷/u)?.[1];
      if (school) volume.sourceSchool = school;
      const rows = paragraphs.map((paragraph, index) => {
        if (paragraph.contentEncryptType !== 0 || paragraph.chapterId !== chapter.chapterId || paragraph.inChapterOrder !== index + 1) throw new Error(`段落不連續或未開放：${filename}:${index + 1}`);
        const lines = JSON.parse(paragraph.content).lines.map(line => ({ type: line.lineType, text: line.content || '', ...(line.pagePass?.PageId ? { pageId: line.pagePass.PageId } : {}) }));
        const text = lines.map(line => line.text).join('');
        return { id: `${id}-p${String(index + 1).padStart(4, '0')}`, bookId: book.id, volumeId: id, number: index + 1,
          sourceParagraphId: paragraph.paragraphId, startPageId: paragraph.startPageId, endPageId: paragraph.endPageId,
          lines, text, sha256: hash(JSON.stringify(lines)),
          ...(school ? { sourceSchool: school, schoolBasis: '沿用《三家詩遺說考》分卷歸類，非自動對句所得，尚待逐條覆核' } : {}),
          familiesMentioned: ['齊','魯','韓'].filter(school => new RegExp(school + '[齊魯韓、與及]*(詩|說)', 'u').test(text)), status: '轉錄待校' };
      });
      volume.textSha256 = hash(rows.map(record => record.text).join('\n'));
      volumes.push(volume); records.push(...rows);
    }
  }
  const { documents } = JSON.parse(await readFile(path.join(root, 'public/corpora/shijing.json'), 'utf8'));
  const candidates = buildCandidates(records, documents);
  return { version: 2, retrievedOn: '2026-10-31', title: '三家詩原書輯錄・待校底稿',
    coverage: '全錄《詩經四家異文考》五卷、《三家詩異文疏證》六卷及補遺三卷、《三家詩遺說考》魯六卷、齊四卷、韓五卷，包含各書卷首目錄。《詩三家義集疏》另有十冊公開影印，文字尚未全錄。',
    verification: '保留來源轉錄全部段落、大小字及換頁標識。存在 OCR 誤字、殘缺及版心混入；未經逐頁影印核定。對句候選只按一字差異檢索，可能誤配，不能據此認定異文或家別。',
    attribution: '家別線索分為「原書編入某家」與「段中提及某家」，分別保存。原書分家仍可能是輯者推論。毛詩異本、音讀、訓詁、引文差異與考語均保留，不自動算作齊、魯、韓經文字異。',
    missingSources: [{ title: '詩三家義集疏', author: '王先謙', status: '影印可用，文字未全錄', url: 'https://ctext.org/wiki.pl?if=gb&res=598482',
      reason: '已定位十冊公開影印PDF，共1547頁；檔名卷次有跳號與重疊，須按內題核實。抽查第六冊無文字層，直排與夾注的OCR仍待處理。可先用公開影印與其他輯書，無須使用者為本項工作先訂閱API。' }],
    scanSources: wangScans, books: sourceBooks, volumes, records, candidates };
}

export function archiveIndex(archive) {
  return { version: archive.version, retrievedOn: archive.retrievedOn, coverage: archive.coverage, verification: archive.verification, attribution: archive.attribution,
    records: archive.records.length, candidates: archive.candidates.length, books: archive.books, volumes: archive.volumes, missingSources: archive.missingSources, scanSources: archive.scanSources,
    poems: [...new Map(archive.candidates.map(row => [row.poemId, { id: row.poemId, title: row.title, candidates: archive.candidates.filter(other => other.poemId === row.poemId).length }])).values()] };
}

export function archiveText(archive) {
  const books = new Map(archive.books.map(book => [book.id, book]));
  const volumes = new Map(archive.volumes.map(volume => [volume.id, volume]));
  return `${archive.title}\n${archive.coverage}\n${archive.verification}\n${archive.attribution}\n\n` + archive.records.map(record => {
    const volume = volumes.get(record.volumeId), book = books.get(record.bookId);
    return `【${record.id}】${book.author}《${book.title}》${volume.name}・轉錄第 ${record.number} 段\n來源段號：${record.sourceParagraphId}\n${volume.url}\n` + record.lines.map(line => line.type === 3 ? `〔換頁 ${line.pageId || ''}〕` : line.type === 2 ? `〔小字〕${line.text}〔/小字〕` : line.text).join('') + '\n';
  }).join('\n');
}

async function main() {
  const args = process.argv.slice(2), imported = args.indexOf('--import-cache');
  const archive = imported >= 0 ? await importCache(path.resolve(root, args[imported + 1] || '.cache/three-schools-sources')) : JSON.parse(await readFile(archivePath, 'utf8'));
  if (new Set(archive.records.map(row => row.id)).size !== archive.records.length) throw new Error('段落識別碼重複');
  for (const volume of archive.volumes) {
    const records = archive.records.filter(row => row.volumeId === volume.id);
    if (records.length !== volume.expectedParagraphs || hash(records.map(row => row.text).join('\n')) !== volume.textSha256) throw new Error(`卷文不完整：${volume.id}`);
    for (const [index, row] of records.entries()) if (row.number !== index + 1 || row.text !== row.lines.map(line => line.text).join('') || hash(JSON.stringify(row.lines)) !== row.sha256) throw new Error(`段落校驗失敗：${row.id}`);
  }
  const outputs = [[archivePath, json(archive)], [indexPath, json(archiveIndex(archive))], [textPath, archiveText(archive)]];
  if (args.includes('--check')) {
    for (const [filename, content] of outputs) if (await readFile(filename, 'utf8') !== content) throw new Error(`輸出須更新：${filename}`);
  } else {
    await mkdir(path.dirname(archivePath), { recursive: true });
    for (const [filename, content] of outputs) await writeFile(filename, content);
  }
  console.log(`${archive.volumes.length} 個來源分段，${archive.records.length} 段原文，${archive.candidates.length} 待校對句。`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
