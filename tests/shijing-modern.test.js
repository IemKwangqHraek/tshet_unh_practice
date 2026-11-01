import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {shijingModern as data, filterModernEntries, filterModernIndex, shijingModernView, loadShijingModernIndex} from '../src/shijing-modern.js';
import {parseShijingRoute,shijingRoute} from '../src/shijing-routes.js';
import {threeSchoolsLink,threeSchoolsView} from '../src/three-schools.js';

const raw = await readFile(new URL('../public/collations/shijing-modern-index.json',import.meta.url),'utf8');
const index = JSON.parse(raw);
const corpus = JSON.parse(await readFile(new URL('../public/corpora/shijing.json',import.meta.url),'utf8')).documents;

test('the complete work index accounts for 305 texts, six untexted poems, and all 2129 source items',()=>{
  assert.deepEqual(data.poems.map(p=>p.id),corpus.map(d=>d.id));
  assert.equal(index.units.length,2129);
  assert.equal(index.untexted.length,6);
  assert.ok(index.untexted.every(p=>p.count===0 && /無辭/.test(p.headingOcr)));
  assert.equal(index.poems.reduce((sum,p)=>sum+p.indexItems,0),2129);
  assert.equal(index.poems.reduce((sum,p)=>sum+p.sourceCharacters,0),2483);
  assert.equal(new Set(index.units.map(u=>u.id)).size,2129);
  for(const poem of index.poems) {
    const units=index.units.filter(u=>u.poemId===poem.id);
    assert.equal(units.length,poem.indexItems,poem.title);
    assert.deepEqual(units.map(u=>u.number),Array.from({length:units.length},(_,i)=>i+1));
    assert.ok(poem.bodyPdfRange[0]<=poem.bodyPdfRange[1]);
    assert.deepEqual(poem.bodyPdfRange,poem.bodyPrintRange.map(p=>p+25));
  }
  assert.equal(createHash('sha256').update(raw).digest('hex'),data.workIndex.sha256);
});

test('reviewed rows anchor actual site characters and independently count source items and website records',()=>{
  assert.equal(data.entries.length,618);
  assert.equal(data.progress.reviewedPoems,141);
  assert.equal(data.progress.reviewedIndexItems,653);
  assert.equal(data.progress.unreviewedIndexItems,1476);
  for(const row of data.entries) {
    const doc=corpus.find(d=>d.id===row.poemId);
    assert.ok(doc.tokens.map(t=>t.char).join('').includes(row.baseText),row.id);
    for(const at of row.positions) assert.equal(doc.tokens.slice(at,at+[...row.base].length).map(t=>t.char).join(''),row.base);
    for(const id of row.sourceUnitIds) assert.ok(index.units.find(u=>u.id===id)?.reviewedEntryIds.includes(row.id));
    for(const reading of row.readings) for(const ref of reading.evidence) {
      assert.deepEqual(ref.pdfPages,ref.printPages.map(p=>p+data.sources.find(s=>s.id===ref.sourceId).pdfOffset));
    }
  }
  assert.equal(data.entries.find(r=>r.id==='modern-yuan-0038').readings[0].text,'顁');
  assert.equal(data.poems.find(p=>p.id==='shijing-013').reviewedIndexItems,4);
  assert.equal(data.poems.find(p=>p.id==='shijing-013').indexItems,4);
});

test('OCR candidates never acquire a school or silently become reviewed evidence',()=>{
  assert.equal(index.units.filter(u=>u.bodyMatch).length,1809);
  assert.equal(index.units.reduce((sum,u)=>sum+u.candidates.length,0),1904);
  assert.ok(index.units.every(u=>u.schools.length===0 && u.candidateStatus==='機器抽取待核'));
  const scannedError=index.units.find(u=>u.id==='yuan2013-0038');
  assert.equal(scannedError.candidates[0].text,'顧');
  assert.equal(scannedError.lemma,'定');
  assert.equal(data.entries.find(r=>r.id==='modern-yuan-0038').readings[0].text,'顁');
  assert.equal(filterModernIndex(index,{scope:'pending'}).length,1476);
  assert.equal(filterModernIndex(index,{scope:'linked'}).length,608);
  assert.equal(filterModernIndex(index,{scope:'unmatched'}).length,320);
  assert.ok(filterModernEntries({school:'齊'}).every(r=>r.readings.some(x=>x.evidence.some(e=>e.schools.includes('齊')))));
});

