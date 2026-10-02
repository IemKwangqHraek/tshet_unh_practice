import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { alignPolyhedron, parsePolyhedronPairs, matchesPolyhedron, syllablesIn, isHan } from '../src/polyhedron.js';
import { parseImport, documentStatus, exportDocument } from '../src/corpus.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourceManifest = JSON.parse(await readFile(`${root}scripts/corpus-sources.json`, 'utf8'));
const sourceDir = `${root}.cache/corpus-sources`;
const outputDir = `${root}public/corpora`;
const check = process.argv.includes('--check');
await mkdir(sourceDir, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const files = {};
for (const source of sourceManifest) {
  const path = `${sourceDir}/${source.file}`;
  let bytes;
  try { bytes = await readFile(path); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const response = await fetch(source.url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`${response.status}: ${source.url}`);
    bytes = Buffer.from(await response.arrayBuffer());
    if (hash(bytes) !== source.sha256) throw new Error(`來源 SHA-256 不符：${source.file}`);
    await writeFile(path, bytes);
  }
  if (hash(bytes) !== source.sha256) throw new Error(`快取 SHA-256 不符：${source.file}`);
  files[source.file] = bytes.toString('utf8');
}

const polySource = sourceManifest.find(s => s.file === 'poly-tang.txt');
const polyURL = 'https://github.com/biopolyhedron/middle-chinese-text-label';
const polyLicense = 'CC BY-NC-SA 3.0 · polyhedron（原始檔檔頭授權）；非商業使用、署名、相同方式分享';
const provenance = (pack, extra = {}) => ({ annotator: 'polyhedron', annotationCommit: polySource.commit,
  converter: 'polyhedron-reverse-v1', schemeCommit: 'cdf3891543d6cfe8e20b2784b2baf0e3be2c2bbe',
  dictionary: 'tshet-uinh 0.15.4', annotationFile: pack, ...extra });
const packs = {};
const entries = [];
const failures = [];
function add(pack, document, id) {
  const [parsed] = parseImport(JSON.stringify(document), 'json');
  const stats = documentStatus(parsed);
  const data = { ...exportDocument(parsed), id };
  delete data.version;
  // Keep immutable corpus downloads compact. The importer restores token defaults.
  data.tokens = data.tokens.map(t => Object.fromEntries(Object.entries(t).filter(([key, value]) =>
    !(['position','confirmed','skip','audit'].includes(key) && (!value || Array.isArray(value) && !value.length))
    && !(key === 'positions' && !value.length))));
  packs[pack] ??= [];
  entries.push({ id, title: data.title, author: data.author, category: data.category, pack,
    index: packs[pack].length, total: stats.total, ready: stats.ready, pending: stats.pending,
    excerpt: data.tokens.map(t=>t.char).join('').slice(0,65) });
  packs[pack].push(data);
}

// Ancient texts only: exclude the twentieth-century poem and newspaper reports.
const nkBlocks = files['nk-index.txt'].trim().split(/\n\s*\n/);
for (const [i, block] of nkBlocks.entries()) {
  if (![0,1,2,3,4,5,6,7,8,9,10,11,12,13,15,16].includes(i)) continue;
  const [document] = parseImport(block, 'txt', { split: false,
    source: 'https://github.com/nk2028/tshet-uinh-text-label', license: 'CC0-1.0' });
  add('classics', { ...exportDocument(document), category: i >= 5 && i <= 13 ? '宋詞' : i < 5 ? '詩歌' : '古文',
    provenance: { annotationCommit: sourceManifest.find(s=>s.file==='nk-index.txt').commit,
      annotationFile: 'index.txt', method: 'upstream-position-annotation' } }, `nk-${i}`);
}

for (const [i, document] of parsePolyhedronPairs(files['poly-analects.txt'], { allowUnaligned: true }).entries()) {
  const p = provenance('luon_ngiox.txt', document.provenance);
  if (p.alignmentError) failures.push({ pack: 'analects', title: document.title, reason: p.alignmentError });
  add('analects', { ...document, author: '孔子及弟子', category: '論語', source: polyURL,
    license: polyLicense, provenance: p }, `poly-analects-${i+1}`);
}

const jsonTextSource = sourceManifest.find(s => s.file === 'tang-original.json');
const rimeTextSource = sourceManifest.find(s => s.file === 'rime-tang.txt');
const originals = JSON.parse(files['tang-original.json']).map(p => ({...p, textSource: jsonTextSource.url, textLicense: 'MIT'}));
// Only 詩文 is taken from this transcription; modern introductions and rhyme notes are excluded.
for (const block of files['rime-tang.txt'].split(/\n\s*\n/)) {
  const title = block.match(/^詩名:(.+)$/m)?.[1];
  const author = block.match(/^作者:(.+)$/m)?.[1];
  const body = block.match(/^詩文:(.+)$/m)?.[1]?.replace(/^\([^)]*\)/, '');
  if (title && author && body) originals.push({ title, author, paragraphs: body.match(/[^。！？]+[。！？]?/g) ?? [body],
    tags: [block.match(/^詩體:(.+)$/m)?.[1] || ''], textSource: rimeTextSource.url,
    textLicense: '古典作品公有領域；正文轉錄自 rime-aca/corpus（整理倉庫未明示授權）' });
}
// Duplicate transcriptions with the same characters cannot compete as distinct matches.
const candidates = [...new Map(originals.map(p=>[[p.author,...p.paragraphs].join('').replace(/[^\p{Script=Han}]/gu,''),p])).values()]
  .map(p=>({ ...p, chars:[...p.paragraphs.join('')].filter(isHan) }));
