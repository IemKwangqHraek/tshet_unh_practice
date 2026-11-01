// Offline build: reviewed evidence and the complete OCR work index are distinct.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const read = async path => JSON.parse(await readFile(new URL(path, root), 'utf8'));
const [pilot, snapshot, previousAdditions, newAdditions, corpus, firstAudit, nextAudit] = await Promise.all([
  read('src/data/shijing-zhou-nan-pilot.json'), read('scripts/snapshots/shijing-yuan-modern.json'),
  read('scripts/shijing-modern-reviewed.json'), read('scripts/shijing-modern-reviewed-100.json'),
  read('public/corpora/shijing.json'), read('scripts/shijing-ocr-audit.json'), read('scripts/shijing-ocr-audit-100.json'),
]);
const additions = [...previousAdditions, ...newAdditions];
const audits = [firstAudit, nextAudit];
const audit = nextAudit;
const checks = audits.flatMap(batch=>batch.checks.map(check=>({...check,batchId:batch.id,checkedOn:batch.checkedOn})));
const checksById = new Map(checks.map(check=>[check.unitId,check]));
assert.equal(snapshot.units.length, 2129);
assert.equal(snapshot.poems.length, 305);
assert.equal(snapshot.untexted.length, 6);
assert.equal(snapshot.poems.reduce((sum, p) => sum + p.indexItems, 0), 2129);
assert.equal(snapshot.poems.reduce((sum, p) => sum + p.sourceCharacters, 0), 2483);
for (const batch of audits) {
  assert.equal(batch.sourcePdfSha256, snapshot.sourcePdfSha256);
  assert.equal(new Set(batch.checks.map(c=>c.unitId)).size, batch.expectedCount || 10);
}
assert.equal(checksById.size,110);
assert.deepEqual(nextAudit.checks.map(c=>c.unit),Array.from({length:100},(_,i)=>54+i));
for (const check of checks) {
  const unit = snapshot.units.find(u=>u.id===check.unitId);
  assert.equal(check.pdfPage, check.page + 25);
  assert.equal(check.decisions.length, unit.candidates.length);
  assert.deepEqual(check.decisions.map(d=>d.candidate), unit.candidates.map((_,i)=>i));
  check.decisions.forEach(d=>assert.equal(d.ocr, unit.candidates[d.candidate].text));
  for(const page of check.continuationPages || []) assert.ok(page>check.page && page<=54);
}

const entries = [...pilot.entries.map(row => ({
  ...row, status: '現代整理頁已核',
  sourceUnitIds: row.yuanIndexItem ? [`yuan2013-${String(row.yuanIndexItem).padStart(4, '0')}`] : [],
})), ...additions.map(row => {
  const doc = corpus.documents.find(doc=>doc.id===row.poemId);
  const positions = doc.tokens.flatMap((_,i)=>doc.tokens.slice(i,i+[...row.base].length).map(t=>t.char).join('')===row.base ? [i] : []);
  assert.ok(doc.tokens.map(t=>t.char).join('').includes(row.baseText));
  assert.ok(positions.length);
  return {id:`modern-yuan-${String(row.unit).padStart(4,'0')}`,poemId:row.poemId,title:doc.title,
    lemma:row.lemma,baseText:row.baseText,base:row.base,note:row.note,positions,auditId:row.auditId,
    sourceUnitIds:[`yuan2013-${String(row.unit).padStart(4,'0')}`],
    section:'袁書續輯',status:'現代整理頁已核',disputed:false,
    verification:'現代整理頁已逐圖核字；所引古籍原件尚未全面覆核。',
    readings:row.readings.map(r=>({text:r.text,glyphStatus:r.glyphStatus,glyphImage:r.glyphImage,qualification:r.qualification,
      evidence:[{sourceId:'yuan2013',printPages:[row.page,...row.continuationPages||[]],pdfPages:[row.page,...row.continuationPages||[]].map(p=>p+25),
      witness:r.witness,schools:r.schools,scope:r.scope || (r.schools.length ? '分家' : '未定'),basis:r.basis,note:r.note||''}]}))};
})];
// Explicit reviewed index labels. The original OCR is retained alongside them.
const reviewedLabels = ['關關','洲','逑','荇','左右流之','左右芼之','服','輾','鍾鼓',
  '覃','維','灌','濩','斁','虺隤','姑','岡','兕觥','吁','樛','縈','詵詵','繩繩',
  '夭夭','蓁蓁','兔','逵','芣苢','襭','息','永','遵彼汝墳','惄','調飢','王室如燬'];
