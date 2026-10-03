import { inspectToken } from '../src/corpus.js';
import { isHan } from '../src/polyhedron.js';
import { normalizeChar, parseCommentary } from './shijing-commentary.mjs';
import shijingVariants from './shijing-variants.json' with { type: 'json' };
import headwordVariants from './corpus-headword-variants.json' with { type: 'json' };

// Pairing coverage is distinct from an attested sound gloss. A matched window
// does not imply the edition supplies, or uniquely resolves, a pronunciation.
export function windowCoverage(text, sources, differences = []) {
  const chars = [...text].filter(isHan), counts = { exactOrGlyph: 0, scopedDifference: 0, unmatched: 0 };
  const unmatched = [];
  for (const [index, char] of chars.entries()) {
    const start = Math.max(0, Math.min(index - 5, chars.length - 11));
    const window = chars.slice(start, start + 11), normalized = window.map(normalizeChar).join('');
    if (window.length >= 8 && sources.some(s => s.parsed.text.includes(normalized))) { counts.exactOrGlyph++; continue; }
    const matched = window.length >= 8 && sources.some(s => {
      const scoped = differences.filter(d => d.file === s.file && d.index >= start && d.index < start + window.length);
      if (!scoped.length) return false;
      const wanted = window.map((c, i) => normalizeChar(scoped.find(d => d.index === start + i)?.sourceChar ?? c)).join('');
      return s.parsed.text.includes(wanted);
    });
    if (matched) counts.scopedDifference++;
    else { counts.unmatched++; unmatched.push({ index, char, context: chars.slice(Math.max(0, index - 6), index + 7).join('') }); }
  }
  return { counts, unmatched };
}

export function corpusEditionStatus(packs, files, sourceManifest, editionSources) {
  const sources = sourceManifest.filter(s => /^KR1c0009_\d{3}\.txt$/.test(s.file)).map(s => ({ file: s.file, parsed: parseCommentary(files[s.file]) }));
  const documents = Object.entries(packs).flatMap(([pack, docs]) => docs.map(doc => {
    const chars = doc.tokens.filter(t => isHan(t.char)), states = {}, pending = [];
    chars.forEach((token, index) => {
      const { status } = inspectToken(token); states[status] = (states[status] || 0) + 1;
      if (status !== 'ready') pending.push({ index, char: token.char, status, ...(token.sourceReading ? { sourceReading: token.sourceReading } : {}),
        candidates: token.positions || [], context: chars.slice(Math.max(0, index - 6), index + 7).map(t => t.char).join(''),
        ...(doc.provenance.pendingReadings?.find(p => p.index === index) || {}) });
    });
    const review = doc.provenance.editionReview || {};
    return { pack, id: doc.id, title: doc.title, total: chars.length, states,
      sourceMode: pack === 'shijing' ? 'fixed-body-and-commentary-windows' : pack === 'tang' ? 'whole-edition-and-source-romanization' : 'co-located-upstream-text-and-annotation',
      ...(doc.provenance.alignmentError ? { alignmentError: doc.provenance.alignmentError } : {}),
      headwordCorrections: review.notes?.length || 0, confirmedHeadwords: doc.provenance.confirmedHeadwords?.notes?.length || 0, alignmentReviewed: !!doc.provenance.corpusAlignmentReview?.alignment, textChanges: review.textChanges?.length || 0,
      ...(pack === 'shijing' ? { pairing: windowCoverage(chars.map(t => t.char).join(''), sources, shijingVariants.scoped.filter(d => d.title === doc.title)) } : {}),
      ...(review.alternatives?.length ? { alternatives: review.alternatives } : {}), pending };
  }));
  return { version: 1, editedOn: '2026-10-03', indexConvention: '所有 index 均為不含標點的零起始漢字索引。',
    scope: '遍查內建四包全部字位，核對現有固定來源的正文、原音與字庫對應；不宣稱已完成所有傳世版本的人工校勘。',
    rules: { shijingGlyphCorrespondences: shijingVariants.orthography.length, shijingScopedDifferences: shijingVariants.scoped.length, headwordCorrespondences: headwordVariants.rules.length },
    sources: [...sourceManifest, ...editionSources].map(({ file, url, commit, sha256 }) => ({ file, url, commit, sha256 })),
    totals: { documents: documents.length, characters: documents.reduce((n, d) => n + d.total, 0), ready: documents.reduce((n, d) => n + (d.states.ready || 0), 0),
      pending: documents.reduce((n, d) => n + d.pending.length, 0), alignmentFailures: documents.filter(d => d.alignmentError).length,
      headwordCorrections: documents.reduce((n, d) => n + d.headwordCorrections, 0), confirmedHeadwords: documents.reduce((n,d)=>n+d.confirmedHeadwords,0), alignmentReviewed: documents.filter(d=>d.alignmentReviewed).length, changedTexts: documents.filter(d => d.textChanges).length,
      changedTextCharacters: documents.reduce((n, d) => n + d.textChanges, 0) }, documents };
}