const blocks = files['poly-tang.txt'].replace(/^(\d+)\.\s*([^\r\n]+)$/gm,'$1.\n\n$2').split(/^\s*(\d+)\.\s*$/m).slice(1);
for (let i = 0; i < blocks.length; i += 2) {
  const number = +blocks[i];
  const [romanTitle, romanAuthor, ...body] = blocks[i+1].split('\n').map(s=>s.trim()).filter(s=>s && !s.startsWith('#'));
  // No. 23 contains an unpaired prose preface; retain it as evidence and convert the poem body.
  const excludedPrefaceRomanization = number===23 ? body.shift() : '';
  const romanization = body.join('\n');
  const spellings = body.flatMap(syllablesIn);
  const authorSpellings = syllablesIn(romanAuthor);
  let authorCandidates = candidates.filter(p=>{
    const chars=[...p.author].filter(isHan);
    return chars.length===authorSpellings.length && chars.every((c,j)=>matchesPolyhedron(c,authorSpellings[j]));
  });
  let authorMatched = true;
  if (!authorCandidates.length) {
    // Old romanizations of proper names may differ from the current dictionary.
    // Only accept an otherwise unique, near-exact complete body in this case.
    authorMatched = false;
    authorCandidates = candidates.filter(p=>p.chars.length===spellings.length &&
      p.chars.filter((c,j)=>matchesPolyhedron(c,spellings[j])).length/p.chars.length>=.9);
  }
  // Try complete poems, then multiple poems grouped under one numbered source entry.
  function matchFrom(offset) {
    return authorCandidates.filter(p=>p.chars.length<=spellings.length-offset).map(p=>({p,
      ratio:p.chars.filter((c,j)=>matchesPolyhedron(c,spellings[offset+j])).length/p.chars.length
    })).filter(m=>m.ratio>=.8).sort((a,b)=>
      Number(b.p.chars.length===spellings.length-offset)-Number(a.p.chars.length===spellings.length-offset) || b.ratio-a.ratio);
  }
  const matches=[];
  let offset=0;
  while(offset<spellings.length) {
    const ranked=matchFrom(offset);
    const best=ranked[0];
    if(!best) break;
    const runner=ranked[1];
    const sameTextVariant=runner && best.p.chars.length===runner.p.chars.length &&
      best.p.chars.filter((c,j)=>c===runner.p.chars[j]).length/best.p.chars.length>=.85;
    if(runner && best.p.chars.length===runner.p.chars.length && Math.abs(best.ratio-runner.ratio)<.015 && !sameTextVariant) break;
    matches.push(best);
    offset+=best.p.chars.length;
  }
  if (offset !== spellings.length) {
    failures.push({ pack:'tang', number, romanTitle, reason:'未找到完整且唯一的原文配對，未作逐字轉換', syllables:spellings.length });
    continue;
  }
  const text = matches.map(m=>m.p.paragraphs.join('\n')).join('\n\n');
  let tokens;
  try { tokens=alignPolyhedron(text,romanization); }
  catch(error) { throw new Error(`唐詩 ${number} ${matches.map(m=>m.p.title)} ${matches.map(m=>m.p.chars.length)}：${error.message}`); }
  let title=matches.length===1?matches[0].p.title:matches.map(m=>m.p.title).join('／');
  if(excludedPrefaceRomanization) title=title.replace(/并序|並序/,'')+'（正文）';
  const category=matches.some(m=>m.p.tags.some(t=>/樂府|乐府/.test(t)))?'樂府':'唐詩';
  add('tang',{title,author:matches[0].p.author,source:polyURL,license:polyLicense,category,tokens,
    provenance:provenance('dang_sji_300_sjux.txt',{sourceNumber:number,romanTitle,romanAuthor,
      originalRomanization:romanization, textSources:[...new Set(matches.map(m=>m.p.textSource))],
      textLicenses:[...new Set(matches.map(m=>m.p.textLicense))], pairingScores:matches.map(m=>m.ratio),
      authorMatched, ...(excludedPrefaceRomanization?{excludedPrefaceRomanization}: {})})},`poly-tang-${number}`);
}

const catalogue={version:1,entries};
const report={version:1,sources:sourceManifest,counts:Object.fromEntries(Object.entries(packs).map(([pack,docs])=>{
  const rows=entries.filter(e=>e.pack===pack);
  return[pack,{documents:docs.length,readyDocuments:rows.filter(e=>!e.pending).length,
    characters:rows.reduce((sum,e)=>sum+e.total,0),readyCharacters:rows.reduce((sum,e)=>sum+e.ready,0)}];
})),failures};
const outputs = { 'src/data/catalogue.json': catalogue, 'docs/corpus-report.json': report,
  ...Object.fromEntries(Object.entries(packs).map(([pack,documents])=>[`public/corpora/${pack}.json`,{version:1,documents}])) };
await mkdir(outputDir,{recursive:true});
for (const [path,data] of Object.entries(outputs)) {
  const bytes=JSON.stringify(data)+ '\n';
  if(check) { if(await readFile(`${root}${path}`,'utf8')!==bytes)throw new Error(`語料輸出過期：${path}`); }
  else await writeFile(`${root}${path}`,bytes);
}
console.log(JSON.stringify({counts:report.counts,alignmentFailures:failures.length},null,2));
