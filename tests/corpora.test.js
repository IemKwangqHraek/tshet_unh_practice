import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import TshetUinh from 'tshet-uinh';
import { romanizePolyhedron } from '../src/polyhedron-scheme.js';
import { alignPolyhedron, convertReading, parsePolyhedronPairs, syllablesIn } from '../src/polyhedron.js';
import { parseImport, inspectToken, documentStatus, exportDocument, confirmToken, practiceTokens } from '../src/corpus.js';
import { catalogueEntries, filterCatalogue, loadCatalogueDocument } from '../src/catalogue.js';
import { reviewView } from '../src/views.js';
import { createSession, inputKey } from '../src/session.js';

test('source-selected readings preserve tone and differ from the sample selection', () => {
  assert.equal(romanizePolyhedron(TshetUinh.音韻地位.from描述('端一東平')), 'tung');
  assert.deepEqual(convertReading('不', 'pyot').positions, ['幫三C文入']);
  assert.deepEqual(convertReading('韻', 'yonh').positions, ['云合三C文去']);
  assert.deepEqual(convertReading('韻', 'ynh').positions, ['云合三B真去']);
  assert.equal(convertReading('不', 'pyot').conversion, 'dictionary-match');
});

test('alignment handles punctuation, hyphens, multiline comments and editorial uncertainty', () => {
  assert.deepEqual(syllablesIn('leu(lek?)-lak, pjiix (??). # 備註\ntung ??? ?'), ['leu/lek','lak','pjiix/unknown','tung','???']);
  const tokens = alignPolyhedron('子曰、學而時習之、不亦說乎。', 'cix yat: ghruk nji zji zsip cji, pyot jek jyet gho?');
  assert.equal(tokens.filter(t=>t.sourceReading).length,11);
  assert.equal(tokens.map(t=>t.char).join(''),'子曰、學而時習之、不亦說乎。');
  assert.throws(()=>alignPolyhedron('子曰。','cix'), /不一致/);
  assert.equal(alignPolyhedron('𠮷。','qjit')[0].char,'𠮷');
});

test('alternatives and unattested mappings require review and retain source evidence after export', () => {
  const [doc] = parseImport(JSON.stringify({title:'多讀',tokens:alignPolyhedron('韻。','yonh/unknown')}),'json');
  assert.equal(inspectToken(doc.tokens[0]).status,'multiple');
  assert.throws(()=>practiceTokens(doc),/校對/);
  assert.notEqual(inspectToken(convertReading('抬','tung')).status,'ready');
  confirmToken(doc.tokens[0],'云合三C文去');
  const [again] = parseImport(JSON.stringify(exportDocument(doc)),'json');
  assert.equal(inspectToken(again.tokens[0]).status,'ready');
  assert.equal(again.tokens[0].sourceReading,'yonh/unknown');
  assert.equal(again.tokens[0].audit.length,1);
  assert.equal(convertReading('韻','???').conversion,'unmapped');
});

test('original Analects format carries source metadata and rejects misaligned passages', () => {
  const source='#論語中古漢語拼音（切韻音系）標音\n#licence: cc by-nc-sa 3.0\n論語\nluon ngiox\n#學而第一\nghruk nji deh qjit\n子曰、學。\ncix yat ghruk\n';
  const [doc] = parseImport(source,'auto');
  assert.equal(doc.title,'學而第一 · 1');
  assert.match(doc.license,/BY-NC-SA/);
  assert.match(doc.source,/biopolyhedron/);
  assert.equal(documentStatus(doc).pending,0);
  assert.throws(()=>parsePolyhedronPairs('子曰。\ncix'),/不一致/);
  const [unaligned]=parsePolyhedronPairs('子曰。\ncix',{allowUnaligned:true});
  assert.ok(unaligned.tokens.every(t=>!t.positions));
  assert.match(unaligned.provenance.alignmentError,/不一致/);
});

test('every catalogue record matches corpus status; reliable readings round-trip to the source', async () => {
  assert.ok(catalogueEntries.length>=840);
  assert.ok(catalogueEntries.filter(e=>!e.pending).length>=490);
  assert.equal(catalogueEntries.filter(e=>e.pack==='tang').length,303);
  assert.equal(catalogueEntries.filter(e=>e.pack==='analects').length,533);
  assert.equal(new Set(catalogueEntries.map(e=>e.id)).size,catalogueEntries.length);
  const perPack = new Map();
  for(const entry of catalogueEntries) {
    if(!perPack.has(entry.pack)) perPack.set(entry.pack,JSON.parse(await readFile(new URL(`../public/corpora/${entry.pack}.json`,import.meta.url),'utf8')).documents);
    const raw=perPack.get(entry.pack)[entry.index];
    assert.equal(raw.id,entry.id);
    const [doc]=parseImport(JSON.stringify(raw),'json');
    const stats=documentStatus(doc);
    assert.equal(stats.total,entry.total,entry.title);
    assert.equal(stats.ready,entry.ready,entry.title);
    assert.equal(stats.pending,entry.pending,entry.title);
    assert.equal(stats.invalid,0,entry.title);
    for(const token of doc.tokens.filter(t=>t.conversion==='dictionary-match')) {
      assert.equal(romanizePolyhedron(TshetUinh.音韻地位.from描述(token.positions[0]),token.char),token.sourceReading,`${entry.id}: ${token.char}`);
    }
    if(raw.provenance.alignmentError) assert.equal(stats.ready,0);
  }
});

