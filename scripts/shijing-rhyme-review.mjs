import { createHash } from 'node:crypto';
import TshetUinh from 'tshet-uinh';
import { isHan } from '../src/polyhedron.js';
import { parseRhymeCsv, validateRhymeReference } from './shijing-rhyme-books.mjs';
import { parseCommentary } from './shijing-commentary.mjs';
import rules from './shijing-rhyme-review.json' with { type: 'json' };

const hash = value => createHash('sha256').update(value).digest('hex');
const rulesSha256 = hash(JSON.stringify(rules));
const normalizeSource = value => value.replace(/<pb:[^>]+>/g, '').replace(/[\s/¶]/g, '');
const byDocument = new Map();
const keys = new Set();
for (const rule of rules.cases) {
  const key = `${rule.id}:${rule.index}`;
  if (keys.has(key)) throw new Error(`重複詩經韻讀覆核字位：${key}`);
  keys.add(key);
  if (!['select', 'retain'].includes(rule.action) || !rule.basis || !rule.references.length) throw new Error(`詩經覆核缺少結論或證據：${key}`);
  if (rule.action === 'select' && !rule.position) throw new Error(`詩經採讀缺少音位：${key}`);
  if (rule.action !== 'select' && rule.position) throw new Error(`保留個案不得暗中採讀：${key}`);
  for (const position of [rule.position, ...(rule.addedPositions || [])].filter(Boolean)) TshetUinh.音韻地位.from描述(position);
  byDocument.set(rule.id, [...(byDocument.get(rule.id) || []), rule]);
}

/** Model output is a comparison, never a substitute for an attested sound gloss. */
export function validateShijingRhymeEvidence(files, reviewRules = rules) {
  const base = JSON.parse(files['pboc-base.json.gz']);
  const extra = JSON.parse(files['pboc-extra.json.gz']);
  if (base.length !== extra.length || base.length !== reviewRules.model.rows) throw new Error('PBOC 兩表行數不符');
  const tables = Object.fromEntries(['qieyun-wang3.csv', 'guangyun.csv'].map(file => [file, parseRhymeCsv(files[file])]));
  const commentaries = new Map();
  for (const rule of reviewRules.cases) {
    for (const fact of rule.pboc || []) {
      if (base[fact.rowIndex]?.z !== fact.char || base[fact.rowIndex]?.y !== fact.oc || extra[fact.rowIndex]?.c !== fact.derivedMc) {
        throw new Error(`PBOC 固定行已變：${rule.id}:${rule.index}:${fact.rowIndex}`);
      }
    }
    for (const ref of rule.references) {
      if (tables[ref.file]) { validateRhymeReference(ref, tables[ref.file]); continue; }
      const text = files[ref.file];
      if (!text || !ref.quote) throw new Error(`詩經覆核缺少固定引文：${rule.id}:${rule.index}`);
      if (ref.kind === 'commentary-gloss') {
        if (!commentaries.has(ref.file)) commentaries.set(ref.file, parseCommentary(text));
        const { tokens } = commentaries.get(ref.file), token = tokens[ref.sourceIndex];
        if (token?.page !== ref.page || !token.comment.includes(ref.quote) ||
          tokens.slice(Math.max(0, ref.sourceIndex - [...ref.lemma].length + 1), ref.sourceIndex + 1).map(t => t.char).join('') !== ref.lemma) {
          throw new Error(`詩經音義注詞頭失效：${rule.id}:${rule.index}:${ref.file}`);
        }
        continue;
      }
      // The fixed transcription occasionally repeats a page label. Check each
      // matching page block, without silently changing the source's pagination.
      const blocks = ref.page ? text.split(`<pb:${ref.page}>`).slice(1).map(s => s.split('<pb:')[0]) : [text];
      if (!blocks.some(block => normalizeSource(block).includes(normalizeSource(ref.quote)))) {
        throw new Error(`詩經覆核引文失效：${rule.id}:${rule.index}:${ref.file}`);
      }
    }
  }
}

export function rewindShijingRhymeReview(document) {
  const review = document.provenance?.rhymeReview;
  if (!review) return document;
  const tokens = document.tokens.slice();
  for (const note of review.notes) tokens[note.tokenIndex] = structuredClone(note.originalToken);
  const provenance = { ...document.provenance, pendingReadings: structuredClone(review.originalPendingReadings) };
  delete provenance.rhymeReview;
  return { ...document, tokens, provenance };
}

