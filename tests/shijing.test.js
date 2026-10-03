import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import TshetUinh from 'tshet-uinh';
import { parseImport, exportDocument, documentStatus, inspectToken, practiceTokens } from '../src/corpus.js';
import { contextualNotes, normalizeChar, normalizeSoundChar, parseCommentary, pairCommentary, resolveNote, initialSoundGloss } from '../scripts/shijing-commentary.mjs';
import { shijingTexts } from '../scripts/shijing.mjs';
import { parseRhymeCsv, validateRhymeReference } from '../scripts/shijing-rhyme-books.mjs';
import { createSession, inputKey } from '../src/session.js';
import { catalogueView, reviewView } from '../src/views.js';
import { catalogueEntries } from '../src/catalogue.js';
const readJSON = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

test('commentary stays attached to base text across wrapping, variants and astral characters', () => {
  const body='𠮷桃之夭夭灼灼其華之子于歸宜其室家';
  const parsed=parseCommentary('# title\n<pb:test-1a>𠮷桃之夭夭灼灼其華(音花/)(○花也)之子于歸宜其室家');
  assert.equal(pairCommentary(body,parsed).map(token=>token.char).join(''),body);
  const refs=contextualNotes(body,[{file:'test.txt',parsed}]);
  assert.equal(refs[8][0].char,'華');
  assert.equal(refs[8][0].resolved.position,'曉合二麻平');
  assert.equal(refs[8][0].page,'test-1a');
  assert.equal(contextualNotes('殷其雷在南山之陽何斯違斯',[{file:'test',parsed:parseCommentary('殷(音隱)其靁在南山之陽何斯違斯')}])[0][0].char,'殷');
  assert.equal(pairCommentary(body,parseCommentary(body+body)),null);
  assert.equal(pairCommentary(body,parseCommentary(body.replace('灼灼','灼'))),null);
  assert.throws(()=>parseCommentary('華(音花'),/未結束/);
});

test('sound conversion rejects alternate, rhyme-only and non-unique readings', () => {
  assert.equal(initialSoundGloss('賦也反覆此言'),null);
  assert.equal(initialSoundGloss('音又').direct,'又');
  assert.equal(initialSoundGloss('王又反又音有').fanqie,'王又');
  assert.equal(resolveNote('右','音又').position,'云三C尤去');
  assert.equal(resolveNote('華','叶音花'),null);
  assert.equal(resolveNote('華','又音花'),null);
  assert.equal(resolveNote('華','草盛也音花'),null);
  assert.equal(resolveNote('華','呼瓜反叶音華').position,'曉合二麻平');
  assert.equal(resolveNote('于','音吁'),null); // No silent replacement of a known headword.
  const refs=contextualNotes('桃之夭夭灼灼其華之子于歸宜其室家',[
    {file:'one',parsed:parseCommentary('桃之夭夭灼灼其華(呼瓜反)之子于歸宜其室家')},
    {file:'two',parsed:parseCommentary('桃之夭夭灼灼其華(戶花反)之子于歸宜其室家')}
  ]);
  assert.equal(new Set(refs[7].map(ref=>ref.resolved.position)).size,2);
});

test('sound-gloss variants and lip initials resolve without guessing opening or tone', () => {
  assert.equal(normalizeSoundChar('𥙷'),'補');
  assert.equal(normalizeSoundChar('戸'),'戶');
  assert.equal(normalizeChar('戸'),'戶'); // Reviewed body glyphs are now paired too.
  assert.equal(normalizeChar('奥'),'奧');
  assert.equal(normalizeChar('曰'),'曰'); // Different headwords remain distinct.
  assert.equal(normalizeChar('巳'),'巳');
  assert.equal(resolveNote('行','戸郎反').position,'匣開一唐平');
  assert.equal(resolveNote('朝','直遥反').position,'澄開三宵平');
  assert.equal(resolveNote('褧','苦逈反').position,'溪合四青上');
  assert.equal(resolveNote('共','音㳟').position,'見三C鍾平');
  assert.equal(resolveNote('好','呼報反').position,'曉開一豪去');
  assert.equal(resolveNote('見','賢遍反').position,'匣開四先去');
  assert.equal(resolveNote('𠮷','古半反'),null); // Lip lower: both 開 and 合 remain possible.
  assert.equal(resolveNote('喪','息浪反'),null); // 浪 has both a water-name and a 去聲 reading.
  assert.equal(resolveNote('復','音福'),null); // A sourced borrowed sound needs an explicit rule.
  assert.equal(resolveNote('莫','音慕'),null);
  assert.equal(resolveNote('華','叶呼報反'),null);
});

