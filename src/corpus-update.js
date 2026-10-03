import { newId } from './corpus.js';

// Copies retain their catalogue origin across JSON export/import and local storage.
export function getCatalogueSourceId(document) {
  return document?.provenance?.catalogueCopy?.catalogueId || document?.id || '';
}

export function createCatalogueUpdateCopy(previous, latest, { id = newId(), at = new Date().toISOString() } = {}) {
  if (!previous?.id || !latest?.id || !Array.isArray(latest.tokens)) throw new Error('語料更新資料無效');
  if (getCatalogueSourceId(previous) !== latest.id) throw new Error('新版與原副本的內建語料來源不同');
  if (typeof id !== 'string' || !id || id === previous.id || id === latest.id) throw new Error('新版副本需要獨立識別碼');

  // A new copy avoids transplanting manual readings onto changed text or changing an active session.
  const copy = structuredClone(latest);
  copy.id = id;
  copy.title = `${latest.title}（新版副本）`;
  copy.createdAt = at;
  copy.provenance = {
    ...(copy.provenance || {}),
    catalogueCopy: { catalogueId: latest.id, supersedesId: previous.id, retrievedAt: at },
  };
  return copy;
}
