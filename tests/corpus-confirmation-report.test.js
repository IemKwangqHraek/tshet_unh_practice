import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inspectToken, parseImport } from '../src/corpus.js';
import { reviewView } from '../src/views.js';
import { rewindTangSourceReadings } from '../scripts/tang-source-readings.mjs';
import { rewindShijingRhymeReview } from '../scripts/shijing-rhyme-review.mjs';

const root=new URL('../',import.meta.url);
const read=path=>readFile(new URL(path,root));
const json=async path=>JSON.parse(await read(path));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

function precedingPack(pack) {
  return { ...pack, documents: pack.documents.map(document => {
    const previous = rewindShijingRhymeReview(rewindTangSourceReadings(document));
    // The stored before-token is the builder's pre-export object. Restore the
    // original compact export order and omission of empty defaults as well.
    const order = ['char', 'positions', 'position', 'confirmed', 'skip', 'audit', 'sourceReading', 'conversion'];
    return { ...previous, tokens: previous.tokens.map(token => Object.fromEntries(order
      .filter(key => key in token && !(['positions', 'audit'].includes(key) && !token[key].length)
        && !(['position', 'confirmed', 'skip'].includes(key) && !token[key]))
      .map(key => [key, token[key]]))) };
  }) };
}

test('confirmation report accounts for every change and preserves all original bodies and full annotations',async()=>{
  const report=await json('docs/corpus-confirmation-review.json');
  for(const [path,expected] of Object.entries(report.inputHashes)) {
    const bytes = ['public/corpora/tang.json', 'public/corpora/shijing.json'].includes(path)
      ? JSON.stringify(precedingPack(await json(path))) + '\n' : await read(path);
    assert.equal(hash(bytes),expected,path);
  }
  const packs=await Promise.all(['classics','analects','tang','shijing'].map(pack=>json(`public/corpora/${pack}.json`)));
  // This report records the preceding confirmation stage. Later Tang text and
  // source selections have their own audit; validate the report against its input.
  const documents=new Map(packs.flatMap(pack=>pack.documents).map(doc=>[doc.id,rewindShijingRhymeReview(rewindTangSourceReadings(doc))]));
  assert.equal(report.preservation.length,documents.size);
  for(const row of report.preservation){
    const doc=documents.get(row.id);
    assert.equal(hash(doc.tokens.map(t=>t.char).join('')),row.textSha256,row.id);
    if(row.originalRomanizationSha256)assert.equal(hash(doc.provenance.originalRomanization),row.originalRomanizationSha256,row.id);
  }
  const keys=new Set();
  for(const row of report.changes){
    const key=`${row.id}:${row.index}`;assert.ok(!keys.has(key),key);keys.add(key);
    const token=documents.get(row.id).tokens.filter(t=>/\p{Script=Han}/u.test(t.char))[row.index];
    assert.equal(token.char,row.char,key);assert.equal(inspectToken(token).reading?.position,row.after.position,key);
    assert.ok(row.evidence&&row.method,key);
  }
  for(const kind of ['newlyConfirmed','corrected','reopened']) assert.equal(report.changes.filter(row=>row.kind===kind).length,report.totals[kind]);
  assert.equal(report.totals.pendingBefore-report.totals.pendingAfter,report.totals.newlyConfirmed-report.totals.reopened);
  const [reviewed]=parseImport(JSON.stringify(documents.get('poly-analects-489')),'json');
  const html=reviewView(reviewed,'all',0,[reviewed]);
  assert.match(html,/原注配對校訂/);assert.match(html,/本句音義核定/);assert.match(html,/原始 polyhedron 拼音/);
});
