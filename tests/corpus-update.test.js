import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseImport, exportDocument, confirmToken, skipToken } from '../src/corpus.js';
import { createCatalogueUpdateCopy, getCatalogueSourceId } from '../src/corpus-update.js';
import { catalogueEntries, loadCatalogueDocument } from '../src/catalogue.js';

const document = (text, id = 'poly-tang-77') => ({ ...parseImport(`# 將進酒\n${text}`, 'txt')[0], id });

test('explicit update fetches fresh corpus content while ordinary additions reuse the loaded pack', async () => {
  const entry = catalogueEntries.find(row => row.id === 'poly-tang-77');
  const requests = [];
  let version = '舊';
  const fetcher = async (url, options) => {
    requests.push({ url, options });
    const docs = [];
    docs[entry.index] = { id: entry.id, title: version, tokens: [{ char: '將', position: '精開三陽平' }] };
    return { ok: true, json: async () => ({ version: 1, documents: docs }) };
  };
  const first = await loadCatalogueDocument(entry.id, fetcher, '/', { refresh: true });
  version = '新';
  const cached = await loadCatalogueDocument(entry.id, fetcher);
  const fresh = await loadCatalogueDocument(entry.id, fetcher, '/', { refresh: true });
  assert.equal(first.title, '舊');
  assert.equal(cached.title, '舊');
  assert.equal(fresh.title, '新');
  assert.equal(requests.length, 2);
  assert.ok(requests.every(request => request.options.cache === 'no-store'));
});

test('updated copies preserve old text, manual readings and skipped tokens without mutating the catalogue', () => {
  const previous = document('不(幫三C文入)將(清開三陽平)。');
  confirmToken(previous.tokens[0], '幫三C尤上');
  skipToken(previous.tokens[1]);
  const latest = document('何(匣開一歌平)將(精開三陽平)。');
  latest.provenance = { annotationCommit: 'fixed-source', originalRomanization: 'gha chiang' };
  const beforePrevious = structuredClone(previous), beforeLatest = structuredClone(latest);
  const copy = createCatalogueUpdateCopy(previous, latest, { id: 'copy-1', at: '2026-10-03T12:00:00Z' });

  assert.deepEqual(previous, beforePrevious);
  assert.deepEqual(latest, beforeLatest);
  assert.equal(copy.id, 'copy-1');
  assert.equal(copy.title, '將進酒（新版副本）');
  assert.equal(copy.tokens[0].char, '何');
  assert.deepEqual(copy.tokens, latest.tokens);
  assert.equal(copy.provenance.originalRomanization, 'gha chiang');
  copy.tokens[0].positions.push('匣開一歌上');
  assert.deepEqual(latest, beforeLatest);
});

test('catalogue origins survive export/import and allow a later updated copy', () => {
  const previous = document('何(匣開一歌平)。');
  const latest = document('何(匣開一歌平)。');
  const first = createCatalogueUpdateCopy(previous, latest, { id: 'copy-1' });
  const restored = { ...parseImport(JSON.stringify(exportDocument(first)), 'json')[0], id: first.id };
  assert.equal(getCatalogueSourceId(restored), latest.id);
  assert.equal(restored.provenance.catalogueCopy.supersedesId, previous.id);
  const next = createCatalogueUpdateCopy(restored, latest, { id: 'copy-2' });
  assert.equal(next.provenance.catalogueCopy.supersedesId, 'copy-1');
  assert.equal(next.title, '將進酒（新版副本）');
});

test('update copies reject a mismatched source or an id that could replace an existing document', () => {
  const previous = document('何(匣開一歌平)。');
  assert.throws(() => createCatalogueUpdateCopy(previous, document('何(匣開一歌平)。', 'poly-tang-78')), /來源不同/);
  assert.throws(() => createCatalogueUpdateCopy(previous, previous, { id: previous.id }), /獨立識別碼/);
  assert.throws(() => createCatalogueUpdateCopy(null, previous), /無效/);
  assert.equal(getCatalogueSourceId(null), '');
});
