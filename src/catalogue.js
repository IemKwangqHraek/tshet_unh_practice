import catalogue from './data/catalogue.json' with { type: 'json' };
import { parseImport } from './corpus.js';

export const catalogueEntries = catalogue.entries;
export const cataloguePageSize = 18;
const packs = new Map();

export function filterCatalogue(entries, { query = '', category = '', status = 'ready' } = {}) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter(entry => (!category || entry.category === category)
    && (status === 'all' || status === 'ready' && !entry.pending || status === 'pending' && entry.pending)
    && terms.every(term => `${entry.title} ${entry.author} ${entry.excerpt}`.toLocaleLowerCase().includes(term)));
}

export async function loadCatalogueDocument(id, fetcher = fetch, base = '/') {
  const entry = catalogueEntries.find(e => e.id === id);
  if (!entry) throw new Error('找不到這篇內建語料');
  if (!packs.has(entry.pack)) {
    packs.set(entry.pack, (async () => {
      const response = await fetcher(`${base}corpora/${entry.pack}.json`);
      if (!response.ok) throw new Error('內建語料載入失敗，請重試');
      const pack = await response.json();
      if (pack.version !== 1 || !Array.isArray(pack.documents)) throw new Error('內建語料格式無效');
      return pack.documents;
    })());
  }
  let documents;
  try { documents = await packs.get(entry.pack); }
  catch (error) { packs.delete(entry.pack); throw error; }
  const raw = documents[entry.index];
  if (raw?.id !== entry.id) throw new Error('內建語料索引不一致');
  return { ...parseImport(JSON.stringify(raw), 'json')[0], id: raw.id };
}
