import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import TshetUinh from 'tshet-uinh';
import { inspectToken } from '../src/corpus.js';
import { isHan } from '../src/polyhedron.js';
import { normalizeSoundChar, parseCommentary } from './shijing-commentary.mjs';
import { parseRhymeCsv, validateRhymeReference } from './shijing-rhyme-books.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const readJSON = async path => JSON.parse(await readFile(root + path, 'utf8'));
const current = await readJSON('docs/corpus-edition-status.json');
const evidence = await readJSON('scripts/pending-triage-evidence.json');
const manifest = await readJSON('scripts/corpus-sources.json');
const confirmationFiles = ['shijing-confirmed-contexts.json', 'shijing-confirmed-meanings.json', 'shijing-confirmed-glosses.json', 'corpus-confirmed-headwords.json'];
const confirmationData = await Promise.all(confirmationFiles.map(file => readJSON('scripts/' + file)));
const unresolvedReviews = new Map(confirmationData.flatMap(data => (data.unresolved || []).map(row => [`${row.id}:${row.index}`, row])));
const commentarySnapshot = await readJSON('scripts/snapshots/analects-commentary.json');
const deferred = new Map(confirmationData.flatMap(data => (data.deferred || []).map(row => [`${row.id}:${row.index}`, row])));

const cache = new Map(), rhymeBooks = new Map(), compactSources = new Map(), parsedSources = new Map();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const compact = text => text.replace(/<pb:[^>]+>/g, '').replace(/[\s/¶()]/gu, '');
function compactWithOffsets(raw) {
  let text = ''; const offsets = [];
  for (let i = 0; i < raw.length;) {
    if (raw.startsWith('<pb:', i)) { i = raw.indexOf('>', i) + 1; continue; }
    const char = String.fromCodePoint(raw.codePointAt(i));
    if (!/[\s/¶()]/u.test(char)) { text += char; for (let j = 0; j < char.length; j++) offsets.push(i); }
    i += char.length;
  }
  return { text, offsets };
}
async function sourceText(file) {
  if (!cache.has(file)) {
    const source = manifest.find(s => s.file === file);
    if (!source) {
      const book = commentarySnapshot.books[file];
      if (!book || hash(book.text) !== book.sha256) throw new Error(`未列來源或快照失效：${file}`);
      cache.set(file, book.text); return book.text;
    }
    const bytes = await readFile(root + '.cache/corpus-sources/' + file);
    if (hash(bytes) !== source.sha256) throw new Error(`來源雜湊不符：${file}`);
    cache.set(file, bytes.toString('utf8'));
  }
  return cache.get(file);
}
async function validateReference(ref) {
  if (['neighbor-source-reading', 'edition-alternative'].includes(ref.kind)) return;
  if (ref.file?.endsWith('.csv') && ref.entryId) {
    if (!rhymeBooks.has(ref.file)) rhymeBooks.set(ref.file, parseRhymeCsv(await sourceText(ref.file)));
    validateRhymeReference(ref, rhymeBooks.get(ref.file));
  } else if (ref.file) {
    const raw = await sourceText(ref.file);
    if (!ref.quote && ref.kind === 'upstream-annotation') { ref.verification = 'fixed-source-metadata'; return; }
    if (!ref.quote) throw new Error(`缺少引文：${ref.file}`);
    if (ref.sourceIndex != null) {
      if (!parsedSources.has(ref.file)) parsedSources.set(ref.file, parseCommentary(raw));
      const { tokens } = parsedSources.get(ref.file), token = tokens[ref.sourceIndex];
      if (!token || token.page !== ref.page || !token.comment.includes(ref.quote) || ref.lemma && tokens.slice(Math.max(0, ref.sourceIndex - [...ref.lemma].length + 1), ref.sourceIndex + 1).map(t => t.char).join('') !== ref.lemma) throw new Error(`逐位古注引文失效：${ref.file}:${ref.sourceIndex}`);
      ref.verification = 'checked-against-fixed-source'; return;
    }
    if (!compactSources.has(ref.file)) compactSources.set(ref.file, compactWithOffsets(raw));
    const mapped = compactSources.get(ref.file), wanted = compact(ref.quote);
    const pageMarkers = [...raw.matchAll(/<pb:([^>]+)>/g)];
    const pageRanges = ref.page ? pageMarkers.flatMap((m, i) => (m[1] === ref.page || m[1].endsWith('_' + ref.page)) ? [[m.index, pageMarkers[i + 1]?.index ?? raw.length]] : []) : [[0, raw.length]];
    if (!pageRanges.length) throw new Error(`卷頁不符：${ref.file} ${ref.page}`);
    if (ref.sourceOffset != null && (ref.sourceOffsetConvention !== 'JavaScript UTF-16 code-unit offset' || raw.slice(ref.sourceOffset, ref.sourceOffset + ref.quote.length) !== ref.quote)) throw new Error(`引文原文位置不符：${ref.file}`);
    let offset = -1, found = false;
    while ((offset = mapped.text.indexOf(wanted, offset + 1)) >= 0) {
      if (pageRanges.some(([start, end]) => mapped.offsets[offset] < end && mapped.offsets[offset + wanted.length - 1] >= start)) { found = true; break; }
    }
    if (!found) throw new Error(`引文與卷頁不符：${ref.file} ${ref.page || ''} ${ref.quote}`);
    if (ref.quoteFormat === 'parsed-commentary' && ref.sourceContext) {
      if (!parsedSources.has(ref.file)) parsedSources.set(ref.file, parseCommentary(raw));
      const { tokens } = parsedSources.get(ref.file);
      if (!tokens.some((t, i) => t.page === ref.page && t.comment.includes(ref.quote) && tokens.slice(Math.max(0, i - 10), i + 11).map(t => t.char).join('').includes(ref.sourceContext))) throw new Error(`音注上下文不符：${ref.file} ${ref.sourceContext}`);
    }
  } else if (ref.dictionaryChar && ref.position && ref.quote) {
    if (!TshetUinh.資料.query字頭(ref.dictionaryChar).some(e => e.音韻地位.描述 === ref.position && e.釋義 === ref.quote && (!ref.fanqie || ref.fanqie === e.反切))) throw new Error(`字庫引文不符：${ref.dictionaryChar}`);
  } else if (ref.url) { ref.verification = 'linked-source-not-machine-verified'; return; }
  else throw new Error('證據缺少可追溯來源');
  ref.verification = 'checked-against-fixed-source';
}

