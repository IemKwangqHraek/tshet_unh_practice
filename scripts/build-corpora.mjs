import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { alignPolyhedron, parsePolyhedronPairs, syllablesIn, isHan } from '../src/polyhedron.js';
import { parseImport, documentStatus, exportDocument } from '../src/corpus.js';
import { buildShijingDocuments } from './shijing.mjs';
import { reviewHeadwordVariants, matchesReviewedHeadword } from './corpus-editions.mjs';
import tangBaseline from './tang-edition-baseline.json' with { type: 'json' };
import { corpusEditionStatus } from './corpus-edition-status.mjs';
import { reviewCorpusAlignment } from './corpus-alignment-review.mjs';
import { reviewConfirmedHeadwords } from './corpus-confirmed-headwords.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourceManifest = JSON.parse(await readFile(`${root}scripts/corpus-sources.json`, 'utf8'));
const sourceDir = `${root}.cache/corpus-sources`;
const outputDir = `${root}public/corpora`;
const check = process.argv.includes('--check');
const editionSnapshotBytes = await readFile(`${root}scripts/snapshots/tang-dongli.json`);
const editionSnapshot = JSON.parse(editionSnapshotBytes.toString('utf8'));
const editionSourceManifest = JSON.parse(await readFile(`${root}scripts/corpus-edition-sources.json`, 'utf8'));
await mkdir(sourceDir, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
if (hash(editionSnapshotBytes) !== editionSourceManifest[0].sha256) throw new Error('唐詩正文快照 SHA-256 不符');
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
  if (pack !== 'shijing') document = reviewConfirmedHeadwords(reviewHeadwordVariants(reviewCorpusAlignment(document, id)), id);
  if (document.provenance?.alignmentError) failures.push({ pack, title: document.title, reason: document.provenance.alignmentError });
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
// Whole attested editions compete as complete texts; never rebuild words from sounds.
originals.push(...editionSnapshot.documents);
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
  const baseline = tangBaseline.documents.find(d => d.id === `poly-tang-${number}`);
  const baselineChars = [...baseline.text].filter(isHan);
  const authorSpellings = syllablesIn(romanAuthor);
  let authorCandidates = candidates.filter(p=>{
    const chars=[...p.author].filter(isHan);
    return chars.length===authorSpellings.length && chars.every((c,j)=>matchesReviewedHeadword(c,authorSpellings[j]));
  });
  let authorMatched = true;
  if (!authorCandidates.length) {
    // Old romanizations of proper names may differ from the current dictionary.
    // Only accept an otherwise unique, near-exact complete body in this case.
    authorMatched = false;
    authorCandidates = candidates.filter(p=>p.chars.length===spellings.length &&
      p.chars.filter((c,j)=>matchesReviewedHeadword(c,spellings[j])).length/p.chars.length>=.9);
  }
  // Try complete poems, then multiple poems grouped under one numbered source entry.
  function matchFrom(offset) {
    return authorCandidates.filter(p=>p.chars.length<=spellings.length-offset && p.chars.every((c,j)=>
      !matchesReviewedHeadword(baselineChars[offset+j],spellings[offset+j]) || matchesReviewedHeadword(c,spellings[offset+j]))).map(p=>({p,
      ratio:p.chars.filter((c,j)=>matchesReviewedHeadword(c,spellings[offset+j])).length/p.chars.length
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
  const title = baseline.title;
  const oldChars = [...baseline.text].filter(isHan), chars = [...text].filter(isHan);
  if (oldChars.length !== chars.length) throw new Error(`唐詩版本字數改變，須另行覆核：${number}`);
  const textChanges = chars.flatMap((char, index) => char === oldChars[index] ? [] : [{ index, before: oldChars[index], after: char,
    previousContext: oldChars.slice(Math.max(0, index - 6), index + 7).join(''), context: chars.slice(Math.max(0, index - 6), index + 7).join(''),
    sourceReading: spellings[index], beforeCompatible: matchesReviewedHeadword(oldChars[index], spellings[index]), afterCompatible: matchesReviewedHeadword(char, spellings[index]) }]);
  let partStart = 0;
  const alternatives = matches.flatMap(match => {
    const start = partStart; partStart += match.p.chars.length;
    return authorCandidates.filter(p => p.chars.length === match.p.chars.length && p.textSource !== match.p.textSource &&
      p.chars.filter((c, i) => c === match.p.chars[i]).length / p.chars.length >= .85).map(p => ({ title: p.title, source: p.textSource,
      compatibilityRatio: p.chars.filter((c, i) => matchesReviewedHeadword(c, spellings[start + i])).length / p.chars.length,
      introducesSourceConflicts: p.chars.flatMap((char, i) => matchesReviewedHeadword(match.p.chars[i], spellings[start + i]) && !matchesReviewedHeadword(char, spellings[start + i]) ? [start + i] : []),
      differences: p.chars.flatMap((char, i) => char === match.p.chars[i] ? [] : [{ index: start + i, selected: match.p.chars[i], alternate: char }]) }));
  });
  let textStart = 0;
  const textParts = matches.map(({ p }) => {
    const part = { start: textStart, length: p.chars.length, title: p.title, source: p.textSource };
    textStart += p.chars.length;
    return part;
  });
  add('tang',{title,author:baseline.author,source:polyURL,license:polyLicense,category:baseline.category,tokens,
    provenance:provenance('dang_sji_300_sjux.txt',{sourceNumber:number,romanTitle,romanAuthor,
      originalRomanization:romanization, textSources:[...new Set(matches.map(m=>m.p.textSource))], textParts,
      textLicenses:[...new Set(matches.map(m=>m.p.textLicense))], pairingScores:matches.map(m=>m.ratio),
      authorMatched, ...(excludedPrefaceRomanization?{excludedPrefaceRomanization}: {}),
      editionReview: { method: 'whole-attested-text-review-v1', textBasis: '按作者、字數及逐字原注音相容度核對完整正文版本；未按音節反造字句。另一版本的用字保存為異文，不宣稱異文已被排除。',
        ...(textChanges.length ? { previousText: baseline.text, previousSources: baseline.sources } : {}), textChanges, alternatives,
        ...(matches.some(m => m.p.snapshotPage) ? { snapshotCommit: 'snapshot:2026-10-03', snapshotSha256: editionSourceManifest[0].sha256 } : {}) }})},`poly-tang-${number}`);
}

for (const { id, ...document } of buildShijingDocuments(files, sourceManifest)) add('shijing', document, id);

const catalogue={version:1,entries};
const report={version:1,sources:sourceManifest,editionSources:editionSourceManifest,counts:Object.fromEntries(Object.entries(packs).map(([pack,docs])=>{
  const rows=entries.filter(e=>e.pack===pack);
  return[pack,{documents:docs.length,readyDocuments:rows.filter(e=>!e.pending).length,
    characters:rows.reduce((sum,e)=>sum+e.total,0),readyCharacters:rows.reduce((sum,e)=>sum+e.ready,0)}];
})),failures};
const outputs = { 'src/data/catalogue.json': catalogue, 'docs/corpus-report.json': report,
  'docs/corpus-edition-status.json': corpusEditionStatus(packs, files, sourceManifest, editionSourceManifest),
  ...Object.fromEntries(Object.entries(packs).map(([pack,documents])=>[`public/corpora/${pack}.json`,{version:1,documents}])) };
const shijingRows = entries.filter(entry => entry.pack === 'shijing');
const sections = [...new Set(packs.shijing.map(doc => doc.provenance.section))];
const downloads = sections.flatMap((section, index) => {
  const documents = packs.shijing.filter(doc => doc.provenance.section === section);
  const chunks = [[]];
  // File upload checks UTF-8 bytes; Chinese text can exceed that limit even
  // when JSON.length fits the separate pasted-text limit.
  const encodedSize = docs => Buffer.byteLength(JSON.stringify({ version: 1, documents: docs }) + '\n', 'utf8');
  for (const doc of documents) {
    if (encodedSize([doc]) > 2_000_000) throw new Error(`詩經單篇匯出超過導入上限：${doc.title}`);
    if (encodedSize([...chunks.at(-1), doc]) > 1_900_000 && chunks.at(-1).length) chunks.push([]);
    chunks.at(-1).push(doc);
  }
  return chunks.map((partDocs, part) => {
    const name = String(index + 1).padStart(2, '0') + (part ? `-${part + 1}` : '');
    outputs[`public/corpora/shijing/${name}.json`] = { version: 1, documents: partDocs };
    return { section, ...(chunks.length > 1 ? { part: part + 1, parts: chunks.length, label: `${section} ${part + 1}／${chunks.length}` } : {}), documents: partDocs.length, url: `corpora/shijing/${name}.json` };
  });
});
outputs['public/corpora/shijing-downloads.json'] = { version: 1, downloads };
const pendingByChar = new Map(), methods = {};
for (const doc of packs.shijing) {
  for (const token of doc.tokens.filter(token => /\p{Script=Han}/u.test(token.char))) {
    const method = token.position ? token.audit?.[0]?.action === 'editorial-selection' ? 'pilot-selection' : token.audit?.length ? doc.provenance.readingNotes.find(note => note.id === token.audit[0].references[0].noteId)?.method : 'dictionary-single' : 'pending';
    methods[method] = (methods[method] || 0) + 1;
  }
  for (const pending of doc.provenance.pendingReadings || []) {
    const row = pendingByChar.get(pending.char) || { char: pending.char, occurrences: 0, documents: new Set() };
    row.occurrences++; row.documents.add(doc.id); pendingByChar.set(pending.char, row);
  }
}
outputs['docs/shijing-review.json'] = { version: 1, editedOn: '2026-10-03', readingSystem: '切韻系讀法',
  counts: { ...report.counts.shijing, pendingCharacters: shijingRows.reduce((n, row) => n + row.pending, 0) }, methods,
  byCharacter: [...pendingByChar.values()].map(row => ({ ...row, documents: [...row.documents] })).sort((a, b) => b.occurrences - a.occurrences),
  documents: packs.shijing.map(doc => ({ id: doc.id, title: doc.title, section: doc.provenance.section,
    total: shijingRows.find(row => row.id === doc.id).total, pending: doc.provenance.pendingReadings || [] })) };
await mkdir(outputDir,{recursive:true});
await mkdir(`${outputDir}/shijing`,{recursive:true});
for (const [path,data] of Object.entries(outputs)) {
  const bytes=JSON.stringify(data)+ '\n';
  if(check) { if(await readFile(`${root}${path}`,'utf8')!==bytes)throw new Error(`語料輸出過期：${path}`); }
  else await writeFile(`${root}${path}`,bytes);
}
console.log(JSON.stringify({counts:report.counts,alignmentFailures:failures.length},null,2));
