import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseImport, confirmToken, practiceTokens, exportDocument } from '../src/corpus.js';
import { reviewEntries, reviewView, libraryView } from '../src/views.js';
import { catalogueEntries } from '../src/catalogue.js';

const documentOf = tokens => ({ id: 'review-fixture', title: '校對測試', author: '', source: '', license: '', tokens });
const cards = html => [...html.matchAll(/<article class="review-entry" data-token-index="(\d+)"/g)].map(m => Number(m[1]));
const rowHTML = html => html.slice(html.indexOf('<div class="review-entries">'));

function mixedDocument() {
  return documentOf([
    { char: '闻', positions: [], skip: true },
    { char: '，' },
    { char: '聞', positions: ['明三C文平', '明三C文去'], position: '明三C文平' },
    { char: '。' },
    { char: '曉', positions: ['曉開四蕭上'] },
    { char: '聞', positions: ['明三C文平', '明三C文去'] },
    { char: '曉', positions: [] },
  ]);
}

test('review filters include selected polyphonic tokens and distinguish ready, pending and skipped', () => {
  const doc = mixedDocument();
  assert.deepEqual(reviewEntries(doc, 'all').map(r => r.index), [0, 2, 4, 5, 6]);
  assert.deepEqual(reviewEntries(doc, 'ready').map(r => r.index), [2, 4]);
  assert.deepEqual(reviewEntries(doc, 'pending').map(r => r.index), [5, 6]);
  assert.deepEqual(reviewEntries(doc, 'polyphonic').map(r => r.index), [2, 5]);
  for (const filter of ['all', 'ready', 'pending', 'polyphonic']) {
    const html = reviewView(doc, filter, 0, [doc]);
    assert.deepEqual(cards(html), reviewEntries(doc, filter).map(r => r.index));
    assert.ok(html.includes(`data-filter="${filter}" aria-pressed="true"`));
  }
});

test('current full spelling is distinct from preserved polyhedron spelling and original alternatives', () => {
  const doc = documentOf([{ char: '將', positions: ['清開三陽平', '精開三陽平'], position: '精開三陽平', sourceReading: 'chiang/tsiang', confirmed: true }]);
  const html = reviewView(doc, 'polyphonic', 0, [doc]);
  assert.match(html, /目前採讀 · 全拼<\/div><div class="review-current-full mono">tsvang<\/div>/);
  assert.match(html, /polyhedron 原注<\/div><p class="mono">chiang\/tsiang<\/p>/);
  assert.ok(html.includes('清開三陽平 | 精開三陽平'));
  assert.match(html, /data-action="choose-reading" data-index="0" data-position="清開三陽平"/);
  assert.ok(html.includes('韻書音義'));
});