test('researched choices are scoped to verses and preserve genuine source differences', async () => {
  const {documents}=await readJSON('../public/corpora/shijing.json');
  const doc=ending=>documents.find(d=>d.title.endsWith('・'+ending));
  const positions=(ending,char)=>doc(ending).tokens.filter(t=>t.char===char).map(t=>t.position);
  const at=(ending,index)=>doc(ending).tokens.filter(t=>/\p{Script=Han}/u.test(t.char))[index];
  assert.ok(positions('旱麓','弟').every(p=>p==='定開四齊上'));
  assert.ok(positions('天作','大').every(p=>p==='透開一泰去'));
  assert.equal(at('板',203).position,'定開一泰去'); // 大邦 is independent of nearby 大師.
  assert.ok(positions('文王有聲','大').every(p=>p==='定開一泰去'));
  assert.equal(at('汾沮洳',7).position,'明一模去');
  assert.equal(at('楚茨',111).position,'明二耕入'); // 莫莫音麥 now has its own scoped evidence, independent of 慕.
  assert.ok(positions('小明','共').every(p=>p==='見三C鍾平'));
  assert.equal(at('抑',97).position,'見三C鍾上');
  assert.equal(at('韓奕',33).position,undefined); // 毛九勇反 vs 鄭音恭 still pending.
  assert.equal(at('擊鼓',37).position,'心開一唐去');
  assert.equal(at('緜',17).position,'幫三C東入');
  assert.equal(at('采蘋',29).position,'疑開三B支上');
  assert.equal(at('東山',129).position,'端合一灰平');
  assert.equal(at('斯干',165).position,'影開三C微去');
  assert.equal(at('載見',1).position,'匣開四先去');
  assert.ok(doc('文王').provenance.pendingReadings.some(p=>p.char==='不'));
  const note=doc('旱麓').provenance.readingNotes.find(n=>n.char==='弟');
  assert.match(note.references.find(r=>r.file==='KR1g0003_007.txt').quote,/一音待/);
});