test('the ten-item OCR audit preserves originals, omissions, negative evidence, and attribution limits',async()=>{
  const audit=JSON.parse(await readFile(new URL('../public/'+data.ocrAudits.find(a=>a.count===10).url,import.meta.url),'utf8'));
  const checked=filterModernIndex(index,{query:audit.id});
  assert.equal(checked.length,10);
  assert.deepEqual(checked.map(u=>u.id),[43,45,46,47,48,49,50,51,52,53].map(n=>`yuan2013-${String(n).padStart(4,'0')}`));
  assert.deepEqual(filterModernIndex(index,{query:audit.id}).map(u=>u.id),checked.map(u=>u.id));
  const decisions=audit.checks.flatMap(c=>c.decisions);
  assert.deepEqual(['keep','reject','related'].map(k=>decisions.filter(d=>d.decision===k).length),[3,4,2]);
  for(const check of audit.checks) {
    const unit=index.units.find(u=>u.id===check.unitId);
    assert.equal(check.decisions.length,unit.candidates.length);
    for(const d of check.decisions) assert.equal(d.ocr,unit.candidates[d.candidate].text);
    for(const glyph of check.glyphs||[]) assert.ok((await readFile(new URL('../public/'+glyph.url,import.meta.url))).length);
  }
  const row=n=>data.entries.find(r=>r.id===`modern-yuan-00${n}`);
  assert.equal(row(47).readings[0].text,'𢥞𢥞');
  assert.equal(row(47).readings[1].text,'冲冲');
  assert.ok(row(45).readings.some(r=>r.qualification==='原注不取' && r.evidence.some(e=>e.note.includes('非也'))));
  assert.equal(row(49).readings[0].text,'悅');
  assert.ok(row(50).readings.every(r=>r.qualification==='字學說明' && r.evidence.every(e=>!e.schools.length)));
  assert.equal(row(51).readings[0].text,'薻');
  assert.equal(row(52).readings[0].text,'莒');
  assert.ok(row(43).readings[0].glyphStatus);
  const html=shijingModernView({mode:'index',query:audit.id},index);
  assert.match(html,/核定見上方/);
  assert.match(html,/誤取否定語境/);
  assert.match(html,/原注不取/);
  assert.equal((html.match(/data-unit-id=/g)||[]).length,10);
});

