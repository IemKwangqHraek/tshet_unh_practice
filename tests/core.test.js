import { test } from 'node:test';
import assert from 'node:assert/strict';
import { derive, syllables, keyCandidates, allKeyParts } from '../src/phonology.js';
import { parseImport, documentStatus, confirmToken, skipToken, practiceTokens, exportDocument, escapeHTML } from '../src/corpus.js';
import { createSession, inputKey, pause, resume, elapsedMs, sessionStats, mistakeTokens } from '../src/session.js';
import { defaultSettings, loadState, saveState, cleanSettings } from '../src/storage.js';
import { practiceView, reviewView } from '../src/views.js';
import samples from '../src/data/samples.json' with { type: 'json' };

const one = () => ({ ...derive('曉開四蕭上', '曉'), char: '曉', sourceIndex: 0 });

test('selected 廣韻 韻 and alternate 真韻 preserve their distinct spellings', () => {
  assert.equal(derive('云合三C文去', '韻').full, 'unh');
  assert.equal(derive('云合三C文去', '韻').triple, 'DFC');
  assert.equal(derive('云合三B真去', '韻').full, 'ryinh');
  assert.equal(derive('云合三B真去', '韻').triple, 'DNC');
});

test('bundled scheme reproduces every verified syllable and its fixed key fragments', () => {
  assert.equal(syllables.length, 3809);
  for (const row of syllables) {
    const supplemental = row.full === 'tsvmq';
    const actual = derive(supplemental ? '補充:怎' : row.position, supplemental ? '怎' : '');
    assert.equal(actual.full, row.full, row.position);
    assert.equal(actual.triple, row.triple, row.position);
    assert.deepEqual(actual.parts, row.parts, row.position);
    for (let stage=0;stage<3;stage++) assert.ok(allKeyParts(stage)[row.triple[stage]].includes(row.parts[stage]));
  }
});

test('current-key filtering preserves only legal fragments for the entered prefix', () => {
  const afterQ = keyCandidates(1, 'Q');
  assert.deepEqual(afterQ.J, ['wu','yi']);
  assert.deepEqual(afterQ.U, ['wa']);
  assert.deepEqual(afterQ.K, ['e','ue']);
  const afterQK = keyCandidates(2, 'QK');
  assert.ok(afterQK.H.includes('wq'));
  assert.deepEqual(keyCandidates(1,'VZ').K, []);
});

test('all built-in samples keep original text and author metadata', () => {
  for(const text of samples) {
    const [doc] = parseImport(text,'txt');
    assert.equal(documentStatus(doc).pending,0,doc.title);
    assert.ok(practiceTokens(doc).length>=20);
  }
  const [doc] = parseImport(samples[1],'txt');
  assert.equal(doc.title,'春曉');
  assert.equal(doc.author,'孟浩然');
  assert.equal(practiceTokens(doc).length,20);
  assert.equal(doc.tokens.map(t=>t.char).join(''),'春眠不覺曉，處處聞啼鳥。\n夜來風雨聲，花落知多少？');
});

test('missing, multiple, invalid and dictionary-absent readings require review', () => {
  const [doc]=parseImport('# 測試\n聞(明三C文平|明三C文去)曉抬(定開一咍平)韻(壞標註)。','txt');
  const status=documentStatus(doc);
  assert.equal(status.multiple,1);assert.equal(status.missing,1);assert.equal(status.absent,1);assert.equal(status.invalid,1);
  assert.throws(()=>practiceTokens(doc),/校對/);
  confirmToken(doc.tokens[0],'明三C文去');
  confirmToken(doc.tokens[1],'曉開四蕭上');
  confirmToken(doc.tokens[2],'定開一咍平');
  skipToken(doc.tokens[3]);
  assert.equal(documentStatus(doc).pending,0);
  assert.deepEqual(practiceTokens(doc).map(t=>t.full),['munh','hewq','doi']);
  assert.equal(doc.tokens[0].positions.length,2);
  assert.equal(doc.tokens[0].audit[0].action,'confirm');
  const [roundtrip]=parseImport(JSON.stringify(exportDocument(doc)),'json');
  assert.deepEqual(practiceTokens(roundtrip),practiceTokens(doc));
  assert.deepEqual(roundtrip.tokens[0].audit,doc.tokens[0].audit);
});