test('whole-book edition preserves all 305 bodies, uncertainty and auditable selections after import/export', async () => {
  const {documents}=await readJSON('../public/corpora/shijing.json');
  const report=await readJSON('../docs/shijing-review.json');
  assert.equal(documents.length,305);
  assert.equal(new Set(documents.map(doc=>doc.title)).size,305);
  const groups={}; let total=0,ready=0,pending=0,readyDocs=0;
  for(const [order,raw]of documents.entries()) {
    assert.equal(raw.provenance.sequenceNumber,order+1);
    assert.equal(raw.provenance.readingSystem,'切韻系讀法');
    assert.ok(!raw.tokens.some(token=>token.skip));
    const [doc]=parseImport(JSON.stringify(raw),'json');
    const stats=documentStatus(doc);total+=stats.total;ready+=stats.ready;pending+=stats.pending;readyDocs+=!stats.pending;
    assert.equal(stats.invalid,0,doc.title);
    assert.equal(stats.skipped,0,doc.title);
    groups[raw.provenance.section]=(groups[raw.provenance.section]||0)+1;
    const chars=doc.tokens.filter(token=>/\p{Script=Han}/u.test(token.char));
    const unresolved=raw.provenance.pendingReadings||[];
    assert.equal(unresolved.length,stats.pending,doc.title);
    for(const item of unresolved){assert.equal(chars[item.index].char,item.char);assert.notEqual(inspectToken(chars[item.index]).status,'ready');}
    for(const token of chars) {
      if(token.position&&!token.confirmed) assert.ok(TshetUinh.資料.query字頭(token.char).some(entry=>entry.音韻地位.描述===token.position),token.char);
      if(token.audit?.[0]?.action==='source-selection') {
        const note=raw.provenance.readingNotes.find(note=>note.id===token.audit[0].references[0].noteId);
        assert.equal(note.char,token.char);assert.equal(note.position,token.position);
        assert.ok(note.basis&&note.references.length);
      }
      const original=[...new Set(TshetUinh.資料.query字頭(token.char).map(entry=>entry.音韻地位.描述))];
      if(original.length)assert.deepEqual([...token.positions].sort(),original.sort(),token.char);
      if(token.confirmed)assert.ok(token.audit?.length,token.char);
    }
    const [again]=parseImport(JSON.stringify(exportDocument(doc)),'json');
    assert.deepEqual(again.tokens,doc.tokens);assert.deepEqual(again.provenance,doc.provenance);
    if(!stats.pending)for(const variant of ['full','three']){
      const session=createSession(practiceTokens(again),variant);let time=0;
      for(const reading of session.tokens){for(const key of variant==='full'?reading.full:reading.triple)assert.notEqual(inputKey(session,key,++time),'wrong');if(variant==='full')inputKey(session,' ',++time);}
      assert.equal(session.finished,true,doc.title);assert.deepEqual(session.errors,[]);
    }
  }
  assert.equal(total,29646);assert.equal(ready,report.counts.readyCharacters);assert.equal(pending,report.counts.pendingCharacters);assert.equal(readyDocs,report.counts.readyDocuments);
  assert.deepEqual(groups,{'周南':11,'召南':14,'邶風':19,'鄘風':10,'衛風':10,'王風':10,'鄭風':21,'齊風':11,'魏風':7,'唐風':12,'秦風':10,'陳風':10,'檜風':4,'曹風':4,'豳風':7,'小雅':74,'大雅':31,'周頌':31,'魯頌':4,'商頌':5});
  assert.equal(Object.values(report.methods).reduce((a,b)=>a+b,0),total);
  assert.equal(report.byCharacter.reduce((n,row)=>n+row.occurrences,0),pending);
  const source=shijingTexts('【周南】\n\n《關雎》\n關關雎鳩。\n\n【小雅】\n\n《鹿鳴之什・鹿鳴》\n呦呦鹿鳴。');
  assert.deepEqual(source.map(doc=>doc.title),['周南・關雎','小雅・鹿鳴之什・鹿鳴']);
});

test('reviewed lexical contexts and borrowed sounds are distinct from other headword readings', async () => {
  const {documents}=await readJSON('../public/corpora/shijing.json');
  const chosen=(ending,char)=>documents.find(doc=>doc.title.endsWith(ending)).tokens.filter(token=>token.char===char).map(token=>token.position);
  assert.ok(chosen('關雎','參').every(pos=>pos==='初開三侵平'));
  assert.ok(chosen('葛覃','害').every(pos=>pos==='匣開一寒入'));
  assert.ok(chosen('麟之趾','于').every(pos=>pos==='曉合三C虞平'));
  assert.ok(chosen('采蘋','齊').every(pos=>pos==='莊開二皆平'));
  assert.ok(chosen('殷其靁','殷').every(pos=>pos==='影開三C殷上'));
  const doc=parseImport(JSON.stringify(documents.find(doc=>doc.title.endsWith('野有死麕'))),'json')[0];
  assert.match(reviewView(doc,'pending',0,[doc]),/本篇待校對依據/);
  assert.match(catalogueView(catalogueEntries,[],{category:'詩經',status:'all'}),/分部下載 JSON/);
});