test('an explicitly selected position absent from the headword dictionary remains visible and selectable', () => {
  const token = { char: '將', positions: [], position: '清開三陽平', sourceReading: 'chiang', confirmed: true };
  const doc = documentOf([token]);
  const [entry] = reviewEntries(doc, 'polyphonic');
  assert.equal(entry.current.full, 'tshvang');
  assert.ok(entry.candidates.some(r => r.position === '清開三陽平'));
  const html = reviewView(doc, 'polyphonic', 0, [doc]);
  assert.match(html, /review-current-full mono">tshvang<\/div>/);
  assert.match(html, /data-position="清開三陽平"/);
  assert.ok(html.includes('字庫未收此字此音'));
});

test('slash alternatives remain reviewable even when only one maps to a dictionary position', () => {
  const doc = documentOf([{ char: '曉', positions: ['曉開四蕭上'], sourceReading: 'heux/heu', position: '曉開四蕭上' }]);
  assert.equal(reviewEntries(doc, 'polyphonic').length, 1);
  assert.ok(reviewView(doc, 'polyphonic', 0, [doc]).includes('heux/heu'));
  doc.tokens[0].sourceReading = 'heux/unknown/???';
  assert.equal(reviewEntries(doc, 'polyphonic').length, 0);
});

test('per-token evidence follows Han indices and note references without leaking other character notes', () => {
  const doc = documentOf([{ char: '𩦠', position: '並三A陽上' }, { char: '，' }, { char: '聞', positions: ['明三C文平', '明三C文去'], position: '明三C文去', audit: [{ action: 'source-selection', before: ['明三C文平', '明三C文去'], after: '明三C文去', reason: '本句名聞', references: [{ noteId: 'named-note' }] }] }]);
  doc.provenance = { readingNotes: [
    { id: 'other', indices: [0], basis: '另一字專用依據' },
    { id: 'named-note', indices: [1], position: '明三C文去', basis: '本句聲名義', references: [{ book: '廣韻', fanqie: '亡運', quote: '名達', url: 'https://example.org/source' }] },
  ], pendingReadings: [{ index: 1, reason: '保留古注又音', sourceNotes: [{ page: '卷一', quote: '又音聞' }] }] };
  const entry = reviewEntries(doc, 'polyphonic')[0];
  assert.equal(entry.index, 2);
  assert.equal(entry.hanIndex, 1);
  const rows = rowHTML(reviewView(doc, 'polyphonic', 0, [doc]));
  assert.ok(rows.includes('本句聲名義'));
  assert.ok(rows.includes('亡運'));
  assert.ok(rows.includes('又音聞'));
  assert.ok(!rows.includes('另一字專用依據'));
  assert.ok(rows.includes('第 2 字'));
});

test('choosing a rendered option uses confirmToken and preserves original readings through export', () => {
  const doc = documentOf([{ char: '聞', positions: ['明三C文平', '明三C文去'], position: '明三C文平', sourceReading: 'miun/miunh' }]);
  const html = reviewView(doc, 'polyphonic', 0, [doc]);
  const target = html.match(/data-action="choose-reading" data-index="(\d+)" data-position="(明三C文去)"/);
  assert.ok(target);
  confirmToken(doc.tokens[Number(target[1])], target[2]);
  const changed = rowHTML(reviewView(doc, 'polyphonic', 0, [doc]));
  assert.match(changed, /review-current-full mono">munh<\/div>/);
  assert.ok(changed.includes('人工確認'));
  assert.ok(changed.includes('明三C文平 | 明三C文去'));
  assert.ok(changed.includes('miun/miunh'));
  assert.equal(reviewEntries(doc, 'pending').length, 0);
  assert.equal(reviewEntries(doc, 'polyphonic').length, 1);
  assert.equal(practiceTokens(doc)[0].full, 'munh');
  const [restored] = parseImport(JSON.stringify(exportDocument(doc)), 'json');
  assert.equal(practiceTokens(restored)[0].full, 'munh');
  assert.deepEqual(restored.tokens[0].audit, doc.tokens[0].audit);
  assert.equal(restored.tokens[0].sourceReading, 'miun/miunh');
});

test('searching one Han character finds its exact occurrences rather than adjacent context', () => {
  const [doc] = parseImport('將(精開三陽平)進(精開三真去)酒(精三尤上)，將(精開三陽平)進(精開三真去)酒(精三尤上)。', 'txt');
  assert.deepEqual(reviewEntries(doc, 'all', '將').map(r => r.index), [0, 4]);
  assert.deepEqual(cards(reviewView(doc, 'polyphonic', 0, [doc], '將')), [0, 4]);
  assert.deepEqual(reviewEntries(doc, 'all', 'TSVANG').map(r => r.index), [0, 4]);
  assert.ok(reviewEntries(doc, 'all', '將進酒').length > 0);
  assert.ok(reviewView(doc, 'all', 0, [doc], '不存在').includes('沒有符合的字位'));
});

test('pagination keeps token indices and clamps a page after the result count shrinks', () => {
  const doc = documentOf(Array.from({ length: 23 }, () => ({ char: '聞', position: '明三C文平' })));
  assert.deepEqual(cards(reviewView(doc, 'polyphonic', 1, [doc])), [20, 21, 22]);
  assert.deepEqual(cards(reviewView(doc, 'polyphonic', 999, [doc])), [20, 21, 22]);
  assert.deepEqual(cards(reviewView(doc, 'polyphonic', -1, [doc])), Array.from({ length: 20 }, (_, i) => i));
  assert.ok(reviewView(doc, 'pending', 1, [doc]).includes('讀音已校對完成'));
  const blank = documentOf([{ char: '曉' }]);
  assert.ok(reviewView(blank, 'ready', 0, [blank]).includes('尚無已確認讀音'));
  assert.ok(reviewView(blank, 'polyphonic', 0, [blank]).includes('本篇沒有多音字條目'));
});

test('invalid and untrusted source annotations remain escaped text instead of executable markup', () => {
  const doc = documentOf([{ char: '聞', positions: ['<script>bad()</script>'], sourceReading: '<img src=x onerror=bad()>' }]);
  doc.provenance = { readingNotes: [{ indices: [0], basis: '<script>basis()</script>', references: [{ quote: '<img src=x onerror=bad()>', url: 'javascript:bad()' }] }] };
  const html = rowHTML(reviewView(doc, 'all', 0, [doc], ''));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(html.includes('&lt;script&gt;bad()&lt;/script&gt;'));
  assert.ok(!html.includes('data-position="&lt;script&gt;'));
});

test('ready library cards link to the same polyphonic review and catalogue copies expose safe update action', () => {
  const doc = documentOf([{ char: '聞', position: '明三C文平' }]);
  doc.id = catalogueEntries[0].id;
  const html = libraryView([doc], doc.id);
  assert.ok(html.includes('data-action="review-doc" data-id="' + doc.id + '" data-filter="polyphonic"'));
  assert.ok(html.includes('data-action="update-catalogue-copy"'));
  const copy = { ...doc, id: 'new-copy', provenance: { catalogueCopy: { catalogueId: doc.id } } };
  assert.ok(reviewView(copy, 'polyphonic', 0, [copy]).includes('data-action="update-catalogue-copy" data-id="new-copy"'));
  const imported = { ...doc, id: 'own-document' };
  assert.ok(!reviewView(imported, 'polyphonic', 0, [imported]).includes('data-action="update-catalogue-copy"'));
});

test('user-directed source overrides render object audit entries and their scoped Tang evidence', () => {
  const doc = documentOf([{ char: '將', positions: ['清開三陽平'], position: '精開三陽平', confirmed: true, sourceReading: 'chiang', audit: [{ action: 'user-reading-override', before: { char: '將', positions: ['清開三陽平'] }, after: { char: '將', position: '精開三陽平' }, reason: '使用者指定本句', references: [{ kind: 'user-instruction', quote: '請用 tsvang' }] }] }]);
  doc.provenance = { tangSourceReadings: { notes: [{ index: 0, char: '將', targetChar: '將', position: '精開三陽平', basis: '唐詩逐字覆核證據', references: [{ file: 'poly-tang.txt', line: 10, quote: 'chiang tsinh tsiux' }] }, { index: 1, char: '進', targetChar: '進', basis: '另一字的校訂' }] } };
  const html = reviewView(doc, 'polyphonic', 0, [doc]);
  assert.ok(html.includes('polyhedron 原注與選讀校訂'));
  const rows = rowHTML(html);
  assert.ok(rows.includes('使用者指定'));
  assert.ok(!rows.includes('依來源校訂'));
  assert.ok(!rows.includes('[object Object]'));
  assert.ok(rows.includes('將 · 清開三陽平 → 將 · 精開三陽平'));
  assert.ok(rows.includes('唐詩逐字覆核證據'));
  assert.ok(rows.includes('poly-tang.txt · 第 10 行'));
  assert.ok(!rows.includes('另一字的校訂'));
});