assert.equal(reviewedLabels.length,35);
const units = snapshot.units.map((unit, i) => {
  const related = entries.filter(row => row.sourceUnitIds.includes(unit.id));
  const check = checksById.get(unit.id);
  assert.ok(related.every(row => row.poemId === unit.poemId));
  return {...unit, lemma: reviewedLabels[i] || check?.lemma || additions.find(row=>row.unit===i+1)?.lemma || unit.lemmaOcr || '〔字頭待辨〕',
    status: related.length ? '已連結校讀' : check ? '已核索引・未新增經文異字' : '索引OCR待校',
    indexReviewed: !!(related.length || check),
    reviewedEntryIds: related.map(row => row.id),
    ...(check ? {ocrAudit:check} : {}),
    // Draft candidates and their family mentions are never promoted by a match.
    candidateStatus: '機器抽取待核', schools: [],
  };
});
const linkedIndexItems = units.filter(unit => unit.reviewedEntryIds.length).length;
const reviewedIndexItems = units.filter(unit => unit.indexReviewed).length;
assert.equal(linkedIndexItems,35+new Set(additions.map(row=>row.unit)).size);
assert.equal(reviewedIndexItems,153);
const poems = snapshot.poems.map(poem => ({...poem,
  reviewedRecords: entries.filter(row => row.poemId === poem.id).length,
  reviewedIndexItems: units.filter(unit => unit.poemId === poem.id && unit.indexReviewed).length,
  status: units.some(unit => unit.poemId === poem.id && unit.indexReviewed) ? '已有校讀' : '待逐圖校讀',
}));
const source = {...pilot.sources[0], sourcePdfSha256: snapshot.sourcePdfSha256,
  indexPdfRange: snapshot.sourceIndexPdfRange, bodyOcrPdfRange: snapshot.bodyOcrPdfRange};
const index = {version: 1, title: '詩經異文全書工作索引', source,
  policy: snapshot.policy, totals: snapshot.totals, poems, untexted: snapshot.untexted, units};
const indexJson = JSON.stringify(index, null, 2) + '\n';
const result = {
  version: 1, editedOn: audit.checkedOn, title: '詩經異文輯錄',
  coverage: `全305篇可查袁書索引，共2129個條目；其中${reviewedIndexItems}個索引項已核，${linkedIndexItems}項連結${entries.length}筆校讀，另1項僅論訓義而未新增經文異字。已核記錄覆蓋${new Set(entries.map(r=>r.poemId)).size}篇，未表示各篇已輯盡；其餘字頭與作字句候選為OCR工作底稿，尚待逐圖核定。《集校》目前僅前十首補證。`,
  verification: '前十首核對袁書印刷頁3–17（PDF第28–42頁），續輯至《谷風》印刷頁54（PDF第79頁）。續批100項核對正文印刷頁21–54（PDF第46–79頁）及附錄索引印刷頁889–893（PDF第914–918頁）。《集校》核對各條引用頁。已核指現代整理頁，所引古籍原件尚未全面覆核；字碼未定者另附字圖。',
  textPolicy: pilot.textPolicy, attributionPolicy: pilot.attributionPolicy, glyphPolicy: pilot.glyphPolicy,
  progress: {totalPoems: poems.length, indexItems: units.length, reviewedIndexItems, linkedIndexItems,
    reviewedPoems: poems.filter(poem => poem.reviewedRecords).length, reviewedRecords: entries.length,
    disputedRecords: entries.filter(row => row.disputed).length,
    pendingGlyphs: entries.flatMap(row => row.readings).filter(r => r.glyphStatus).length,
    unreviewedIndexItems: units.filter(unit => !unit.indexReviewed).length,
    ...snapshot.totals},
  workIndex: {url:'collations/shijing-modern-index.json', textUrl:'collations/shijing-modern-index.txt',
    sha256:createHash('sha256').update(indexJson).digest('hex'), version:index.version},
  ocrAudit: {id:audit.id,checkedOn:audit.checkedOn,count:audit.checks.length,
    url:`collations/shijing-${audit.id}.json`,textUrl:`collations/shijing-${audit.id}.txt`,
    selection:audit.selection},
  ocrAudits: audits.map(batch=>({id:batch.id,checkedOn:batch.checkedOn,count:batch.checks.length,
    url:`collations/shijing-${batch.id}.json`,textUrl:`collations/shijing-${batch.id}.txt`,selection:batch.selection})),
  sources: pilot.sources.map(s=>s.id==='yuan2013' ? {...s,use:s.use+` 續輯另核印刷頁17–54，共增${additions.length}筆（含文字學相關字與未編碼字形）。`} : s), poems, entries, corrections: pilot.corrections,
};
const family = ref=>ref.scope==='三家未分' ? ref.scope : ref.schools.length ? ref.schools.map(s=>s+'詩').join('、') : '未定家別';
const reviewedText = [result.title+'・已核記錄',result.coverage,result.verification,result.textPolicy,'',
  ...poems.filter(poem=>poem.reviewedRecords).flatMap(poem=>[poem.title,...entries.filter(row=>row.poemId===poem.id).flatMap(row=>[
    `[${row.id}] ${row.lemma}${row.disputed ? '（有分歧）' : ''}`,`本站：${row.baseText}；對照字：${row.base}`,
    ...row.readings.flatMap(r=>[`${row.base} → ${r.text}${r.qualification ? `（${r.qualification}）` : ''}${r.glyphImage ? `；字圖：${r.glyphImage}` : ''}`,...r.evidence.map(ref=>`  ${family(ref)}／${ref.basis}；${ref.witness}。${ref.sourceId} 印刷頁${ref.printPages.join('、')}／PDF第${ref.pdfPages.join('、')}頁。${ref.note}`)]),
    row.note||'',row.verification,'',
  ])])].join('\n').trimEnd()+'\n';