test('twenty sections split into importable downloads and cover the whole book exactly once', async () => {
  const {downloads}=await readJSON('../public/corpora/shijing-downloads.json');
  const ids=[];assert.ok(downloads.length>=20);assert.equal(new Set(downloads.map(d=>d.section)).size,20);
  for(const item of downloads){const text=await readFile(new URL('../public/'+item.url,import.meta.url),'utf8');assert.ok(Buffer.byteLength(text,'utf8')<2000000);const docs=parseImport(text,'json');assert.equal(docs.length,item.documents);const raw=JSON.parse(text);ids.push(...raw.documents.map(doc=>doc.id));assert.ok(docs.every(doc=>doc.provenance.section===item.section));}
  assert.equal(ids.length,305);assert.equal(new Set(ids).size,305);
});

test('semantic choices distinguish transport, particles, affection and source-specific thinking', async () => {
  const {documents}=await readJSON('../public/corpora/shijing.json');
  const doc=ending=>documents.find(d=>d.title.endsWith('・'+ending));
  const at=(ending,index)=>doc(ending).tokens.filter(t=>/\p{Script=Han}/u.test(t.char))[index];
  const note=(ending,index)=>doc(ending).provenance.readingNotes.find(n=>n.indices.includes(index));
  assert.equal(at('菁菁者莪',52).position,'精開一咍去');
  assert.equal(at('緜蠻',30).position,'從開一咍去');
  assert.equal(at('文王',215).position,'精開一咍去');
  assert.equal(at('大明',92).position,undefined); // Both tones carry 年 in both books.
  assert.equal(at('蟋蟀',56).position,'曉開一豪去');
  assert.equal(at('還',44).position,'曉開一豪上');
  assert.equal(at('巷伯',66).position,undefined);
  assert.equal(at('伯兮',42).position,'心開三之平');
  assert.equal(note('伯兮',42).selectionKind,'semantic-preference');
  assert.match(note('伯兮',42).basis,/並非語義排除了去聲/);
  assert.equal(at('雨無正',208).position,'心開三之去');
  assert.equal(note('雨無正',208).selectionKind,'source-attested');
  assert.equal(at('下武',43).position,undefined);
  assert.equal(at('棫樸',71).position,undefined);
  assert.equal(at('韓奕',203).position,'心開三陽去');
  assert.equal(at('斯干',21).position,'心開三陽平');
  assert.equal(at('斯干',25).position,'心開三陽平');
});

test('early quoted glosses supplement dictionary omissions without changing the original candidates', async () => {
  const {documents}=await readJSON('../public/corpora/shijing.json');
  const doc=ending=>documents.find(d=>d.title.endsWith('・'+ending));
  assert.deepEqual(doc('靈臺').tokens.filter(t=>t.char==='逢').map(t=>t.position),['並一東平','並一東平']);
  const d=doc('載芟'), t=d.tokens.find(t=>t.char==='麃');
  assert.equal(t.position,'幫三B宵平'); assert.equal(t.confirmed,true);
  assert.deepEqual(t.positions,['並二肴平','滂三B宵上']);
  const note=d.provenance.readingNotes.find(n=>n.char==='麃');
  assert.ok(note.references.some(r=>r.quote.includes('字林云穮耕禾閒')));
  assert.ok(note.references.some(r=>r.file==='qieyun-wang3.csv'&&r.char==='穮'&&r.quote==='除田薉。'));
  assert.match(note.basis,/不由字林方遥反單獨判定/);
  assert.ok(doc('出其東門').provenance.readingNotes.some(n=>n.char==='荼'&&n.references.some(r=>r.quote==='音徒茅秀')));
  const parsed=parseImport(JSON.stringify(d),'json')[0];
  const html=reviewView(parsed,'all',0,[parsed]);
  assert.match(html,/刊謬補缺切韻/); assert.match(html,/條目 14010/);
});