test('TSV and Unicode-indexed JSON accept non-BMP characters and preserve punctuation', () => {
  const [doc]=parseImport('字\t音韻地位\n韻\t云合三C文去\n，\t\n切\t清開四先入\n','tsv');
  assert.deepEqual(practiceTokens(doc).map(t=>t.full),['unh','tshet']);
  const [json]=parseImport(JSON.stringify({text:'𩦠韻。',annotations:[{index:0,char:'𩦠',position:'並三A陽上'},{index:1,position:'云合三C文去'}]}),'json');
  assert.equal(practiceTokens(json).length,2);
  assert.equal(practiceTokens(json)[0].char,'𩦠');
  assert.throws(()=>parseImport('{broken','json'),/JSON/);
  assert.throws(()=>parseImport('春眠\t昌合三真平','tsv'),/一個字/);
  assert.throws(()=>parseImport('   ','txt'),/貼入/);
  assert.throws(()=>parseImport('春(昌合三真平','txt'),/右括號/);
  assert.throws(()=>parseImport('{"title":{},"text":"韻"}','json'),/文字/);
  assert.throws(()=>parseImport('{"text":"韻","annotations":{}}','json'),/陣列/);
});

test('three-key errors block input until backspace, retain the correct prefix and count retries', () => {
  const s=createSession([one()],'three',defaultSettings);
  assert.equal(inputKey(s,'q',0),'correct');
  assert.equal(inputKey(s,'r',1000),'wrong');
  assert.equal(inputKey(s,'k',1200),'blocked');
  assert.equal(s.attempts,2);
  inputKey(s,'Backspace',1500);assert.equal(s.buffer,'Q');
  inputKey(s,'k',2000);assert.equal(inputKey(s,'h',3000),'finished');
  assert.equal(s.correct,3);assert.equal(s.attempts,4);
  assert.deepEqual(sessionStats(s,9999).stageErrors,[0,1,0]);
  assert.equal(sessionStats(s,9999).accuracy,75);
  assert.equal(sessionStats(s,9999).milliseconds,3000);
  assert.equal(mistakeTokens(s).length,1);
});

test('full spelling confirms only with Space and excludes pauses and confirmation keys from accuracy', () => {
  const s=createSession([one()],'full',defaultSettings);
  inputKey(s,'h',1000);inputKey(s,'e',2000);
  assert.equal(inputKey(s,' ',2500),'incomplete');
  pause(s,3000);assert.equal(elapsedMs(s,9000),2000);
  assert.equal(inputKey(s,'w',9000),'paused');
  resume(s,10000);inputKey(s,'w',11000);inputKey(s,'q',12000);
  assert.equal(s.finished,false);assert.equal(inputKey(s,'x',12500),'confirm');
  assert.equal(inputKey(s,' ',13000),'finished');
  assert.equal(s.attempts,4);assert.equal(s.elapsed,5000);
  assert.equal(sessionStats(s,30000).accuracy,100);
});

test('advanced QWERTY view reveals no reading when all independent helpers are off', () => {
  const [doc]=parseImport('曉(曉開四蕭上)','txt');
  const settings={...defaultSettings,keyMode:'qwerty',showFull:false,showParts:false,showPosition:false};
  const s=createSession(practiceTokens(doc),'three',settings);
  const html=practiceView(doc,s,settings,[doc]);
  assert.ok(!html.includes('hewq'));
  assert.ok(!html.includes('曉開四蕭上'));
  assert.ok(!html.includes('highlighted'));
  assert.ok(!html.includes('wq'));
  assert.equal(escapeHTML('<img onerror="x">'),'&lt;img onerror=&quot;x&quot;&gt;');
  doc.title='<script>alert(1)</script>';
  assert.ok(!reviewView(doc,'all',0,[doc]).includes('<script>'));
});

test('storage reports corrupt data and quota failure and normalizes persisted settings', () => {
  assert.ok(loadState({getItem:()=>'{oops'}).error);
  assert.ok(saveState({setItem:()=>{throw new Error('QuotaExceeded');}},{documents:[]}).includes('保存'));
  assert.equal(cleanSettings({variant:'wrong',keyMode:'wrong'}).keyMode,'full-highlight');
  const saved={version:1,documents:[],history:[]};
  assert.deepEqual(loadState({getItem:()=>JSON.stringify(saved)}).data,saved);
});