const workTypes = {
  'alignment-gap': { label: '整段正文／拼音未對齊', priority: 1, nextStep: '先逐段核對漏音、多音與括注格式，定位後重建對齊；再覆核恢復配對的每字原音。' },
  'missing-or-questioned-source': { label: '原注缺音、存疑或另列讀法', priority: 2, nextStep: '回查原始標音、修訂或其他有據注本；問號只證明注者存疑，不能據此斷言有兩種古讀。' },
  'glyph-headword': { label: '異體或字庫詞頭對應待確認', priority: 1, nextStep: '核對替代詞頭的原韻書釋義及本句用法；相容字形只作查字線索，不全域替換正文。' },
  'loanword-headword': { label: '有借讀或同音詞頭線索', priority: 2, nextStep: '尋找本句通假或訓詁證據；與另一字同音只提供線索，不能直接確認借讀。' },
  'source-spelling-unmapped': { label: '原拼音格式或音系待核', priority: 1, nextStep: '核對原拼音方案、排印與轉換規則；未映射的拼音不等於缺音，不擅改為最相近字串。' },
  'local-order-mismatch': { label: '正文與原音局部次序疑有差異', priority: 1, nextStep: '比對原注正文與完整版本，確認語序後重建配對；不逕行交换相鄰讀音。' },
  'edition-mismatch': { label: '另本文字更合原標音', priority: 1, nextStep: '查明原標音所依完整版本；保留現版和另本，不能僅為符合音注拼接正文。' },
  'source-dictionary-unresolved': { label: '原標音與詞頭音義仍待互證', priority: 2, nextStep: '按具體詞義、字形和原注音系回查韻書；字庫不合本身不足以證明原注有誤。' },
  'gloss-format-reference': { label: '音注格式或同上指引待展開', priority: 1, nextStep: '還原聲調、並讀、同上等音注格式，確認它所指的詞例；展開後仍須檢查古注分歧。' },
  'source-gloss-mapping': { label: '本篇常音與切韻字庫待互證', priority: 2, nextStep: '按具體篇句核對直音字、反切上下字、借讀與韻書音義，避免以字庫首項代替考證。' },
  'textual-identity': { label: '古注已提示用字或正文差異', priority: 1, nextStep: '先確認所讀的是哪個字或哪個版本，再依該版本配音；保留其他版本。' },
  'text-pairing': { label: '現行正文窗口未命中', priority: 2, nextStep: '核對缺頁、轉錄字形及重章位置，接回該處古注；不將配對失敗當讀音爭議。人工覆核可能已另有引文。' },
  'rhyme-only': { label: '自動配對只取得協韻提示', priority: 3, nextStep: '補接人工覆核所得常音，或另查常讀及本句義項；協韻注不直接用作切韻系常讀的唯一依據。' },
  'meaning-and-commentary': { label: '現行選讀尚缺可採用的義例判據', priority: 3, nextStep: '按本句詞義、詞性、專名及通假查《釋文》《廣韻》等；字庫多讀本身不足以證明本句歷來多說，人工引文亦須進一步判斷採讀。' },
};
function classifyWork(doc, p, reviewed) {
  if (doc.alignmentError) return 'alignment-gap';
  if (doc.pack !== 'shijing') {
    let category = reviewed?.earlier?.category;
    if (!category || category === 'alignment-gap') {
      if (!p.sourceReading || /[/?]/.test(p.sourceReading)) return 'missing-or-questioned-source';
      return 'source-dictionary-unresolved';
    }
    if (['source-reading-missing', 'source-explicit-uncertain', 'source-explicit-multiple'].includes(category)) return 'missing-or-questioned-source';
    if (!workTypes[category]) throw new Error(`舊語料缺少卡點分類：${doc.id}:${p.index}`);
    return category;
  }
  const notes = p.sourceNotes || [], quotes = notes.map(n => n.quote);
  if (quotes.some(q => /當作|作嘉|春秋傳作|舊說古.*字|當脫/.test(q))) return 'textual-identity';
  if (quotes.some(q => /^(上聲|去聲|平聲|入聲|同上|並|竝|巳見|已見)/.test(q))) return 'gloss-format-reference';
  if (quotes.some(q => /^(音\p{Script=Han}|[\p{Script=Han}]{2}反)/u.test(q) && !/^[\p{Script=Han}]{2}反與.*叶/u.test(q))) return 'source-gloss-mapping';
  if (quotes.some(q => /二反|二音|如字或/.test(q) && !/^(叶|協)/.test(q))) return 'gloss-format-reference';
  if (doc.pairing?.unmatched.some(u => u.index === p.index)) return 'text-pairing';
  if (quotes.length && quotes.every(q => /^(叶|協)|與.*叶/.test(q))) return 'rhyme-only';
  return 'meaning-and-commentary';
}
function mappingDetail(p) {
  const note = p.sourceNotes?.find(n => /^音\p{Script=Han}/u.test(n.quote));
  if (!note) return undefined;
  const soundChar = [...note.quote][1], dictionaryChar = normalizeSoundChar(soundChar);
  const soundPositions = [...new Set(TshetUinh.資料.query字頭(dictionaryChar).map(e => e.音韻地位.描述))];
  const overlap = soundPositions.filter(pos => p.candidates.includes(pos));
  return { soundChar, dictionaryChar, soundPositions, overlappingPositions: overlap,
    diagnosis: !soundPositions.length ? '直音字未收或字形待核' : !overlap.length ? '正文詞頭與直音字零交集；待查音注字形、轉寫、借讀及音系差別' : overlap.length > 1 ? '直音字仍有多個相容讀音' : '字庫已有唯一交集；應先排查音注解析或其他證據衝突' };
}