test('pinned rhyme-book evidence and exact reviewed occurrences reject corrupt citations', async () => {
  const semantic=await readJSON('../scripts/shijing-semantic.json');
  const {documents}=await readJSON('../public/corpora/shijing.json');
  for(const rule of semantic.rules) {
    assert.ok(rule.occurrences.length);
    for(const o of rule.occurrences) {
      const chars=documents.find(d=>d.title===o.title).tokens.filter(t=>/\p{Script=Han}/u.test(t.char));
      assert.equal(chars[o.index].char,rule.char);
      assert.equal(chars[o.index].position,rule.position);
      assert.equal(chars.slice(Math.max(0,o.index-6),o.index+7).map(t=>t.char).join(''),o.context);
    }
  }
  const r=semantic.rules[0].rhymeReferences[0];
  // An independent, fixed source entry; the full tables are checked by check:corpora.
  const rows=parseRhymeCsv('鈴木ID,字頭,反切,地位,釋義\n2524,爲,薳支反,云合三B支平,薳支反。作。通俗作為。又榮偽反。二。\n');
  validateRhymeReference(r,rows);
  assert.throws(()=>validateRhymeReference({...r,quote:r.quote+'訛'},rows),/引文失效/);
  assert.throws(()=>validateRhymeReference({...r,entryId:'0'},rows),/引文失效/);
  assert.deepEqual(parseRhymeCsv('字頭,釋義\n思,"念，思\n曰"\n'),[{'字頭':'思','釋義':'念，思\n曰'}]);
  assert.throws(()=>parseRhymeCsv('字頭,釋義\n思,"念'),/未結束/);
});

test('new scoped confirmations retain attested alternatives and correct the three helping or honoring 右 readings', async () => {
  const {documents}=await readJSON('../public/corpora/shijing.json');
  const data=await Promise.all(['contexts','meanings','glosses'].map(name=>readJSON(`../scripts/shijing-confirmed-${name}.json`)));
  const triage=await readJSON('../scripts/pending-triage-evidence.json');
  const docById=new Map(documents.map(d=>[d.id,d]));
  const at=(doc,index)=>doc.tokens.filter(t=>/\p{Script=Han}/u.test(t.char))[index];
  const retained=[...triage.cases.filter(r=>r.historical),...data.flatMap(d=>d.deferred||[])];
  const retainedKeys=new Set(retained.map(r=>`${r.id}:${r.index}`));
  for(const row of retained) {
    const token=at(docById.get(row.id),row.index);
    assert.equal(token.char,row.char);
    assert.notEqual(inspectToken(token).status,'ready',`${row.id}:${row.index}`);
  }
  const ruleKeys=new Set();
  for(const rule of data.flatMap(d=>d.rules)) for(const occurrence of rule.occurrences) {
    const doc=documents.find(d=>d.title===occurrence.title), key=`${doc.id}:${occurrence.index}`;
    assert.ok(!ruleKeys.has(key),`duplicate scoped rule: ${key}`);ruleKeys.add(key);
    assert.ok(!retainedKeys.has(key),`retained alternative selected: ${key}`);
    const token=at(doc,occurrence.index);
    assert.equal(token.char,rule.char);assert.equal(inspectToken(token).reading?.position,rule.position,key);
    assert.ok(doc.provenance.readingNotes.some(n=>n.indices.includes(occurrence.index)&&n.references.length),key);
  }
  for(const [id,index] of [['shijing-282',57],['shijing-282',61],['shijing-304',214]]) assert.equal(at(docById.get(id),index).position,'云三C尤去');
  assert.equal(at(docById.get('shijing-195'),156).position,'疑開三C廢去'); // 艾「治也」is not the literal 又 used as its corrupt direct gloss.
  const [doc]=parseImport(JSON.stringify(docById.get('shijing-033')),'json');
  assert.match(reviewView(doc,'pending',0,[doc]),/韋昭音洎/);
});