const indexText = [index.title,index.policy,
  '索引條目不等於確定異文數；候選包含訓解、引文及否定說法，家別尚未裁定。',
  '來源：袁梅《詩經異文彙考辨證》，齊魯書社，2013。',
  ...poems.flatMap(poem => ['',poem.title,`索引${poem.indexItems}項；已連結${poem.reviewedRecords}筆校讀。`,
    ...units.filter(unit => unit.poemId === poem.id).flatMap(unit => [
      `[${unit.id}] ${unit.lemma}（${unit.status}）`,
      `索引：印刷頁${unit.indexPrintPage}／PDF第${unit.indexPdfPage}頁；正文範圍：印刷頁${unit.bodyPrintRange.join('–')}／PDF第${unit.bodyPdfRange.join('–')}頁。`,
      ...(unit.bodyMatch ? [`機器定位：印刷頁${unit.bodyMatch.printPage}／PDF第${unit.bodyMatch.pdfPage}頁，待核。`] : ['字頭未能唯一對句，請按正文範圍回查。']),
      ...(unit.reviewedEntryIds.length ? [`已核記錄：${unit.reviewedEntryIds.join('、')}`] : []),
      ...(unit.ocrAudit ? [`OCR逐圖核對（${unit.ocrAudit.checkedOn}；${unit.ocrAudit.batchId}）：${unit.ocrAudit.summary}`] : []),
      ...unit.candidates.map((c,i) => `  原OCR作字句候選${unit.ocrAudit ? '（核定見上項及核對報告）' : '（待核）'}：${c.text}；印刷頁${c.printPage}／PDF第${c.pdfPage}頁。上下文：${c.context}`),
    ])]),
].join('\n') + '\n';
const auditText = batch => [batch.title,batch.checkedOn,batch.selection,batch.method,
  `來源：袁梅《詩經異文彙考辨證》（2013）；PDF SHA-256：${batch.sourcePdfSha256}`,'',
  ...batch.checks.flatMap(check=>[
    `[${check.unitId}] ${check.title}・${check.lemma}`,
    `正文印刷頁${check.page}／PDF第${check.pdfPage}頁；索引印刷頁${check.indexPrintPage}／PDF第${check.indexPdfPage}頁。`,
    ...(check.continuationPages?.length ? [`續頁：印刷頁${check.continuationPages.join('、')}／PDF第${check.continuationPages.map(p=>p+25).join('、')}頁。`] : []),
    check.summary,
    ...check.decisions.map(d=>`原候選${d.candidate+1}「${d.ocr}」：${d.label}${d.result ? ` → ${d.result}` : ''}。${d.note}`),
    ...check.findings.map(f=>`核對所得：${f.text}；${f.kind}；${family({scope:f.scope,schools:f.schools})}${f.witness ? `；${f.witness}` : ''}${f.qualification ? `；${f.qualification}` : ''}。${f.note||''}`),
    ...(check.glyphs||[]).map(g=>`單字圖：${g.url}。${g.note}`),'',
  ])].join('\n').trimEnd()+'\n';
for (const [path, content] of [
  ['src/data/shijing-modern.json', JSON.stringify(result,null,2)+'\n'],
  ['public/collations/shijing-modern-index.json',indexJson],
  ['public/collations/shijing-modern-index.txt',indexText],
  ['public/collations/shijing-modern-reviewed.txt',reviewedText],
  ...audits.flatMap(batch=>[
    [`public/collations/shijing-${batch.id}.json`,JSON.stringify(batch,null,2)+'\n'],
    [`public/collations/shijing-${batch.id}.txt`,auditText(batch)],
  ]),
]) {
  if(process.argv.includes('--check')) assert.equal(await readFile(new URL(path,root),'utf8'),content,`${path} stale`);
  else await writeFile(new URL(path,root),content);
}
console.log(`全書：${poems.length}篇／${units.length}索引項；已核${reviewedIndexItems}項、${entries.length}筆記錄；原OCR候選${snapshot.totals.candidateReadings}項，另附${checks.length}項逐圖核對。`);