const curated = new Map();
for (const entry of evidence.cases) {
  const key = `${entry.id}:${entry.index}`;
  if (curated.has(key)) throw new Error(`重複個案：${key}`);
  curated.set(key, entry);
  for (const review of [entry.historical, entry.recoverable, entry.earlier].filter(Boolean)) for (const ref of review.references || []) await validateReference(ref);
  const phonology = entry.historical?.phonology;
  for (const mapping of phonology?.glossMappings || []) {
    for (const position of mapping.possiblePositions) TshetUinh.音韻地位.from描述(position);
    for (const ref of mapping.letterEvidence || []) await validateReference({ ...ref, dictionaryChar: ref.char });
  }
  if (phonology?.evidenceLevel === 'different-positions-confirmed') {
    const sets = phonology.distinctPair.map(gloss => phonology.glossMappings.find(m => m.gloss === gloss)?.possiblePositions);
    if (sets.length !== 2 || sets.some(s => !s?.length) || sets[0].some(p => sets[1].includes(p))) throw new Error(`異位證據不成立：${key}`);
  }
}
for (const entry of [...deferred.values(), ...unresolvedReviews.values()]) {
  for (const ref of entry.references || entry.sourceReferences || []) {
    const source = manifest.find(s => s.file === ref.file);
    if (source) { ref.url ||= source.url; ref.commit ||= source.commit; }
    await validateReference(ref);
  }
}
const packs = {}, inputHashes = {};
for (const pack of ['classics', 'analects', 'tang', 'shijing']) {
  const path = `public/corpora/${pack}.json`, bytes = await readFile(root + path);
  inputHashes[path] = hash(bytes);
  packs[pack] = new Map(JSON.parse(bytes).documents.map(d => [d.id, d]));
}
const rows = current.documents.flatMap(doc => doc.pending.map(p => {
  const token = packs[doc.pack].get(doc.id).tokens.filter(t => isHan(t.char))[p.index];
  if (token.char !== p.char || inspectToken(token).status !== p.status) throw new Error(`待核清單過期：${doc.id}:${p.index}`);
  const reviewed = curated.get(`${doc.id}:${p.index}`);
  const retained = deferred.get(`${doc.id}:${p.index}`);
  const currentReview = unresolvedReviews.get(`${doc.id}:${p.index}`);
  if (retained && (retained.char !== p.char || retained.context !== p.context)) throw new Error(`保留異讀詞例已變：${doc.id}:${p.index}`);
  if (reviewed && (reviewed.char !== p.char || reviewed.context !== p.context)) throw new Error(`詞例上下文改變：${doc.id}:${p.index}`);
  for (const ref of reviewed?.earlier?.references || []) {
    const raw = packs[doc.pack].get(doc.id), chars = raw.tokens.filter(t => isHan(t.char));
    if (ref.kind === 'neighbor-source-reading') {
      if (chars[ref.index]?.char !== ref.char || chars[ref.index]?.sourceReading !== ref.sourceReading) throw new Error(`鄰字原音不符：${doc.id}:${p.index}`);
      ref.verification = 'checked-against-current-corpus';
    }
    if (ref.kind === 'edition-alternative') {
      if (!raw.provenance.editionReview.alternatives.some(a => a.source === ref.url && a.differences.some(d => d.index === p.index && d.alternate === ref.char))) throw new Error(`異文來源不符：${doc.id}:${p.index}`);
      ref.verification = 'checked-against-fixed-edition-review';
    }
  }
  const work = classifyWork(doc, p, reviewed), detail = mappingDetail(p);
  const nextSteps = ['recoverable', 'earlier', 'historical'].flatMap(kind => reviewed?.[kind]?.nextStep && !(kind === 'earlier' && reviewed.earlier.category === 'alignment-gap' && !doc.alignmentError) ? [{ kind, text: reviewed[kind].nextStep }] : []);
  if (currentReview?.nextStep) nextSteps.unshift({kind:'current-review', text:currentReview.reason + ' ' + currentReview.nextStep});
  if (retained?.reason || retained?.basis) nextSteps.unshift({kind:'retained-evidence', text:retained.reason || retained.basis});
  if (!nextSteps.length) nextSteps.push({ kind: 'classification', text: workTypes[work].nextStep });
  return { pack: doc.pack, id: doc.id, title: doc.title, index: p.index, char: p.char, context: p.context, status: p.status,
    candidates: p.candidates, ...(p.sourceReading ? { sourceReading: p.sourceReading } : {}),
    evidenceClass: reviewed?.historical ? 'attested-historical-variants' : retained ? (retained.evidenceClass === 'documented-alternative-readings' ? 'attested-historical-variants' : retained.evidenceClass) || 'attested-historical-variants' : reviewed?.earlier?.explicitAlternatives || (/\//.test(p.sourceReading || '') && !/unknown|\?/.test(p.sourceReading || '')) ? 'annotator-explicit-alternatives' : 'not-established',
    workType: work, ...(reviewed?.earlier ? { workSubtype: reviewed.earlier.category } : {}), priority: workTypes[work].priority, nextSteps,
    ...(detail ? { mappingDetail: detail } : {}), ...(p.sourceNotes?.length ? { sourceNotes: p.sourceNotes } : {}),
    ...(reviewed ? { review: reviewed } : {}), ...(retained ? { retainedEvidence: retained } : {}), ...(currentReview ? { currentReview } : {}) };
}));
if (rows.length !== current.totals.pending) throw new Error('分類漏項');
for (const entry of curated.values()) {
  const raw = Object.values(packs).map(pack => pack.get(entry.id)).find(Boolean), chars = raw?.tokens.filter(t => isHan(t.char));
  if (!chars || chars[entry.index]?.char !== entry.char || chars.slice(Math.max(0, entry.index - 6), entry.index + 7).map(t=>t.char).join('') !== entry.context) throw new Error(`歷次覆核詞例失效：${entry.id}:${entry.index}`);
  if (entry.historical && inspectToken(chars[entry.index]).status === 'ready') throw new Error(`歷史多說被強定：${entry.id}:${entry.index}`);
}
for (const [key, entry] of deferred) if (!rows.some(r => `${r.id}:${r.index}` === key)) throw new Error(`新發現的待核字位被強定：${key}`);
const actualPending = Object.values(packs).flatMap(docs => [...docs.values()].flatMap(doc => doc.tokens.filter(t => isHan(t.char)).flatMap((token, index) => inspectToken(token).status !== 'ready' ? [`${doc.id}:${index}`] : []))).sort();
if (JSON.stringify(actualPending) !== JSON.stringify(rows.map(r => `${r.id}:${r.index}`).sort())) throw new Error('全庫待核字位與分類覆蓋不一致');
for (const diagnosis of evidence.alignmentDiagnostics) {
  const doc = packs.analects.get(diagnosis.id);
  if (!doc || doc.tokens.map(t => t.char).join('') !== diagnosis.originalText || doc.provenance.originalRomanization !== diagnosis.originalRomanization || (doc.provenance.alignmentError || doc.provenance.corpusAlignmentReview?.alignment?.previousAlignmentError) !== diagnosis.error || doc.tokens.filter(t => isHan(t.char)).length !== diagnosis.characters) throw new Error(`整段對齊診斷過期：${diagnosis.id}`);
}
const counts = (key, subset = rows) => subset.reduce((r, row) => ({ ...r, [row[key]]: (r[row[key]] || 0) + 1 }), {});
const output = { version: 2, editedOn: evidence.editedOn, scope: '本輪有據確認後，四包全部剩餘待核字位；確認及更正另見 corpus-confirmation-review.json。',
  indexConvention: 'index 為不含標點的零起始漢字索引。',
  interpretation: 'evidenceClass 記錄目前已核到的多說證據；workType 記錄現行建置的配對或選讀卡點，不代表人工覆核未找到新證據。兩個維度分開計數。同一字位可同時有傳統異讀及配對問題。not-established 不表示沒有歷史異讀。nextSteps 保留修復工作與古注取捨兩方面的要求。',
  inputHashes, evidenceInputSha256: hash(await readFile(root + 'scripts/pending-triage-evidence.json')), workTypes,
  historicalPhonology: evidence.historicalPhonology,
  historicalPhonologyScope: '僅前輪已核183字位的換算分級；本輪新發現另讀未併入這一分級統計。',
  baselineEarlierSubtypeCounts: evidence.earlierSubtypeCounts,
  confirmationInputHashes: Object.fromEntries(await Promise.all(confirmationFiles.map(async file => [file, hash(await readFile(root + 'scripts/' + file))]))),
  curatedResolved: curated.size - rows.filter(r => r.review).length,
  externalFindings: evidence.externalFindings,
  counts: { pending: rows.length, evidence: counts('evidenceClass'), work: counts('workType'),
    byPack: Object.fromEntries(Object.keys(packs).map(pack => { const subset = rows.filter(r => r.pack === pack); return [pack, { pending: subset.length, evidence: counts('evidenceClass', subset), work: counts('workType', subset) }]; })) },
  alignmentDiagnostics: evidence.alignmentDiagnostics.map(d => ({...d, resolvedAlignment: !packs.analects.get(d.id).provenance.alignmentError})), rows };
const path = root + 'docs/pending-classification.json', bytes = JSON.stringify(output) + '\n';
const reportPath = root + 'docs/pending-classification.md', report = await readFile(reportPath, 'utf8');
const marker = '<!-- pending-cases:start -->';
const cell = value => String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const table = (headers, data) => [headers, headers.map(() => '---'), ...data].map(row => '| ' + row.map(cell).join(' | ') + ' |').join('\n');
const historicalGroups = new Map();
for (const row of rows.filter(r => r.review?.historical)) {
  const review = row.review.historical, key = `${row.id}:${row.char}:${review.basis}`;
  const group = historicalGroups.get(key) || { row, indices: [] };
  group.indices.push(row.index); historicalGroups.set(key, group);
}
const levelLabels = { 'distinct-traditions': '學說分歧', 'different-positions-confirmed': '換算可辨異位', 'alternative-glosses-unresolved': '不同注法待換算' };
const historicalTable = table(['篇名', '字／索引', '已核證據', '分級／出處'], [...historicalGroups.values()].map(({ row, indices }) => {
  const h = row.review.historical, ref = h.references[0];
  return [row.title, `${row.char} · ${indices.join('、')}`, h.basis, `${levelLabels[h.phonology.evidenceLevel]}；[${ref.page}](${ref.url})`];
}));
const retainedTable = table(['篇名', '字／索引', '保留理由', '出處'], rows.filter(r=>r.retainedEvidence && r.evidenceClass !== 'not-established' && !r.review?.historical).map(r=>[r.title, `${r.char} · ${r.index}`, r.retainedEvidence.reason || r.retainedEvidence.basis, r.retainedEvidence.references.map(ref=>`[${ref.page || ref.book || '原文'}](${ref.url})`).join('；')]));
const priorityTable = table(['篇名', '字／索引', '上下文', '具體下一步'], rows.filter(r => r.review?.recoverable).map(r => [r.title, `${r.char} · ${r.index}`, r.context, r.review.recoverable.nextStep]));
const alignmentTable = table(['篇段', '字數', '已定位的問題'], evidence.alignmentDiagnostics.map(d => [d.title + '（' + d.id + '）', d.characters, d.diagnosis]));
const appendix = `${marker}\n\n## 逐項索引\n\n以下表格由分類資料自動生成。索引仍從 0 起算；同篇同字同一證據的重章合併列索引，完整上下文保存在 JSON。\n\n<details>\n<summary>古注多說的全部 183 字位</summary>\n\n${historicalTable}\n\n</details>\n\n<details>\n<summary>原優先清單中仍待核的 ${rows.filter(r=>r.review?.recoverable).length} 個字位</summary>\n\n${priorityTable}\n\n</details>\n\n<details>\n<summary>本輪新發現的異讀與待核通例</summary>\n\n${retainedTable}\n\n</details>\n\n<details>\n<summary>《論語》14 段原對齊問題（已修復；缺音與另讀仍保留）</summary>\n\n${alignmentTable}\n\n</details>\n`;
const evidenceLabels = {
  'attested-historical-variants': '文獻有另讀或音注分歧',
  'annotator-explicit-alternatives': '現代原注明列兩讀',
  'attested-historical-interpretations': '古注有不同義解，未確證不同音',
  'scope-of-general-gloss-unresolved': '通例適用或本句音義關係待核',
  'not-established': '尚未建立本句歷史多說證據',
};
const packLabels={classics:'其他經典',analects:'《論語》',tang:'唐詩',shijing:'《詩經》'};
const header = `# 剩餘待核字位分類

2026-10-03，本輪有據確認後的現況：四包共 **${rows.length} 個待核字位**。前輪為 2,279，本輪新增確認 1,348；另有 3 處已有選讀更正，詳見 [本輪確認記錄](corpus-confirmation-review.md) 和 [逐字前後變更](corpus-confirmation-review.json)。同一字在不同篇句或重章分別計數。

${table(['語料','仍待核'],Object.entries(output.counts.byPack).map(([pack,c])=>[packLabels[pack],c.pending]))}

完整逐字清單在 [pending-classification.json](pending-classification.json)，保存原字、上下文、候選、卡點、引文及下一步。索引為不含標點的零起始漢字序號。

## 證據種類

${table(['證據類別','字位'],Object.entries(output.counts.evidence).map(([kind,count])=>[evidenceLabels[kind],count]))}

「尚未建立」不等於古人一致，也不保證能唯一化。現代注者的問號只表示存疑，沒有算成兩個讀法。音注分歧可能出於不同學說、傳本或音系，需要分辨；不把所有不同切字都當作兩個音韻地位。

前輪 183 個《詩經》古注多說字位全部保留。其中 35 處涉及不同傳統（32 處涉及毛鄭），117 處已取得不相交的可能地位集合，31 處仍待换算。本輪新增證據另列於下表，尚未冒充全部完成上述換算分級。

## 現行卡點

這是另一個分類維度，與證據種類不能相加。有本句異讀的字位也可能同時有音注配對問題。

${table(['卡點','字位','後續核對'],Object.entries(output.counts.work).map(([type,count])=>[workTypes[type].label,count,workTypes[type].nextStep]))}

《論語》14 段的整段對齊問題已修復；原注缺少的 13 個音節仍留空，「文」的平、去兩讀並存。原來的對齊診斷保留為歷史記錄，不能再把整段 819 字算作未配對。

已核到足夠音義依據的詞位已寫入內建語料。其餘需要更直接的本句音注、原標音版本或傳本校勘，不以普通話讀音、最相近拼寫或字庫首項補滿。新增未決個案的具體理由保存在 JSON 的 currentReview／retainedEvidence。

重建命令：npm run classify:pending；一致性檢查：npm run check:pending。

`;
const reportBytes = header + appendix;
if (process.argv.includes('--check')) {
  if (await readFile(path, 'utf8') !== bytes || report !== reportBytes) throw new Error('待核分類輸出過期');
} else {
  await writeFile(path, bytes);
  await writeFile(reportPath, reportBytes);
}
console.log(JSON.stringify(output.counts, null, 2));