export function reviewShijingRhymes(document, id = document.id) {
  const entries = byDocument.get(id);
  if (!entries) return document;
  const previous = document.provenance?.rhymeReview;
  if (previous) {
    if (previous.rulesSha256 !== rulesSha256 || previous.method !== rules.method) throw new Error(`詩經韻讀規則版本過期：${id}`);
    if (hash(document.tokens.map(t => t.char).join('')) !== rules.documents[id].textSha256) throw new Error(`詩經覆核正文已變：${id}`);
    const expected = reviewShijingRhymes(rewindShijingRhymeReview(document), id);
    const han = doc => doc.tokens.filter(t => isHan(t.char));
    const state = t => JSON.stringify([t.char, t.positions || [], t.position || '', t.confirmed === true, t.skip === true, t.audit || [], t.sourceReading || '', t.conversion || null]);
    for (const rule of entries) {
      const actual = han(document)[rule.index], wanted = han(expected)[rule.index];
      if (state(actual) !== state(wanted)) {
        throw new Error(`詩經覆核後讀音已變：${id}:${rule.index}`);
      }
    }
    return document;
  }
  const guard = rules.documents[id];
  if (document.title !== guard.title || hash(document.tokens.map(t => t.char).join('')) !== guard.textSha256) throw new Error(`詩經覆核正文已變：${id}`);
  const tokens = document.tokens.slice();
  const hanIndexes = tokens.flatMap((t, i) => isHan(t.char) ? [i] : []);
  const chars = hanIndexes.map(i => tokens[i].char);
  const pending = document.provenance.pendingReadings;
  const notes = [];
  for (const rule of entries) {
    const tokenIndex = hanIndexes[rule.index], originalToken = tokens[tokenIndex];
    const pendingNote = pending.find(note => note.index === rule.index);
    if (!pendingNote || originalToken.position || originalToken.char !== rule.char ||
      chars.slice(Math.max(0, rule.index - 6), rule.index + 7).join('') !== rule.context ||
      JSON.stringify(originalToken.positions || []) !== JSON.stringify(rule.sourcePositions)) throw new Error(`詩經覆核原字或候選已變：${id}:${rule.index}`);
    if (rule.action === 'select' && pendingNote.alternateReadingReferences?.length) throw new Error(`詩經明列異讀不得强定：${id}:${rule.index}`);
    if (rule.rhyme && (!rule.rhyme.lines.length || !chars.join('').includes(rule.rhyme.lines.join('').replace(/[^\p{Script=Han}]/gu, '')))) throw new Error(`詩經韻章正文不符：${id}:${rule.index}`);
    for (const foot of rule.rhyme?.feet || []) if (chars[foot.index] !== foot.char) throw new Error(`詩經韻腳字位不符：${id}:${foot.index}`);
    const noteId = `rhyme-review-${id}-${rule.index}`;
    const positions = [...new Set([...(originalToken.positions || []), ...(rule.addedPositions || [])])];
    const changed = rule.action === 'select' || rule.addedPositions?.length;
    tokens[tokenIndex] = changed ? { ...originalToken, positions,
      ...(rule.action === 'select' ? { position: rule.position, confirmed: true } : {}),
      audit: [...(originalToken.audit || []), { action: rule.action === 'select' ? 'rhyme-philology-selection' : 'attested-candidate-addition', at: rules.editedOn,
        before: { positions: originalToken.positions || [], position: originalToken.position || '', confirmed: originalToken.confirmed === true },
        after: { positions, ...(rule.position ? { position: rule.position } : {}) }, reason: rule.basis, references: [{ noteId }] }] } : originalToken;
    notes.push({ ...rule, id: noteId, documentId: id, tokenIndex, originalToken: structuredClone(originalToken) });
  }
  const selected = new Set(entries.filter(r => r.action === 'select').map(r => r.index));
  return { ...document, tokens, provenance: { ...document.provenance,
    pendingReadings: pending.filter(note => !selected.has(note.index)).map(note => {
      const reviewed = notes.find(n => n.index === note.index);
      return reviewed ? { ...note, positions: tokens[reviewed.tokenIndex].positions, rhymeReviewNoteId: reviewed.id } : note;
    }),
    rhymeReview: { method: rules.method, editedOn: rules.editedOn, rulesSha256, model: rules.model,
      policy: rules.policy, originalPendingReadings: structuredClone(pending), notes } } };
}

export function shijingRhymeReport(documents) {
  const notes = documents.flatMap(doc => (doc.provenance.rhymeReview?.notes || []).map(({ originalToken, tokenIndex, ...note }) => ({ ...note, title: doc.title })));
  return { version: 1, editedOn: rules.editedOn, method: rules.method, rulesSha256, model: rules.model, policy: rules.policy,
    counts: { reviewed: notes.length, selected: notes.filter(n => n.action === 'select').length,
      retained: notes.filter(n => n.action === 'retain').length, candidatesExpanded: notes.filter(n => n.addedPositions?.length).length }, notes };
}