test('the next hundred source items retain original OCR, page continuations, qualifications, and a gloss-only completion',async()=>{
  const audit=JSON.parse(await readFile(new URL('../public/'+data.ocrAudits.find(a=>a.count===100).url,import.meta.url),'utf8'));
  const snapshot=JSON.parse(await readFile(new URL('../scripts/snapshots/shijing-yuan-modern.json',import.meta.url),'utf8'));
  assert.equal(audit.checks.length,100);
  assert.deepEqual(audit.checks.map(c=>c.unit),Array.from({length:100},(_,i)=>i+54));
  assert.equal(audit.sourcePdfSha256,snapshot.sourcePdfSha256);
  const checked=filterModernIndex(index,{query:audit.id});
  assert.deepEqual(checked.map(u=>u.id),audit.checks.map(c=>c.unitId));
  assert.equal(filterModernIndex(index,{scope:'audited'}).length,610);
  const decisions=audit.checks.flatMap(c=>c.decisions);
  assert.deepEqual(['keep','reject','correct','related','reassign','pending'].map(k=>decisions.filter(d=>d.decision===k).length),[46,16,15,13,4,2]);
  for(const check of audit.checks) {
    const unit=index.units.find(u=>u.id===check.unitId);
    const original=snapshot.units.find(u=>u.id===check.unitId);
    assert.deepEqual(unit.candidates,original.candidates);
    assert.deepEqual(unit.bodyMatch,original.bodyMatch);
    assert.equal(check.decisions.length,original.candidates.length);
    check.decisions.forEach((d,i)=>{
      assert.equal(d.candidate,i);
      assert.equal(d.ocr,original.candidates[i].text);
    });
    assert.equal(check.pdfPage,check.page+25);
    assert.ok(unit.indexReviewed);
    for(const glyph of check.glyphs||[]) {
      const bytes=await readFile(new URL('../public/'+glyph.url,import.meta.url));
      assert.equal(bytes.subarray(1,4).toString(),'PNG');
      assert.ok(glyph.cropPixels[2]>glyph.cropPixels[0]);
      assert.equal(glyph.pdfPage,glyph.printPage+25);
    }
  }
  const gloss=checked.find(u=>u.id==='yuan2013-0063');
  assert.deepEqual(gloss.reviewedEntryIds,[]);
  assert.ok(!filterModernIndex(index,{scope:'pending'}).includes(gloss));
  assert.equal(data.progress.linkedIndexItems,608);
  assert.equal(data.entries.filter(r=>r.auditId===audit.id).length,99);
  const row=n=>data.entries.find(r=>r.id===`modern-yuan-${String(n).padStart(4,'0')}`);
  assert.equal(row(54).readings[0].text,'䶒');
  assert.ok(row(71).readings.some(r=>r.text==='𦭼有梅'));
  assert.ok(row(78).readings.some(r=>r.evidence.some(e=>e.scope==='三家未分' && !e.schools.length)));
  assert.equal(row(99).readings[0].text,'炯炯');
  assert.deepEqual(row(99).readings[0].evidence[0].pdfPages,[61,62]);
  assert.equal(row(137).readings[0].text,'𩓣');
  assert.equal(row(149).readings[0].qualification,'原書判非');
  assert.match(row(149).readings[0].evidence[0].note,/非是/);
  assert.equal(row(150).readings[0].text,'雔');
  const lastPage=shijingModernView({mode:'index',query:audit.id,page:2},index);
  assert.match(lastPage,/第 3／3 頁 · 符合 100 項/);
  assert.equal((lastPage.match(/data-unit-id=/g)||[]).length,20);
  assert.match(lastPage,/yuan2013-0153/);
  assert.match(shijingModernView({mode:'index',query:gloss.id},index),/已回查正文，本項未新增經文異字記錄/);
});

