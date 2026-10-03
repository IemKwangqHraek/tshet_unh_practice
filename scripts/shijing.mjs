import TshetUinh from 'tshet-uinh';
import selections from './shijing-selections.json' with { type: 'json' };
import { readingsFor } from '../src/phonology.js';
import lexical from './shijing-lexical.json' with { type: 'json' };
import supplements from './shijing-supplements.json' with { type: 'json' };
import researched from './shijing-researched.json' with { type: 'json' };
import semantic from './shijing-semantic.json' with { type: 'json' };
import confirmedContexts from './shijing-confirmed-contexts.json' with { type: 'json' };
import confirmedMeanings from './shijing-confirmed-meanings.json' with { type: 'json' };
import confirmedGlosses from './shijing-confirmed-glosses.json' with { type: 'json' };
import triageEvidence from './pending-triage-evidence.json' with { type: 'json' };
import editionVariants from './shijing-variants.json' with { type: 'json' };
import { parseRhymeCsv, validateRhymeReference } from './shijing-rhyme-books.mjs';
import { parseCommentary, contextualNotes, initialSoundGloss, normalizeHan } from './shijing-commentary.mjs';

const isHan = char => /\p{Script=Han}/u.test(char);
const hanText = text => [...text].filter(isHan).join('');

// This is a checked two-poem edition, not an automatic reading selector.
function buildPilotDocuments(files, sourceManifest) {
  const sourceFor = file => {
    const source = sourceManifest.find(s => s.file === file);
    if (!source || typeof files[file] !== 'string') throw new Error(`缺少詩經來源：${file}`);
    return source;
  };
  const textSource = sourceFor('rime-shijing.txt');
  return selections.documents.map(edition => {
    const annotationSource = sourceFor(edition.annotationFile);
    const marker = `《${edition.title}》\n`;
    const start = files[textSource.file].indexOf(marker);
    if (start < 0) throw new Error(`找不到詩經正文：${edition.title}`);
    const text = files[textSource.file].slice(start + marker.length).split(/\n\s*\n/)[0].trim();
    // Both fixed transcriptions must agree character by character before tagging.
    const xmlLines = [...files[edition.annotationFile].matchAll(/<l\b[^>]*>([^<]*)<\/l>/g)].map(m => m[1]);
    if (hanText(text) !== edition.expectedHan || hanText(xmlLines.join('')) !== edition.expectedHan) {
      throw new Error(`詩經正文與音義版本不一致：${edition.title}`);
    }
    const readingNotes = edition.selections.map(note => ({ ...note,
      references: note.references.map(reference => {
        if (reference.file) {
          const source = sourceFor(reference.file);
          const input = files[reference.file];
          // Scope XML evidence to its identified block, not a matching quote elsewhere.
          const match = reference.xmlId ? input.match(new RegExp(`<(div|ab)\\b[^>]*xml:id="${reference.xmlId}"[^>]*>([\\s\\S]*?)<\\/\\1>`)) : null;
          if (!(reference.xmlId ? match?.[2] : input)?.includes(reference.quote)) {
            throw new Error(`詩經選讀依據不符：${edition.title} ${note.char}`);
          }
          return { ...reference, url: source.url, commit: source.commit, license: source.license };
        }
        if (!TshetUinh.資料.query字頭(reference.dictionaryChar).some(entry =>
          entry.音韻地位.描述 === reference.position && entry.釋義.includes(reference.quote))) {
          throw new Error(`詩經字義依據不符：${edition.title} ${note.char}`);
        }
        return { ...reference, dictionary: 'tshet-uinh 0.15.4 · 廣韻' };
      })
    }));
    const byChar = new Map(readingNotes.map(note => [note.char, note]));
    const tokens = [...text].map(char => {
      if (!isHan(char)) return { char };
      const positions = readingsFor(char).map(reading => reading.position);
      const note = byChar.get(char);
      if (!positions.length || !note && positions.length !== 1) {
        throw new Error(`詩經字未完成選讀：${edition.title} ${char}`);
      }
      const position = note?.position ?? positions[0];
      if (!positions.includes(position)) throw new Error(`詩經選讀不在字庫：${edition.title} ${char}`);
      return { char, positions, position,
        ...(note ? { audit: [{ action: 'editorial-selection', before: positions, after: position,
          at: selections.editedOn, reason: note.basis, references: note.references }] } : {}) };
    });
    return { id: edition.id, title: edition.title, author: '佚名', category: '詩經',
      source: annotationSource.repository,
      license: '古注轉錄及本次選讀：CC BY-SA 4.0（各來源見選讀依據）；正文為公有領域古典作品（rime-aca 整理倉庫未明示授權）；字庫 MIT',
      tokens, provenance: { annotationCommit: annotationSource.commit, annotationFile: edition.annotationFile,
        method: 'dictionary-single-and-source-reviewed-selection-v1', dictionary: 'tshet-uinh 0.15.4',
        readingSystem: selections.readingSystem, editedOn: selections.editedOn,
        selectionPolicy: '字庫單一地位作基底；多讀逐字按古注及語境選定。本次練習採選定讀音，候選與古注異讀仍保留；不採宋人協韻音。',
        textSources: [textSource.url], textLicenses: [textSource.license],
        annotationSources: [...new Set([annotationSource.url, ...readingNotes.flatMap(note => note.references.flatMap(r => r.url ? [r.url] : []))])],
        sourceEditors: 'Shijing-net：Marie Bizais-Lillig、Ilaine Wang；古注：陸德明；' +
          (readingNotes.some(note => note.references.some(r => r.file === 'shijing-jizhuan.wiki')) ? '補據：朱熹《詩集傳》（維基文庫編者轉錄）；' : '') +
          '本次選讀：切韻練字試點編校（Codex）',
        readingNotes } };
  });
}