test('catalogue search, readiness filters and lazy loading preserve metadata without mutating the pack', async () => {
  const allSongs=filterCatalogue(catalogueEntries,{category:'宋詞',status:'all'});
  assert.equal(allSongs.length,9);
  assert.ok(filterCatalogue(catalogueEntries,{query:'辛棄疾 元夕',status:'all'}).length);
  assert.ok(filterCatalogue(catalogueEntries,{status:'ready'}).every(e=>!e.pending));
  const fetcher=async url=>({ok:true,json:async()=>JSON.parse(await readFile(new URL(`../public${url}`,import.meta.url),'utf8'))});
  const doc=await loadCatalogueDocument('poly-tang-3',fetcher);
  assert.ok(doc.provenance.originalRomanization);
  doc.tokens[0].char='改';
  const again=await loadCatalogueDocument('poly-tang-3',fetcher);
  assert.notEqual(again.tokens[0].char,'改');
  assert.deepEqual(parseImport(JSON.stringify(exportDocument(again)),'json')[0].provenance,again.provenance);
  await assert.rejects(()=>loadCatalogueDocument('unknown',fetcher),/找不到/);
});

test('Shijing pilots select source readings, preserve alternatives and export the editorial evidence', async () => {
  const pack=JSON.parse(await readFile(new URL('../public/corpora/shijing.json',import.meta.url),'utf8'));
  const expected={
    'shijing-fuyi': {掇:'端合一寒入',袺:'見開四先入'},
    'shijing-taoyao': {夭:'影開三B宵平',其:'羣開三C之平',華:'曉合二麻平',葉:'以開三鹽入'}
  };
  assert.equal(pack.documents.length,305);
  assert.equal(filterCatalogue(catalogueEntries,{category:'詩經',status:'all'}).length,305);
  for(const raw of pack.documents.filter(doc=>expected[doc.id])) {
    const [doc]=parseImport(JSON.stringify(raw),'json');
    assert.equal(documentStatus(doc).total,48);
    assert.equal(documentStatus(doc).ready,48);
    assert.equal(documentStatus(doc).pending,0);
    assert.ok(doc.tokens.every(t=>!t.skip));
    for(const [char,position] of Object.entries(expected[raw.id])) {
      const tokens=doc.tokens.filter(t=>t.char===char);
      assert.ok(tokens.length);
      for(const token of tokens) {
        assert.equal(token.position,position);
        assert.ok(token.positions.length>1,`${char}: original dictionary alternatives`);
        assert.equal(token.audit[0].after,position);
        assert.ok(token.audit[0].references.length);
      }
    }
    const [again]=parseImport(JSON.stringify(exportDocument(doc)),'json');
    assert.deepEqual(again.provenance,doc.provenance);
    assert.deepEqual(again.tokens,doc.tokens);
    assert.match(doc.license,/CC BY-SA 4\.0/);
    assert.equal(doc.provenance.readingSystem,'切韻系讀法');
    assert.match(reviewView(doc,'all',0,[doc]),/本篇選讀依據/);
    for(const variant of ['three','full']) {
      const session=createSession(practiceTokens(again),variant);
      let time=0;
      for(const reading of session.tokens) {
        for(const key of variant==='three'?reading.triple:reading.full) assert.notEqual(inputKey(session,key,++time),'wrong');
        if(variant==='full') inputKey(session,' ',++time);
      }
      assert.equal(session.cursor,48);
      assert.equal(session.finished,true);
      assert.deepEqual(session.errors,[]);
    }
  }
  const fuyi=pack.documents.find(doc=>doc.id==='shijing-fuyi');
  assert.match(fuyi.provenance.readingNotes.find(note=>note.char==='掇').basis,/知劣反/);
  const taoyao=pack.documents.find(doc=>doc.id==='shijing-taoyao');
  assert.ok(taoyao.provenance.readingNotes.find(note=>note.char==='華').references.some(r=>r.commit==='revision:2626705'));
});