test('the next 500 items preserve 505 candidates, mark unresolved source forms, and keep all three batches distinct',async()=>{
  const audit=JSON.parse(await readFile(new URL('../public/'+data.ocrAudit.url,import.meta.url),'utf8'));
  const snapshot=JSON.parse(await readFile(new URL('../scripts/snapshots/shijing-yuan-modern.json',import.meta.url),'utf8'));
  assert.equal(audit.expectedCount,500);
  assert.deepEqual(audit.checks.map(c=>c.unit),Array.from({length:500},(_,i)=>154+i));
  assert.equal(new Set(audit.checks.map(c=>c.poemId)).size,109);
  assert.equal(audit.sourcePdfSha256,snapshot.sourcePdfSha256);
  const decisions=audit.checks.flatMap(c=>c.decisions);
  assert.equal(decisions.length,505);
  assert.deepEqual(['keep','correct','reject','related','reassign','pending'].map(k=>decisions.filter(d=>d.decision===k).length),[243,64,19,94,31,54]);
  for(const check of audit.checks) {
    const unit=index.units.find(u=>u.id===check.unitId);
    const original=snapshot.units[check.unit-1];
    assert.deepEqual(unit.candidates,original.candidates);
    assert.deepEqual(unit.bodyMatch,original.bodyMatch);
    assert.equal(check.decisions.length,original.candidates.length);
    check.decisions.forEach((d,i)=>{
      assert.equal(d.candidate,i);
      assert.equal(d.ocr,original.candidates[i].text);
    });
    assert.equal(check.pdfPage,check.page+25);
    assert.ok(check.page>=54 && check.page<=236);
    assert.ok(check.indexPrintPage>=893 && check.indexPrintPage<=918);
    for(const glyph of check.pendingGlyphs||[]) assert.deepEqual(glyph.pdfPages,glyph.printPages.map(p=>p+25));
    for(const glyph of check.glyphs||[]) {
      const bytes=await readFile(new URL('../public/'+glyph.url,import.meta.url));
      assert.equal(bytes.subarray(1,4).toString(),'PNG');
      assert.equal(glyph.pdfPage,glyph.printPage+25);
      assert.ok(glyph.cropPixels[2]>glyph.cropPixels[0] && glyph.cropPixels[3]>glyph.cropPixels[1]);
    }
  }
  assert.equal(audit.checks.filter(c=>c.pendingGlyphs?.length).length,84);
  assert.equal(audit.checks.flatMap(c=>c.glyphs||[]).length,9);
  assert.equal(filterModernIndex(index,{scope:'glyphs'}).length,84);
  assert.equal(data.entries.filter(r=>r.auditId===audit.id).length,456);
  for(const batch of data.ocrAudits) assert.equal(filterModernIndex(index,{query:batch.id}).length,batch.count);
  const pending=index.units.find(u=>u.id==='yuan2013-0618');
  assert.ok(pending.indexReviewed && pending.ocrAudit.pendingGlyphs.length);
  assert.deepEqual(pending.reviewedEntryIds,[]);
  assert.ok(!filterModernIndex(index,{scope:'pending'}).includes(pending));
  const html=shijingModernView({mode:'index',query:pending.id},index);
  assert.match(html,/字形／字碼尚待辨定/);
  assert.ok(!html.includes('本項未新增經文異字記錄'));
  const lastPage=shijingModernView({mode:'index',query:audit.id,page:12},index);
  assert.match(lastPage,/第 13／13 頁 · 符合 500 項/);
  assert.equal((lastPage.match(/data-unit-id=/g)||[]).length,20);
  assert.match(lastPage,/yuan2013-0653/);
  assert.match(lastPage,/續批 100 項/);
  assert.match(lastPage,/首批 10 項/);
});

test('new readings compare the correct character or phrase and preserve non-textual and rejected claims',()=>{
  const row=n=>data.entries.find(r=>r.id===`modern-yuan-${String(n).padStart(4,'0')}`);
  for(const entry of data.entries.filter(r=>r.auditId===data.ocrAudit.id)) {
    const text=corpus.find(d=>d.id===entry.poemId).tokens.map(t=>t.char).join('');
    for(const reading of entry.readings) {
      assert.ok(text.includes(reading.base || entry.base),entry.id);
      assert.notEqual(reading.text,reading.base || entry.base,entry.id);
    }
  }
  assert.equal(row(187).readings[0].text,'泮泮');
  assert.ok(row(187).readings.some(r=>r.qualification==='原書判形近致訛'));
  assert.equal(row(379).readings[1].evidence[0].basis,'後世擬句');
  assert.equal(row(449).readings[0].evidence[0].basis,'整理本用字');
  assert.equal(row(495).base,'陟彼岵兮，瞻望父兮');
  assert.equal(row(495).readings[0].text,'陟彼岵矣，瞻望父矣');
  assert.equal(row(575).readings[0].base,'驖');
  assert.equal(row(610).readings.find(r=>r.text==='鷐').base,'晨');
  assert.equal(row(639).readings[0].text,'晣晣');
  assert.ok(!row(219) && !row(395) && !row(618));
  const html=shijingModernView({query:row(625).id});
  assert.match(html,/差 →/);
  assert.match(html,/旦 →/);
});