export function shijingTexts(input) {
  let section = '';
  const documents = [];
  for (const block of input.split(/\n\s*\n/)) {
    const heading = block.match(/^【(.+)】$/)?.[1];
    if (heading) { section = heading; continue; }
    const match = block.match(/^《(.+)》\n([\s\S]+)$/);
    if (!match) continue;
    documents.push({ title: match[1].startsWith(`${section}・`) ? match[1] : `${section}・${match[1]}`, section, text: match[2].trim() });
  }
  return documents;
}

export function buildShijingDocuments(files, sourceManifest) {
  const textSource = sourceManifest.find(s => s.file === 'rime-shijing.txt');
  const originals = shijingTexts(files[textSource.file]);
  if (originals.length !== 305 || new Set(originals.map(p => p.title)).size !== 305 || originals.reduce((s, p) => s + [...hanText(p.text)].length, 0) !== 29646) throw new Error('詩經正文完整性校驗失敗');
  const pilots = new Map(buildPilotDocuments(files, sourceManifest).map(doc => [doc.title, doc]));
  const sources = sourceManifest.filter(s => /^KR1c0009_\d{3}\.txt$/.test(s.file)).map(s => ({ ...s, parsed: parseCommentary(files[s.file]) }));
  const sourceByFile = new Map(sourceManifest.map(source => [source.file, source]));
  const parsedByFile = new Map(sources.map(source => [source.file, source.parsed]));
  const commentaryFor = file => {
    if (!sourceByFile.has(file)) throw new Error(`缺少古注來源：${file}`);
    if (!parsedByFile.has(file)) parsedByFile.set(file, parseCommentary(files[file]));
    return parsedByFile.get(file);
  };
  const retainedVariants = new Map([
    ...triageEvidence.cases.filter(row => row.historical).map(row => [`${row.id}:${row.index}`, { reason: row.historical.basis, references: row.historical.references }]),
    ...confirmedContexts.deferred.map(row => [`${row.id}:${row.index}`, row]),
    ...confirmedGlosses.deferred.map(row => [`${row.id}:${row.index}`, row]),
  ]);
  for (const retained of retainedVariants.values()) retained.references = retained.references.map(ref => ({ ...ref, ...(sourceByFile.has(ref.file) ? { url: sourceByFile.get(ref.file).url, commit: sourceByFile.get(ref.file).commit } : {}) }));
  for (const variant of editionVariants.orthography) {
    const exampleBody = originals.find(poem => poem.title === variant.example.title);
    const parsed = sources.find(source => source.file === variant.example.file)?.parsed;
    if (!exampleBody || !hanText(exampleBody.text).includes(variant.example.bodyContext) || !variant.example.bodyContext.includes(variant.body) ||
      !variant.example.sourceContext.includes(variant.source) || !parsed?.tokens.some((token, index) => {
      const window = parsed.tokens.slice(index, index + [...variant.example.sourceContext].length);
      return window.some(t => t.page === variant.example.page) && window.map(t => t.char).join('') === variant.example.sourceContext;
    })) {
      throw new Error(`詩經字形對應來源失效：${variant.source}/${variant.body}`);
    }
  }
  const rhymeBooks = new Map(['qieyun-wang3.csv', 'guangyun.csv'].map(file => {
    if (!sourceByFile.has(file) || typeof files[file] !== 'string') throw new Error(`缺少音義對照來源：${file}`);
    return [file, parseRhymeCsv(files[file])];
  }));
  if (sources.length !== 20) throw new Error('缺少詩集傳二十卷');
  for (const difference of editionVariants.scoped) {
    const poem = originals.find(p => p.title === difference.title);
    const chars = poem && [...hanText(poem.text)];
    const parsed = sources.find(s => s.file === difference.file)?.parsed;
    const first = difference.sourceIndex - difference.index + difference.contextStart;
    const tokens = parsed?.tokens.slice(first, first + [...difference.bodyContext].length);
    if (!chars || chars[difference.index] !== difference.bodyChar || chars.slice(difference.contextStart, difference.contextStart + [...difference.bodyContext].length).join('') !== difference.bodyContext ||
      parsed?.tokens[difference.sourceIndex]?.char !== difference.sourceChar || parsed.tokens[difference.sourceIndex].page !== difference.page || tokens.map(t => t.char).join('') !== difference.sourceContext) {
      throw new Error(`詩經異文定位失效：${difference.title} ${difference.index}`);
    }
  }
  const rules = new Map();
  for (const rule of [...lexical.rules, ...supplements.rules, ...researched.rules, ...semantic.rules, ...confirmedContexts.rules, ...confirmedMeanings.rules, ...confirmedGlosses.rules]) {
    if (rule.occurrences && (!rule.occurrences.length || !['source-attested', 'semantic-preference'].includes(rule.selectionKind) || rule.selectionKind === 'source-attested' && !rule.sourceReferences?.length)) throw new Error(`詩經音義證據分類失效：${rule.char}`);
    if (rule.titles?.some(title => !originals.some(poem => poem.title === title))) throw new Error(`詩經詞例篇名失效：${rule.char}`);
    if (!TshetUinh.資料.query字頭(rule.dictionaryChar || rule.char).some(e => e.音韻地位.描述 === rule.position && e.反切 === rule.fanqie && e.釋義.includes(rule.dictionaryQuote))) throw new Error(`詩經字義規則失效：${rule.char}`);
    for (const occurrence of rule.occurrences || []) {
      const poem = originals.find(poem => poem.title === occurrence.title);
      const chars = poem && [...hanText(poem.text)];
      if (!chars || chars[occurrence.index] !== rule.char || chars.slice(Math.max(0, occurrence.index - 6), occurrence.index + 7).join('') !== occurrence.context) throw new Error(`詩經音義詞例失效：${rule.char}`);
    }
    for (const reference of rule.rhymeReferences || []) validateRhymeReference(reference, rhymeBooks.get(reference.file) || []);
    for (const reference of rule.sourceReferences || []) {
      const tokens = commentaryFor(reference.file).tokens;
      if (!tokens.some((token, i) => (reference.sourceIndex == null || reference.sourceIndex === i) && token.page === reference.page && token.comment.includes(reference.quote) && (!reference.lemma || tokens.slice(Math.max(0, i - [...reference.lemma].length + 1), i + 1).map(t => t.char).join('') === reference.lemma))) throw new Error(`詩經補音引文失效：${rule.char}`);
      if (reference.poemHeading && normalizeHan(tokens.slice(reference.poemHeading.sourceIndex, reference.poemHeading.sourceIndex + [...reference.poemHeading.lemma].length).map(t => t.char).join('')) !== reference.poemHeading.lemma) throw new Error(`詩經篇名定位失效：${rule.char}`);
    }
    rules.set(rule.char, [...(rules.get(rule.char) || []), rule]);
  }
  // Word-specific choices take priority over a general lexical default.
  for (const list of rules.values()) list.sort((a, b) => Number(!!b.occurrences) - Number(!!a.occurrences) || Number(!!b.titles) - Number(!!a.titles) || Number(!!b.pattern) - Number(!!a.pattern));
  return originals.map((poem, number) => {
    if (pilots.has(poem.title)) return { ...pilots.get(poem.title), provenance: { ...pilots.get(poem.title).provenance, section: poem.section, sequenceNumber: number + 1 } };
    const chars = [...poem.text].filter(isHan);
    const editionDifferences = editionVariants.scoped.filter(d => d.title === poem.title);
    const evidence = contextualNotes(poem.text, sources, editionDifferences);
    const readingNotes = [], pendingReadings = [], choices = [];
    const usedSources = new Set();
    for (const [index, char] of chars.entries()) {
      const positions = readingsFor(char).map(r => r.position);
      const refs = evidence[index];
      const resolved = refs.filter(r => r.resolved);
      const values = [...new Set(resolved.map(r => r.resolved.position))];
      const hasSound = refs.some(r => initialSoundGloss(r.comment));
      const retained = retainedVariants.get(`shijing-${String(number + 1).padStart(3, '0')}:${index}`);
      const local = chars.slice(Math.max(0, index - 6), index + 7).join('');
      const marked = chars.slice(Math.max(0, index - 6), index).join('') + `~${char}~` + chars.slice(index + 1, index + 7).join('');
      const rule = (rules.get(char) || []).find(rule => (!rule.occurrences || rule.occurrences.some(o => o.title === poem.title && o.index === index)) && (!rule.titles || rule.titles.includes(poem.title)) && (!rule.pattern || new RegExp(rule.pattern).test(marked)) && (!rule.exclude || !new RegExp(rule.exclude).test(local)));
      let position = '', method = '', references = [], basis = '';
      if (retained) { basis = retained.reason; }
      else if (values.length === 1 && resolved.length === refs.filter(r => initialSoundGloss(r.comment)).length) {
        position = values[0]; method = 'source-sound';
        references = resolved.map(r => ({ file: r.file, page: r.page, baseIndex: r.index, char: r.char, context: r.context,
          sourceContext: r.sourceContext, ...(r.differences.length ? { editionDifferences: r.differences } : {}),
          quote: r.comment.split(/○|〇/)[0], url: sources.find(s => s.file === r.file).url, commit: sources.find(s => s.file === r.file).commit }));
        basis = '本篇相鄰至少八字與古注底文唯一音值配對，取首列常音；協韻音不參與推導。';
      } else if (rule) {
        position = rule.position; method = rule.occurrences ? 'semantic-reviewed' : 'lexical-rule'; basis = rule.basis;
        references = [{ dictionaryChar: rule.dictionaryChar || char, position, fanqie: rule.fanqie, quote: rule.dictionaryQuote, dictionary: 'tshet-uinh 0.15.4 · 廣韻' }];
        references.push(...(rule.sourceReferences || []).map(reference => ({ ...reference, url: sourceByFile.get(reference.file).url, commit: sourceByFile.get(reference.file).commit })));
        references.push(...(rule.rhymeReferences || []).map(reference => ({ ...reference, url: sourceByFile.get(reference.file).url, commit: sourceByFile.get(reference.file).commit, license: sourceByFile.get(reference.file).license })));
        references.push(...(rule.externalReferences || []));
      } else if (!hasSound && positions.length === 1) { position = positions[0]; method = 'dictionary-single'; }
      choices.push({ char, positions, position, method, references, basis, hasSound, retained,
        ...(method === 'semantic-reviewed' ? { selectionKind: rule.selectionKind } : method === 'source-sound' ? { selectionKind: 'source-attested' } : {}),
        sourceNotes: refs.map(r => ({ file: r.file, page: r.page, quote: r.comment.split(/○|〇/)[0],
          sourceContext: r.sourceContext, ...(r.differences.length ? { editionDifferences: r.differences } : {}),
          url: sources.find(s => s.file === r.file).url, commit: sources.find(s => s.file === r.file).commit })) });
    }
    // A doubled word shares its explicitly sourced reading, unless evidence conflicts.
    for (let i = 0; i < choices.length; i++) {
      const token = choices[i];
      if (token.position || token.hasSound || token.retained) continue;
      const neighbor = [choices[i - 1], choices[i + 1]].find(t => t?.char === token.char && t.method === 'source-sound');
      if (neighbor && (token.positions.includes(neighbor.position) || !token.positions.length)) Object.assign(token, { position: neighbor.position, method: 'reduplicated-source', selectionKind: 'source-attested', references: neighbor.references, basis: '同一疊字沿用相鄰字的本篇直音或反切。' });
    }
    let hanIndex = 0;
    const tokens = [...poem.text].map(char => {
      if (!isHan(char)) return { char };
      const index = hanIndex++; const choice = choices[index];
      const { positions, position, method, references, basis } = choice;
      if (position && method !== 'dictionary-single') {
        const key = `${char}:${position}:${method}:${JSON.stringify(references)}`;
        let note = readingNotes.find(n => n.key === key);
        if (!note) { note = { key, id: `reading-${readingNotes.length + 1}`, char, position, method, basis, references, indices: [], ...(choice.selectionKind ? { selectionKind: choice.selectionKind } : {}) }; readingNotes.push(note); }
        if (choice.hasSound && ['lexical-rule', 'semantic-reviewed'].includes(method)) {
          note.comparison = '自動音注轉換未能唯一互證，按已列古注或字義規則選讀；原音注保留。';
          note.sourceNotes = [...new Map([...(note.sourceNotes || []), ...choice.sourceNotes].map(ref => [JSON.stringify(ref), ref])).values()];
        }
        note.indices.push(index);
        for (const reference of references) if (reference.file) usedSources.add(reference.file);
        for (const reference of choice.sourceNotes) usedSources.add(reference.file);
        return { char, positions: positions.length ? positions : [position], position, ...(!positions.includes(position) ? { confirmed: true } : {}), audit: [{ action: 'source-selection', before: positions, after: position, at: lexical.editedOn, reason: basis, references: [{ noteId: note.id }] }] };
      }
      if (!position) {
        const reason = choice.retained ? `文獻另讀或音義適用範圍尚待釐清，保留待核：${choice.retained.reason}` : choice.hasSound ? '本篇音注與字庫不能唯一互證，保留候選待校對。' : positions.length ? '字庫多讀，本篇尚無足夠選讀依據。' : '字庫未收，本篇尚無足夠補音依據。';
        pendingReadings.push({ index, char, positions, context: chars.slice(Math.max(0, index - 6), index + 7).join(''), reason, sourceNotes: choice.sourceNotes, ...(choice.retained ? { alternateReadingReferences: choice.retained.references } : {}) });
        for (const reference of choice.sourceNotes) usedSources.add(reference.file);
        return { char, positions, ...(choice.hasSound || choice.retained ? { conversion: 'ambiguous' } : {}) };
      }
      return { char, positions, position };
    });
    readingNotes.forEach(note => delete note.key);
    return { id: `shijing-${String(number + 1).padStart(3, '0')}`, title: poem.title, author: '佚名', category: '詩經', source: textSource.repository,
      license: '古典正文與古注原典公有領域；轉錄來源未明示整理授權；本次選讀 CC BY-SA 4.0；字庫 MIT', tokens,
      provenance: { section: poem.section, sequenceNumber: number + 1, readingSystem: '切韻系讀法', editedOn: lexical.editedOn, dictionary: 'tshet-uinh 0.15.4',
        method: 'shijing-contextual-source-and-edition-v5', annotationCommit: sources[0].commit,
        sourceEditors: '古注：朱熹《詩集傳》、陸德明《經典釋文》；四部叢刊轉錄：漢籍リポジトリ Kanripo；本次選讀：切韻練字編校（Codex）',
        selectionPolicy: '字庫單讀作基底；正文相鄰至少八字核對古注，直音與反切須推出唯一地位；反切異體僅在音注查字時歸一，脣音不以未標開合排除相同韻、聲、等的候選；另按列出的篇句古注及字義規則選讀。音義覆核只適用於列明篇名、字序、語境的詞例，對照固定版王三本與廣韻條目；區分本篇音注選讀及本版語境選讀，後者不表示其他音已被排除。這是切韻系標註初稿，未決多讀與注音衝突保留待校對，異讀原引文與字庫候選保留，不採協韻音。',
        textSources: [textSource.url], annotationSources: [...usedSources].map(file => sourceByFile.get(file).url),
        editionReview: { method: 'reviewed-glyph-and-scoped-edition-v1', differences: editionDifferences.map(d => ({ ...d, url: sourceByFile.get(d.file).url, commit: sourceByFile.get(d.file).commit })) },
        readingNotes, pendingReadings } };
  });
}