test('all modes and Unicode filters survive share links, reload, and legacy poem routes',()=>{
  for(const mode of ['modern','index','pilot','entries','sources','candidates']) {
    const filter={mode,poemId:'shijing-010',query:'濆 朝 & <異字>',school:'韓',scope:'disputed',book:'chen',page:2};
    assert.deepEqual(parseShijingRoute(shijingRoute(filter)),filter);
  }
  assert.equal(parseShijingRoute('#shijing-variants').mode,'modern');
  assert.equal(parseShijingRoute('#shijing-variants/shijing-001').poemId,'shijing-001');
  assert.equal(parseShijingRoute('#shijing-variants/pilot/shijing-001').mode,'pilot');
  assert.equal(parseShijingRoute('#shijing-variants/index?page=-2').page,0);
  assert.match(threeSchoolsLink(corpus[11]),/1 筆已核／1 個索引項/);
  assert.match(threeSchoolsLink(corpus[160]),/待校/);
});

test('the production page distinguishes reviewed, unreviewed, empty, and zero-index states',()=>{
  assert.match(threeSchoolsView(),/三家詩異文輯錄/);
  assert.ok(!threeSchoolsView().includes('正在載入原書輯錄'));
  const html=shijingModernView({mode:'modern',query:'濆',school:'韓'});
  assert.match(html,/王氏否定/);
  assert.match(html,/PDF 第 216 頁/);
  assert.match(shijingModernView({mode:'modern',poemId:corpus[160].id}),/本篇尚待逐圖校讀/);
  const zero=data.poems.find(p=>p.indexItems===0);
  assert.match(shijingModernView({mode:'index',poemId:zero.id},index),/不代表其他版本或三家沒有異文/);
  const work=shijingModernView({mode:'index'},index);
  assert.equal((work.match(/data-unit-id=/g)||[]).length,40);
  assert.match(work,/全書OCR工作底稿/);
  assert.match(shijingModernView({mode:'index',scope:'pending'},index),/全部待核/);
  const unsafe=structuredClone(index);
  unsafe.units[0].candidates=[{text:'<img src=x onerror=alert(1)>',context:'<script>bad()</script>',printPage:3,pdfPage:28}];
  const escaped=shijingModernView({mode:'index',query:'<script>'},unsafe);
  assert.ok(!escaped.includes('<script>'));
  assert.match(escaped,/&lt;script&gt;/);
});

test('font assets cover every rare character used by the actual reviewed and draft data',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../src/assets/fonts/manifest.json',import.meta.url),'utf8'));
  const covered=new Set(manifest.flatMap(f=>f.codepoints.map(s=>parseInt(s.slice(2),16))));
  for(const char of JSON.stringify([data,index])) {
    const cp=char.codePointAt(0);
    if(cp>=0x20000 || cp>=0x3400 && cp<=0x4dbf) assert.ok(covered.has(cp),char);
  }
  for(const file of manifest) {
    const bytes=await readFile(new URL('../src/assets/fonts/'+file.file,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);
  }
});

test('index loading verifies content integrity and retries after failure without requesting the ancient archive',async()=>{
  let calls=0;
  await assert.rejects(loadShijingModernIndex(async()=>{calls++;return {ok:true,text:async()=>raw+' '};}),/版本不符/);
  const loaded=await loadShijingModernIndex(async url=>{
    calls++;
    assert.match(url,/shijing-modern-index.json\?v=/);
    return {ok:true,text:async()=>raw};
  });
  assert.equal(loaded.units.length,2129);
  await loadShijingModernIndex(async()=>{throw new Error('should use cached work index');});
  assert.equal(calls,2);
});
