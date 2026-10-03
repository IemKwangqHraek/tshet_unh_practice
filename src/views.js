import { escapeHTML as e, documentStatus, inspectToken, suggestions, hasReadingAlternatives } from './corpus.js';
import { allKeyParts, keyCandidates, definitionsFor, derive } from './phonology.js';
import { sessionStats } from './session.js';
import { filterCatalogue, cataloguePageSize, catalogueEntries } from './catalogue.js';
import { getCatalogueSourceId } from './corpus-update.js';
import shijingDownloads from '../public/corpora/shijing-downloads.json' with { type: 'json' };

export function definitionPanel(reading) {
  const entries = definitionsFor(reading.char, reading.position);
  return `<section class="panel rail-panel"><div class="rail-title">${icon('book')}當前字的釋義</div>${entries.length ? entries.map(entry => `<div class="dictionary-entry"><div class="position-label">${e(entry.source)} · ${e(entry.rhyme)}韻 · 小韻 ${e(entry.group)}</div>${entry.fanqie ? `<div class="small-muted">反切：${e(entry.fanqie)}</div>` : ''}<p class="dictionary-gloss">${e(entry.text || '此條目未錄釋義')}</p></div>`).join('') : '<p class="small-muted">字庫未收此字當前讀音的釋義。</p>'}<p class="small-muted">按當前選讀顯示韻書原文。</p></section>`;
}

export const modeNames = {
  qwerty: 'QWERTY', 'full-highlight': '全信息 · 有高亮', 'full-plain': '全信息 · 無高亮',
  'current-highlight': '當前 Key · 有高亮', 'current-plain': '當前 Key · 無高亮'
};
export const labels = { ready: '已確認', missing: '缺失標註', multiple: '選讀待確認', absent: '字典未收', invalid: '標註無效', skipped: '已跳過' };
export const icons = {
  keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.1m4 0h.1m4 0h.1m4 0h.1M6 12h.1m4 0h.1m4 0h.1m4 0h.1M7 16h10"/>',
  book: '<path d="M3 4h6a4 4 0 0 1 3 1 4 4 0 0 1 3-1h6v15h-6a4 4 0 0 0-3 1 4 4 0 0 0-3-1H3zM12 5v15"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',
  check: '<path d="m5 12 4 4L19 6"/>', pause: '<path d="M8 5v14M16 5v14"/>',
  sliders: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.5"/><circle cx="15" cy="17" r="2.5"/>',
  chart: '<path d="M4 3v17h17M8 15l4-5 4 2 5-7"/>',
  list: '<path d="M4 6h.1m4 0h12M4 12h.1m4 0h12M4 18h.1m4 0h12"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>', repeat: '<path d="M3 11a9 9 0 0 1 15-7l3 3M21 3v4h-4M21 13A9 9 0 0 1 6 20l-3-3M3 21v-4h4"/>',
  file: '<path d="M14 2H5a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8zM14 2v6h6M8 13h8M8 17h6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>'
};
export const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.info}</svg>`;
export const button = (label, action, kind = '', glyph = '', extra = '') => `<button type="button" class="btn ${kind}" data-action="${action}" ${extra}>${glyph ? icon(glyph) : ''}${label}</button>`;
export const heading = (title, subtitle, actions = '') => `<div class="heading"><div><h1>${title}</h1><p>${subtitle}</p></div><div class="actions">${actions}</div></div>`;
export const formatTime = ms => `${Math.floor(ms / 60000).toString().padStart(2, '0')}:${Math.floor(ms / 1000 % 60).toString().padStart(2, '0')}`;
export const option = (value, label, selected) => `<option value="${e(value)}" ${value === selected ? 'selected' : ''}>${e(label)}</option>`;

function catalogueUpdateButton(doc) {
  return catalogueEntries.some(entry => entry.id === getCatalogueSourceId(doc))
    ? button('取得新版副本', 'update-catalogue-copy', '', 'repeat', `data-id="${e(doc.id)}" title="另存內建語料的最新版本，保留目前副本與人工校對"`) : '';
}

function provenanceView(doc) {
  const p=doc.provenance;
  if(!p) return '';
  const notes=Array.isArray(p.readingNotes)?p.readingNotes:[];
  const pending=Array.isArray(p.pendingReadings)?p.pendingReadings:[];
  const referenceHTML=reference=>`<p class="small-muted">${reference.book?`${e(reference.book)} · 條目 ${e(reference.entryId)} · ${e(reference.position)} · `:''}${e(reference.page || reference.fanqie || '')} · ${e(reference.displayQuote || reference.quote)}${reference.url?` · <a href="${e(reference.url)}" target="_blank" rel="noopener noreferrer">原文</a>`:''}${reference.editionDifferences?.length?`<br>正文／注本：${reference.editionDifferences.map(d=>`${e(d.bodyChar)}／${e(d.sourceChar)}（第 ${d.index+1} 字）`).join('、')}`:''}</p>`;
  const review=p.editionReview;
  const alignment=p.corpusAlignmentReview;
  const tangSourceReview=p.tangSourceReadings?.notes?.length?`<details><summary>polyhedron 原注與選讀校訂 · ${p.tangSourceReadings.notes.length} 處</summary><p class="small-muted">${e(p.tangSourceReadings.textPolicy || '')}</p>${p.tangSourceReadings.notes.map(note=>`<p>第 ${note.index+1} 字：${e(note.char)}${note.targetChar!==note.char?` → ${e(note.targetChar)}`:''} · ${e(note.position)}<br>${e(note.basis)}</p>${(note.references || []).map(readingReference).join('')}`).join('')}</details>`:'';
  const alignmentReview=alignment?`<details><summary>原注配對校訂</summary>${alignment.alignment?`<p>${e(alignment.alignment.basis)}</p><p class="small-muted">保留缺音字位：${alignment.alignment.unpairedTextIndexes.map(i=>i+1).join('、')||'無'}；未配入正文的原音：${alignment.alignment.unpairedSourceIndexes.length} 處。</p>`:''}${[...alignment.formats,...alignment.orders].map(n=>`<p>第 ${n.index+1} 字 ${e(n.char)}：${e(n.originalSourceReading)} → ${e(n.interpretedSourceReading)}<br>${e(n.basis||n.reason||'')} · ${e(n.position)}</p>`).join('')}</details>`:'';
  const confirmedHeadwords=p.confirmedHeadwords?.notes?.length?`<details><summary>本句音義核定 · ${p.confirmedHeadwords.notes.length} 處</summary>${p.confirmedHeadwords.notes.map(n=>`<p>第 ${n.index+1} 字 ${e(n.char)}／${e(n.dictionaryChar)} · ${e(n.position)}<br>${e(n.basis)}</p>${n.references.map(referenceHTML).join('')}`).join('')}</details>`:'';
  const editionReview=review?`${review.textChanges?.length?`<details><summary>正文版本校對 · ${review.textChanges.length} 處</summary><p>${e(review.textBasis || '')}</p>${review.textChanges.map(d=>`<p class="small-muted">第 ${d.index+1} 字：${e(d.before)} → ${e(d.after)} · ${e(d.context)}</p>`).join('')}</details>`:''}${review.differences?.length?`<details><summary>正文與注本用字差異 · ${review.differences.length} 處</summary>${review.differences.map(d=>`<p>第 ${d.index+1} 字：正文 ${e(d.bodyChar)}／注本 ${e(d.sourceChar)}<br><span class="small-muted">${e(d.bodyContext)}<br>${e(d.sourceContext)} · ${e(d.page)}${d.url?` · <a href="${e(d.url)}" target="_blank" rel="noopener noreferrer">原文</a>`:''}</span></p>`).join('')}</details>`:''}${review.alternatives?.some(a=>a.differences.length)?`<details><summary>其他版本用字</summary><p>列出完整版本的用字差異；原注音尚不相容的字位繼續待核。</p>${review.alternatives.filter(a=>a.differences.length).map(a=>`<p><a href="${e(a.source)}" target="_blank" rel="noopener noreferrer">${e(a.title)}</a><br><span class="small-muted">${a.differences.map(d=>`第 ${d.index+1} 字：本版 ${e(d.selected)}／此本 ${e(d.alternate)}`).join('；')}</span>${a.introducesSourceConflicts?.length?`<br><span class="small-muted">此本在第 ${a.introducesSourceConflicts.map(i=>i+1).join('、')} 字另與原注音不合。</span>`:''}</p>`).join('')}</details>`:''}${review.notes?.length?`<details><summary>字庫用字核對 · ${review.notes.length} 處</summary>${review.notes.map(n=>`<p>第 ${n.index+1} 字：${e(n.char)}／${e(n.dictionaryChar)} · ${e(n.position)}<br>${e(n.basis)}</p>${n.references.map(referenceHTML).join('')}`).join('')}</details>`:''}`:'';
  const edition=p.readingSystem?`<p class="small-muted">${e(p.readingSystem)} · ${e(p.editedOn || '')}${p.section?` · ${e(p.section)}`:''}</p><p class="small-muted">${e(p.sourceEditors || '')}</p><p>${e(p.selectionPolicy || '')}</p>${notes.length?`<details><summary>本篇選讀依據 · ${notes.length} 項</summary><div class="table-scroll"><table><thead><tr><th>字 / 位置</th><th>選定地位</th><th>依據及異讀</th></tr></thead><tbody>${notes.map(note=>`<tr><td>${e(note.char)}${note.indices?`<p class="small-muted">第 ${note.indices.map(index=>index+1).join('、')} 字</p>`:''}</td><td>${e(note.position)}</td><td>${e(note.basis)}${(note.references || []).map(referenceHTML).join('')}${note.comparison?`<p>${e(note.comparison)}</p>${(note.sourceNotes || []).map(referenceHTML).join('')}`:''}</td></tr>`).join('')}</tbody></table></div></details>`:''}${pending.length?`<details><summary>本篇待校對依據 · ${pending.length} 處</summary><div class="table-scroll"><table><thead><tr><th>字 / 位置</th><th>上下文</th><th>待核事項</th></tr></thead><tbody>${pending.map(note=>`<tr><td>${e(note.char)} · 第 ${note.index+1} 字</td><td>${e(note.context)}</td><td>${e(note.reason)}${(note.sourceNotes || []).map(referenceHTML).join('')}${(note.alternateReadingReferences || []).map(referenceHTML).join('')}</td></tr>`).join('')}</tbody></table></div></details>`:''}`:'';
  return `<div class="corpus-provenance"><p class="small-muted">${p.annotator?`原注音：${e(p.annotator)} · `:''}來源版本：${e(p.annotationCommit || '')}</p>${edition}${editionReview}${alignmentReview}${confirmedHeadwords}${tangSourceReview}${p.alignmentError?`<p class="error-text">${e(p.alignmentError)}</p>`:''}${p.originalRomanization?`<details><summary>原始 polyhedron 拼音</summary><pre>${e(p.originalRomanization)}</pre></details>`:''}${p.excludedPrefaceRomanization?`<details><summary>尚未配對的序文拼音</summary><pre>${e(p.excludedPrefaceRomanization)}</pre></details>`:''}<p class="small-muted">${Array.isArray(p.textSources)?`正文來源：${p.textSources.map(url=>e(url)).join('<br>')}`:''}</p>${Array.isArray(p.annotationSources)?`<p class="small-muted">音義來源：${p.annotationSources.map(url=>e(url)).join('<br>')}</p>`:''}</div>`;
}

export function keyboard(mode, reading, stage, prefix = '', interactive = true, additional = []) {
  const current = mode.startsWith('current');
  const highlight = mode.endsWith('highlight');
  const basic = mode === 'qwerty';
  const parts = current ? [keyCandidates(stage, prefix, additional)] : [0, 1, 2].map(allKeyParts);
  const target = reading?.triple[stage];
  return `<div class="keyboard" data-mode="${e(mode)}" aria-label="${e(modeNames[mode])}">${['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map((letters, row) => `<div class="keyboard-row row${row + 1}">${[...letters].map(key => {
    const active = highlight && key === target;
    const unused = current && !parts[0][key].length;
    const fragments = basic ? '' : `<span class="key-parts">${parts.map((map, slot) => `<span class="key-part">${(map[key].length ? map[key] : ['—']).map((fragment, n) => `${n ? '<span class="slash">/</span>' : ''}<span class="${active && (current || slot === stage) && fragment === reading?.parts[stage] ? 'correct-part' : ''}">${e(fragment || '∅')}</span>`).join('')}</span>`).join('')}</span>`;
    return `<${interactive ? 'button type="button"' : 'div'} class="key ${current ? 'current-mode' : ''} ${basic ? 'qwerty' : ''} ${unused ? 'unused' : ''} ${active ? 'highlighted' : ''}" ${interactive ? `data-action="key" data-key="${key}" aria-label="${key} 鍵"` : ''}><span class="key-letter">${key}</span>${fragments}</${interactive ? 'button' : 'div'}>`;
  }).join('')}</div>`).join('')}</div><div class="keyboard-bottom">${interactive ? button('Space', 'key', 'utility-key space', '', 'data-key=" " aria-label="空格確認音節"') + button('⌫', 'key', 'utility-key', '', 'data-key="Backspace" aria-label="退格修正"') : '<span class="utility-key space">Space</span><span class="utility-key">⌫</span>'}</div>`;
}

export function libraryView(documents, selectedId, entries = [], filter = {}) {
  return heading('語料', '從內建語料庫按篇加入，或導入自己的標註文本。', '<a class="btn primary" href="#import">'+icon('upload')+'導入語料</a>') + catalogueView(entries, documents, filter) + `<h2 class="library-section-title">我的語料 · ${documents.length} 篇</h2><div class="library-grid">${documents.map(doc => {
    const stats = documentStatus(doc);
    return `<section class="panel library-card"><div class="library-card-head"><h2>${e(doc.title)}</h2><span class="tag ${stats.pending ? 'amber' : 'green'}">${stats.pending ? `待校對 ${stats.pending}` : '可練習'}</span></div><p class="author">${e(doc.author || '自選語料')} · ${stats.total} 字</p><p class="library-excerpt">${e(doc.tokens.map(t => t.char).join('').slice(0, 90))}</p><div class="library-actions">${button(stats.pending ? '校對讀音' : '開始練習', stats.pending ? 'review-doc' : 'practice-doc', 'primary', '', `data-id="${e(doc.id)}"`)}${button('多音字', 'review-doc', '', '', `data-id="${e(doc.id)}" data-filter="polyphonic"`)}${catalogueUpdateButton(doc)}${button('匯出', 'export-doc', '', '', `data-id="${e(doc.id)}"`)}<button class="text-link" data-action="remove-doc" data-id="${e(doc.id)}">移除</button></div>${doc.id === selectedId ? '<span class="selected-document">目前語料</span>' : ''}</section>`;
  }).join('')}</div><p class="small-muted">語料與成績保存在此瀏覽器。移除的語料可在本次操作後撤銷；建議定期匯出備份。</p>`;
}

export function catalogueView(entries, documents, filter = {}) {
  if (!entries.length) return '';
  const matches = filterCatalogue(entries, filter);
  const pages = Math.max(1, Math.ceil(matches.length / cataloguePageSize));
  const page = Math.min(filter.page || 0, pages - 1);
  const rows = matches.slice(page * cataloguePageSize, (page + 1) * cataloguePageSize);
  const categories = [...new Set(entries.map(e => e.category))];
  const shijing=entries.filter(entry=>entry.category==='詩經');
  const downloadLinks=filter.category==='詩經'?`<details><summary>《詩經》標註初稿 · ${shijing.length} 篇 · ${shijing.filter(entry=>!entry.pending).length} 篇可練習 · 分部下載 JSON</summary><p class="small-muted">未決讀音保留候選和古注，加入後可在「語料資料」查看。下載文件均可直接導入，保存候選及選讀依據。</p><p>${shijingDownloads.downloads.map(pack=>`<a class="btn" href="${e((import.meta.env?.BASE_URL || '/')+pack.url)}" download>${e(pack.label || pack.section)} · ${pack.documents} 篇</a>`).join(' ')}</p></details>`:'';

  return `<section class="panel catalogue-panel"><div class="panel-title"><h2>內建語料庫</h2><span class="tag">${entries.length} 篇 · ${entries.filter(e=>!e.pending).length} 篇可直接練習</span></div><p class="small-muted">polyhedron《唐詩三百首》《論語》、逐字標註宋詞及《詩經》全書 305 篇的切韻系標註初稿。選讀依據與原始拼音隨語料匯出；待校對條目另有標記。</p>${downloadLinks}<form id="catalogue-filter" class="catalogue-filter"><label>搜尋標題、作者、正文<input name="query" value="${e(filter.query || '')}" placeholder="例如 李白、青玉案、樂府"></label><label>類別<select name="category">${option('', '全部類別', filter.category || '')}${categories.map(c=>option(c,c,filter.category)).join('')}</select></label><label>讀音狀態<select name="status">${[['ready','可直接練習'],['all','全部'],['pending','待校對']].map(([k,v])=>option(k,v,filter.status || 'ready')).join('')}</select></label><button class="btn soft" type="submit">搜尋</button></form><div class="catalogue-grid">${rows.map(entry=>{
    const added = documents.some(d=>d.id===entry.id);
    return `<article class="catalogue-card"><div class="library-card-head"><h3>${e(entry.title)}</h3><span class="tag ${entry.pending?'amber':'green'}">${entry.pending?`待校對 ${entry.pending}`:'可練習'}</span></div><p class="author">${e(entry.author || '佚名')} · ${e(entry.category)} · ${entry.total} 字</p><p class="library-excerpt">${e(entry.excerpt)}</p>${button(added?'打開':entry.pending?'加入並校對':'加入並練習','add-catalogue','soft','',`data-id="${e(entry.id)}"`)}</article>`;
  }).join('') || '<p class="small-muted">沒有符合條件的語料。</p>'}</div><div class="review-bottom"><span class="small-muted">符合 ${matches.length} 篇 · 按篇加入本機語料</span><div class="pagination">${button('上一頁','catalogue-page','','','data-direction="-1" '+(page===0?'disabled':''))}<span>${page+1} / ${pages}</span>${button('下一頁','catalogue-page','','','data-direction="1" '+(page+1>=pages?'disabled':''))}</div></div></section>`;
}

export function practiceView(doc, session, settings, documents) {
  const reading = session?.tokens[session.cursor];
  const stats = session ? sessionStats(session, Date.now()) : null;
  const variant = settings.variant;
  const stage = variant === 'three' ? Math.min((session?.buffer.length ?? 0) - (session?.wrong ? 1 : 0), 2) : 0;
  const selection = `<label class="article-selector">語料<select id="article-select">${documents.map(d => option(d.id, d.title + (documentStatus(d).pending ? ' · 待校對' : ''), doc?.id)).join('')}</select></label>`;
  const actions = `<div class="segmented"><a href="#practice/full" class="${variant === 'full' ? 'selected' : ''}">全拼</a><a href="#practice/three" class="${variant === 'three' ? 'selected' : ''}">三拼</a></div>${session ? button(session.paused ? '繼續' : '暫停', 'pause', '', session.paused ? 'arrow' : 'pause') + button('重新練習', 'restart', '', 'repeat') : ''}`;
  if (!doc) return heading('練習', '先導入或選擇一篇語料。') + '<a class="btn primary" href="#import">導入語料</a>';
  if (!session || !reading) {
    const status = documentStatus(doc);
    return heading(variant === 'three' ? '三拼練習' : '全拼練習', '此語料需要先確認讀音。', actions) + selection + `<section class="panel empty-state"><h2>${e(doc.title)}</h2><p>${status.pending ? `尚有 ${status.pending} 處讀音待處理。` : '此語料沒有可練習的字。'}</p>${button('校對讀音', 'review-doc', 'primary', '', `data-id="${e(doc.id)}"`)}</section>`;
  }
  const steps = [0, 1, 2].map(i => `<div class="step ${i < session.buffer.length && !(session.wrong && i === session.buffer.length - 1) ? 'complete' : i === stage ? 'active' : 'pending'}"><span class="step-name">K${i + 1}</span><b class="${session.wrong && i === session.buffer.length - 1 ? 'wrong-letter' : ''}">${e(session.buffer[i] || '_')}</b>${settings.showParts ? `<span class="part">${e(reading.parts[i] || '∅')}</span>` : ''}</div>`).join('<span class="step-arrow">›</span>');
  const currentSource = reading.sourceIndex;
  const article = doc.tokens.map((token, index) => {
    const status = inspectToken(token).status;
    return `<span class="${index === currentSource ? 'current' : status === 'punctuation' ? 'punct' : status === 'skipped' ? 'skipped-char' : index < currentSource ? 'done' : 'future'}" ${index === currentSource ? 'aria-current="true"' : ''}>${e(token.char)}</span>`;
  }).join('');
  const hint = session.wrong ? '錯鍵已保留，請按 Backspace 退格後重試。' : session.paused ? '已暫停，按「繼續」或 Esc 恢復練習。' : variant === 'full' && session.buffer === reading.full ? '音節完整，按 Space 確認。' : variant === 'three' ? `輸入第 ${stage + 1} 鍵 · 大寫為鍵名，無需按 Shift` : '輸入完整全拼後，按 Space 確認音節。';
  return heading(variant === 'three' ? '三拼練習' : '全拼練習', '按原文選讀練習 · 標點自動跳過', actions) + selection + `<div class="session-bar"><span><strong id="metric-speed">${stats.speed}</strong> 字 / 分</span><span><strong id="metric-accuracy">${stats.accuracy.toFixed(1)}%</strong> 正確率</span><span><strong id="metric-time">${formatTime(stats.milliseconds)}</strong> 用時</span><div class="progress-track"><i style="width:${stats.completed / stats.total * 100}%"></i></div><span class="session-count">${stats.completed} / ${stats.total} 字</span></div><div class="practice-layout"><div class="practice-main"><section class="panel article"><div class="article-head"><div><h2>${e(doc.title)}</h2><div class="author">${e(doc.author)}</div></div><span class="tag green">已校對語料</span></div><div class="poem live-poem">${article}</div><div class="article-foot"><span>${e(doc.source || '自選語料')}</span>${button('校對讀音', 'review-doc', '', '', `data-id="${e(doc.id)}"`)}</div></section><section class="panel current-input ${session.wrong ? 'input-error' : ''}"><div class="character-tile">${e(reading.char)}</div><div class="input-content"><label class="input-label" for="typing">${variant === 'three' ? `當前輸入 · K${stage + 1}` : '當前輸入 · 全拼'}</label>${variant === 'three' ? `<div class="steps">${steps}</div>` : `<div class="live-spelling ${session.wrong ? 'wrong-letter' : ''}">${e(session.buffer)}<span class="typing-caret">▏</span></div>`}<input id="typing" class="typing-control" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="text" aria-label="練習輸入，請使用英文鍵盤" placeholder="點此後逐鍵輸入，或點下方鍵帽" ${session.paused ? 'disabled' : ''}><p class="input-note ${session.wrong ? 'error-text' : ''}" role="status">${hint}</p></div></section><section class="panel keyboard-panel"><div class="panel-title"><h3>鍵盤提示</h3><span class="tag">${variant === 'full' ? 'QWERTY' : e(modeNames[settings.keyMode])}</span></div>${variant === 'three' ? `<div class="keyboard-meta"><span class="slot">K${stage + 1}</span><span>${settings.keyMode.startsWith('current') ? '依已輸入前綴篩選合法候選' : settings.keyMode === 'qwerty' ? '物理鍵名' : '每鍵由上至下：K1 / K2 / K3'}</span></div>` : ''}${keyboard(variant === 'full' ? 'qwerty' : settings.keyMode, reading, stage, session.wrong ? session.buffer.slice(0, -1) : session.buffer, true, session.tokens)}<div class="keyboard-hint">Backspace 退格重試 · Esc 暫停${variant === 'full' ? ' · Space 確認音節' : ' · 三鍵後確認'}</div></section></div><aside class="rail"><section class="panel rail-panel"><div class="rail-title">${icon('info')}當前字的讀音</div>${settings.showPosition ? `<div class="position-label">音韻地位</div><div class="position-value">${e(reading.position)}</div><div class="position-table"><div><span>聲母</span>${e(reading.initial)}</div><div><span>等呼</span>${e(reading.division)} · ${e(reading.openness)}</div><div><span>聲調</span>${e(reading.tone)}</div></div>` : '<p class="small-muted">音韻地位提示已關閉</p>'}${settings.showFull ? `<div class="position-label">全拼</div><div class="reading-full">${e(reading.full)}</div>` : ''}${settings.showParts && variant === 'three' ? `<div class="reading-parts">${reading.parts.map(p => e(p || '∅')).join(' / ')}</div>` : ''}${!settings.showPosition && !settings.showFull && !settings.showParts ? '<p>根據原文字回憶讀音與鍵位。</p>' : ''}</section>${definitionPanel(reading)}<section class="panel rail-panel"><div class="rail-title">${icon('sliders')}練習輔助</div>${['showPosition', 'showFull', ...(variant === 'three' ? ['showParts'] : [])].map((key, i) => `<label class="settings-row"><span>${['顯示音韻地位', '顯示全拼答案', '顯示三段拆分'][i]}</span><input type="checkbox" data-setting="${key}" ${settings[key] ? 'checked' : ''} role="switch"></label>`).join('')}${variant === 'three' ? `<label class="mode-select-label" for="key-mode">鍵帽模式</label><select id="key-mode">${Object.entries(modeNames).map(([k, label]) => option(k, label, settings.keyMode)).join('')}</select><a class="text-link" href="#modes">查看五種模式對照 →</a>` : ''}</section><section class="panel rail-panel"><div class="rail-title">${icon('book')}語料資料</div><p class="small-muted">${e(doc.license || '未填寫許可資訊')}</p>${button('匯出語料', 'export-doc', 'wide', 'file', `data-id="${e(doc.id)}"`)}</section><p class="aside-note">提示可獨立關閉。成績會保存當次使用的提示設定。請切換至英文鍵盤逐鍵輸入。</p></aside></div>`;
}

export function importView(draft, preview) {
  return heading('導入語料', '保留原文與逐字選讀；全拼和三拼共用一份語料。') + `<div class="flow"><span class="flow-item active"><b>1</b>選擇語料</span><i></i><span class="flow-item"><b>2</b>校對讀音</span><i></i><span class="flow-item"><b>3</b>開始練習</span></div><div class="import-layout"><div class="import-main"><form id="import-form" class="panel"><div class="import-section-head"><h2>手動導入</h2><span class="tag">文件留在本機</span></div><div class="upload" id="drop-zone">${icon('upload')}<h3>選擇或拖入標註文本</h3><p>UTF-8 · TXT / TSV / JSON · 單次 2 MB</p><input id="file-input" type="file" accept=".txt,.tsv,.json,text/plain,application/json" aria-label="選擇標註文件">${draft.filename ? `<small>${e(draft.filename)}</small>` : ''}</div><div class="import-fields"><label>導入格式<select name="format">${['auto', 'txt', 'tsv', 'json', 'polyhedron'].map(k => option(k, {auto:'自動識別',txt:'字(音韻地位) TXT',tsv:'逐字 TSV',json:'JSON',polyhedron:'polyhedron 原文／拼音行'}[k], draft.format)).join('')}</select></label><label>默認標題<input name="title" value="${e(draft.title)}" placeholder="未標題的文本使用此名稱"></label><label>作者<input name="author" value="${e(draft.author)}"></label><label>語料來源<input name="source" value="${e(draft.source)}" placeholder="來源名稱或網址"></label><label>許可資訊<input name="license" value="${e(draft.license)}" placeholder="例如 CC0-1.0"></label><label class="check-label"><input name="split" type="checkbox" ${draft.split ? 'checked' : ''}>TXT 空行分篇</label><label class="span-all">標註文本<textarea name="text" rows="8" spellcheck="false" required placeholder="春(昌合三真平)眠(明四先平)……">${e(draft.text)}</textarea></label><div class="span-all import-submit"><button class="btn primary" type="submit">識別並預覽 ${icon('arrow')}</button>${button('載入春曉範例', 'sample-import')}${button('載入校對範例', 'review-example')}</div></div></form>${preview.length ? `<section class="panel preview-panel"><div class="panel-title"><h2>識別結果</h2><span class="tag green">${preview.length} 篇</span></div>${preview.map(doc => {const s=documentStatus(doc);return `<div class="import-preview-item"><h3>${e(doc.title)}</h3><p>${s.total} 字 · 已確認 ${s.ready} · 待處理 ${s.pending}</p><div class="small-muted">${e(doc.tokens.map(t=>t.char).join('').slice(0,110))}</div></div>`;}).join('')}${button('保存並校對讀音', 'save-import', 'primary', 'check')}</section>` : ''}</div><aside class="rail"><section class="panel source-list"><h3>語料來源</h3><div class="source-card"><strong>逐字音韻地位語料</strong><p>可直接導入原始標註文本，標題與作者會從首行識別。</p><a class="source-link" href="https://github.com/nk2028/tshet-uinh-text-label" target="_blank" rel="noreferrer">nk2028/tshet-uinh-text-label ↗</a><p>CC0-1.0</p></div><div class="source-card"><strong>polyhedron · 中古漢語文本</strong><p>可直接導入《論語》的原文／拼音行，轉換成音韻地位。《唐詩三百首》已在內建語料庫配對原文；字數缺漏和多讀保留待校對。CC BY-NC-SA 3.0 · polyhedron。</p><a class="source-link" href="https://github.com/biopolyhedron/middle-chinese-text-label" target="_blank" rel="noreferrer">middle-chinese-text-label ↗</a></div></section><section class="panel format-example"><h3>標註格式</h3><code>韻(云合三C文去)<br>聞(明三C文平|明三C文去)</code><p>多讀用 | 分隔。缺失、無效、多讀及字典未收的讀音會交由人工校對。標點與換行按原文保留。</p><div class="download-examples"><a href="./example.txt" download>TXT 範例 ↓</a><a href="./example.tsv" download>TSV 範例 ↓</a>${button('下載 JSON 範例', 'json-example')}</div></section></aside></div>`;
}

export const reviewFilters = { pending: '待處理', polyphonic: '多音字', ready: '已確認', all: '所有' };

// Token indices drive edits; Han indices address the source notes, which exclude punctuation.
export function reviewEntries(doc, filter = 'all', query = '') {
  let hanIndex = -1;
  return doc.tokens.flatMap((token, index) => {
    const info = inspectToken(token);
    if (info.status === 'punctuation') return [];
    hanIndex++;
    const alternatives = hasReadingAlternatives(token);
    if (filter === 'pending' && ['ready', 'skipped'].includes(info.status)
      || filter === 'ready' && info.status !== 'ready'
      || filter === 'polyphonic' && !alternatives) return [];
    const candidates = suggestions(token);
    let current = info.reading;
    if (token.position) {
      try { current = derive(token.position, token.char); } catch { /* The invalid annotation is displayed below. */ }
    }
    const noteIds = new Set((token.audit || []).flatMap(a => (a.references || []).map(r => r.noteId)).filter(Boolean));
    const belongs = note => note.index === hanIndex || note.indices?.includes(hanIndex) || noteIds.has(note.id);
    const p = doc.provenance || {};
    const rhymeNote = p.rhymeReview?.notes.find(belongs);
    const originalPositions = rhymeNote?.sourcePositions || token.positions || [];
    for (const reading of candidates) {
      if (rhymeNote?.addedPositions?.includes(reading.position) && !originalPositions.includes(reading.position)) {
        reading.origins = reading.origins.map(origin => origin === 'annotation' ? 'supplement' : origin);
      }
    }
    const evidence = [
      ...(p.readingNotes || []).filter(belongs),
      ...(p.pendingReadings || []).filter(belongs),
      ...(p.editionReview?.notes || []).filter(belongs),
      ...(p.confirmedHeadwords?.notes || []).filter(belongs),
      ...(p.corpusAlignmentReview?.formats || []).filter(belongs),
      ...(p.corpusAlignmentReview?.orders || []).filter(belongs),
      ...(p.tangSourceReadings?.notes || []).filter(belongs),
      ...(p.tangSourceReadings?.deferred || []).filter(belongs),
      ...(p.rhymeReview?.notes || []).filter(belongs),
    ];
    const entry = { token, index, hanIndex, info, candidates, current, alternatives, evidence, originalPositions, rhymeModel: p.rhymeReview?.model };
    return matchesReviewQuery(doc, entry, query) ? [entry] : [];
  });
}

function matchesReviewQuery(doc, entry, query) {
  query = query.trim().toLocaleLowerCase();
  if (!query) return true;
  if (/^\p{Script=Han}$/u.test(query)) return entry.token.char === query;
  const context = doc.tokens.slice(Math.max(0, entry.index - 7), entry.index + 8).map(t => t.char).join('');
  return [context, entry.token.sourceReading, ...entry.candidates.flatMap(r => [r.full, r.position])]
    .some(value => value?.toLocaleLowerCase().includes(query));
}

function readingReference(reference) {
  const label = [reference.book || reference.dictionary || reference.title || (reference.kind === 'user-instruction' ? '使用者指定' : ''), reference.page || reference.file,
    reference.line != null ? `第 ${reference.line} 行` : '',
    reference.entryId != null ? `條目 ${reference.entryId}` : '', reference.dictionaryChar,
    reference.position, reference.fanqie ? `反切 ${reference.fanqie}` : ''].filter(Boolean).join(' · ');
  const quote = reference.displayQuote || reference.quote;
  const url = /^https?:\/\//i.test(reference.url || '') ? reference.url : '';
  if (!label && !quote && !url) return '';
  return `<div class="reading-reference">${label ? `<div class="small-muted">${e(label)}</div>` : ''}${quote ? `<blockquote>${e(quote)}</blockquote>` : ''}${url ? `<a href="${e(url)}" target="_blank" rel="noopener noreferrer">查看原文 ↗</a>` : ''}</div>`;
}

function readingEvidence(entry) {
  const { token, evidence } = entry;
  const sourceEvidence = evidence.map(note => `<div class="reading-evidence-note">${note.position ? `<b>${e(note.position)}</b>` : ''}<p>${e(note.basis || note.reason || '')}</p>${note.comparison ? `<p>${e(note.comparison)}</p>` : ''}${rhymeEvidence(note, entry.rhymeModel)}${[...(note.references || []), ...(note.sourceNotes || []), ...(note.alternateReadingReferences || [])].map(readingReference).join('')}</div>`).join('');
  const audit = (token.audit || []).map(record => {
    const name = record.action === 'confirm' ? '人工確認' : record.action === 'user-reading-override' ? '使用者指定' : record.action === 'skip' ? '跳過' : '來源校訂';
    const format = value => Array.isArray(value) ? value.join(' | ') : value && typeof value === 'object'
      ? [value.char, value.position || value.positions?.join(' | ')].filter(Boolean).join(' · ') : value || '';
    return `<div class="reading-evidence-note"><b>${name}</b>${record.at ? `<span class="small-muted"> · ${e(record.at)}</span>` : ''}${record.after ? `<p>${e(format(record.before))} → ${e(format(record.after))}</p>` : ''}${record.reason ? `<p>${e(record.reason)}</p>` : ''}${(record.references || []).map(readingReference).join('')}</div>`;
  }).join('');
  return `${sourceEvidence ? `<details class="reading-evidence"><summary>本句選讀依據與異讀</summary>${sourceEvidence}</details>` : ''}${audit ? `<details class="reading-evidence"><summary>校對記錄 · ${token.audit.length} 項</summary>${audit}</details>` : ''}`;
}

function rhymeEvidence(note, model) {
  if (!note.rhyme && !note.pboc?.length) return '';
  const rhyme = note.rhyme;
  return `<div class="rhyme-evidence"><b>章內押韻覆核</b>${rhyme ? `<p>${e(rhyme.lines.join('，'))}</p><p>韻腳：${e(rhyme.words.join('—'))}</p><p>${e(rhyme.constraint)}</p>` : '<p>本字不以韻腳判音；依本句音義校對。</p>'}${note.pboc?.length ? `<details><summary>PBOC 擬音對照 · 模型推導</summary><p class="small-muted">下表的中古對應是模型推導，並非韻書實收；未列的讀法也不表示已被排除。同章押韻可能已用於模型構擬，不能算作另一份獨立證據。</p><div class="table-scroll"><table><thead><tr><th>字</th><th>上古擬音</th><th>推導中古</th></tr></thead><tbody>${note.pboc.map(fact => `<tr><td>${e(fact.char)}<br><span class="small-muted">行 ${e(fact.rowIndex)}</span></td><td class="mono">${e(fact.oc)}</td><td>${e(fact.derivedMc)}</td></tr>`).join('')}</tbody></table></div>${model?.methodUrl ? `<p class="small-muted">行號從 0 起算 · <a href="${e(model.methodUrl)}" target="_blank" rel="noopener noreferrer">固定版本 ${e(model.commit.slice(0, 7))} 的音系說明 ↗</a></p>` : ''}<a href="https://qwert-ly.github.io/xtext/?q=${encodeURIComponent(note.char)}&amp;mode=exact" target="_blank" rel="noopener noreferrer">PBOC 字表 ↗</a></details>` : ''}</div>`;
}

function reviewEntryView(doc, entry, filter) {
  const { token, index, hanIndex, info, current, candidates } = entry;
  const ready = info.status === 'ready';
  const lastSelection = (token.audit || []).findLast(a => a.after && a.action !== 'skip');
  const origin = lastSelection?.action === 'confirm' ? '人工確認' : lastSelection?.action === 'user-reading-override' ? '使用者指定' : lastSelection ? '依來源校訂' : token.sourceReading ? '依 polyhedron 原注' : '依語料標註';
  const currentLabel = ready ? '目前採讀 · 全拼' : token.skip ? '保留讀音 · 全拼 · 已跳過' : '待確認讀音 · 全拼';
  const candidatesHTML = candidates.map(reading => {
    const selected = current?.position === reading.position;
    const origins = (reading.origins || []).filter(o => o !== 'selected').map(o => ({ dictionary: '字庫', annotation: '原標註', supplement: '古注補充' })[o]).filter(Boolean);
    const definitions = definitionsFor(token.char, reading.position);
    return `<div class="review-candidate ${selected ? 'chosen' : ''}"><div class="candidate-heading"><strong class="mono">${e(reading.full)}</strong><span>${e(reading.position)}</span>${selected ? `<span class="tag ${ready ? 'green' : 'amber'}">${ready ? '目前採讀' : '目前標註'}</span>` : ''}</div><div class="small-muted">${e(origins.join(' · ') || '已選地位')} · 三拼 <span class="mono">${e(reading.triple)}</span></div>${definitions.length ? `<details class="candidate-definitions"><summary>韻書音義 · ${definitions.length} 條</summary>${definitions.map(d => `<div class="reading-reference"><div class="small-muted">${e(d.source)} · ${e(d.rhyme)}韻 · 小韻 ${e(d.group)}${d.fanqie ? ` · 反切 ${e(d.fanqie)}` : ''}</div><p>${e(d.text || '此條目未錄釋義')}</p></div>`).join('')}</details>` : '<p class="small-muted">字庫未收此字此音；請參照本句來源依據。</p>'}${button(selected && ready ? '已採用' : selected ? '確認此讀' : '改用此讀', 'choose-reading', selected ? 'soft' : '', '', `data-index="${index}" data-position="${e(reading.position)}" aria-label="${e(`${token.char} 第 ${hanIndex + 1} 字：選讀 ${reading.full}，${reading.position}`)}" ${selected && ready ? 'disabled' : ''}`)}</div>`;
  }).join('');
  return `<article class="review-entry" data-token-index="${index}" tabindex="-1"><header class="review-entry-header"><div class="review-character"><span class="cell-char">${e(token.char)}</span><span class="small-muted">第 ${hanIndex + 1} 字</span></div><p class="review-context">${e(doc.tokens.slice(Math.max(0, index - 7), index).map(t => t.char).join(''))}<mark>${e(token.char)}</mark>${e(doc.tokens.slice(index + 1, index + 8).map(t => t.char).join(''))}</p><span class="tag ${ready ? 'green' : info.status === 'skipped' ? '' : 'amber'}">${labels[info.status]}</span></header><div class="review-entry-body"><div class="review-current"><div class="position-label">${currentLabel}</div>${current ? `<div class="review-current-full mono">${e(current.full)}</div><div class="position-value">${e(current.position)}</div><p class="small-muted">三拼 <span class="mono">${e(current.triple)}</span>${ready ? ` · ${origin}` : ''}</p>` : '<p class="small-muted">尚未採讀，請選擇下方候選。</p>'}${info.error ? `<p class="error-text">${e(info.error)}</p>` : ''}<div class="review-original">${token.sourceReading ? `<div class="position-label">polyhedron 原注</div><p class="mono">${e(token.sourceReading)}</p>` : ''}<div class="position-label">原標註地位</div><p>${e(entry.originalPositions.join(' | ') || '未提供')}</p></div></div><div class="review-choices"><details class="review-candidates" ${filter === 'polyphonic' || !ready ? 'open' : ''}><summary>查看與切換讀音 · ${candidates.length} 個候選</summary><p class="small-muted">字庫候選可屬不同詞義，請對照本句語義與原注選讀。</p><div class="review-candidate-grid">${candidatesHTML || '<p class="small-muted">沒有可推導的候選，請手動輸入音韻地位。</p>'}</div></details><details class="review-manual"><summary>手動輸入音韻地位</summary><form class="reading-editor" data-index="${index}"><label>音韻地位<input name="position" value="${e(token.position || current?.position || ((token.positions || []).length === 1 ? token.positions[0] : ''))}" placeholder="例如 云合三C文去" required></label><button class="btn soft" type="submit">確認讀音</button></form></details><div class="review-entry-actions">${button(token.skip ? '恢復校對' : '跳過此字', token.skip ? 'unskip' : 'skip', '', '', `data-index="${index}"`)}</div></div><div class="review-entry-evidence">${readingEvidence(entry)}</div></div></article>`;
}

export function reviewView(doc, filter, page, documents, query = '') {
  if (!doc) return heading('校對讀音', '先導入一篇語料。') + '<a class="btn primary" href="#import">導入語料</a>';
  if (!Object.hasOwn(reviewFilters, filter)) filter = 'pending';
  const stats = documentStatus(doc);
  const allEntries = reviewEntries(doc);
  const entries = allEntries.filter(entry => (filter === 'all' || filter === 'polyphonic' && entry.alternatives || filter === 'ready' && entry.info.status === 'ready' || filter === 'pending' && !['ready', 'skipped'].includes(entry.info.status)) && matchesReviewQuery(doc, entry, query));
  const counts = { all: stats.total, pending: stats.pending, ready: stats.ready, polyphonic: allEntries.filter(entry => entry.alternatives).length };
  const pages = Math.max(1, Math.ceil(entries.length / 20));
  page = Math.max(0, Math.min(Number(page) || 0, pages - 1));
  const rows = entries.slice(page * 20, (page + 1) * 20);
  const empty = query.trim() ? ['沒有符合的字位', '可更換搜尋字詞，或切換至「所有」讀音。'] : { pending: ['讀音已校對完成', '可以開始全拼或三拼練習。'], polyphonic: ['本篇沒有多音字條目', '此篩選包含字庫或原注列出多種讀音的字位。'], ready: ['尚無已確認讀音', '請先在「待處理」中確認本句選讀。'], all: ['沒有可校對的字', '此篇沒有漢字條目。'] }[filter];
  return heading('校對讀音', `${e(doc.title)} · 原注、候選與本句採讀`, catalogueUpdateButton(doc) + button('匯出語料', 'export-doc', '', 'file', `data-id="${e(doc.id)}"`)) + `<label class="article-selector">語料<select id="review-article">${documents.map(d => option(d.id, d.title, doc.id)).join('')}</select></label><div class="review-summary">${[['練習正文', stats.total, '字'], ['已確認讀音', stats.ready, '處'], ['讀音待處理', stats.pending, '處'], ['已跳過', stats.skipped, '處']].map(([label, n, unit]) => `<div class="panel summary-box"><div class="summary-label">${label}</div><div class="summary-number">${n}<span class="summary-unit">${unit}</span></div></div>`).join('')}</div><details class="panel metadata-panel"><summary>語料資料</summary><form id="metadata-form" class="import-fields"><label>標題<input name="title" value="${e(doc.title)}" required></label><label>作者<input name="author" value="${e(doc.author)}"></label><label>來源<input name="source" value="${e(doc.source)}"></label><label>許可資訊<input name="license" value="${e(doc.license)}"></label><button type="submit" class="btn soft">保存資料</button></form>${provenanceView(doc)}</details><section class="panel review-reading-panel"><div class="table-heading"><h2>讀音條目</h2><div class="table-filters" role="group" aria-label="讀音篩選">${Object.entries(reviewFilters).map(([key, label]) => button(`${label} ${counts[key]}`, 'review-filter', filter === key ? 'soft' : '', '', `data-filter="${key}" aria-pressed="${filter === key}"`)).join('')}</div></div><form id="review-search" class="review-search"><label for="review-query">搜尋字詞或讀音</label><div><input id="review-query" name="query" value="${e(query)}" placeholder="例如 將、將進酒、tsvang" autocomplete="off"><button class="btn soft" type="submit">搜尋</button>${query ? button('清除', 'clear-review-search') : ''}</div></form><p class="review-filter-note small-muted">${filter === 'polyphonic' ? '包含已採讀與待確認的字位；列出字庫或原注的不同讀音，不表示本句各讀法皆適用。' : '選讀在全拼與三拼練習中共用；原注與校對記錄會一直保留。'}</p><div class="review-entries">${rows.length ? rows.map(entry => reviewEntryView(doc, entry, filter)).join('') : `<div class="empty-state"><h3>${empty[0]}</h3><p>${empty[1]}</p></div>`}</div><div class="review-bottom"><span class="small-muted">${entries.length ? `${page * 20 + 1}–${Math.min((page + 1) * 20, entries.length)} / ${entries.length} 處` : '0 處'}</span><div class="pagination">${button('上一頁', 'review-page', '', '', 'data-direction="-1" ' + (page === 0 ? 'disabled' : ''))}<span>${page + 1} / ${pages}</span>${button('下一頁', 'review-page', '', '', 'data-direction="1" ' + (page + 1 >= pages ? 'disabled' : ''))}</div>${button('開始練習', 'practice-doc', 'primary', 'arrow', `data-id="${e(doc.id)}" ${stats.pending || !stats.ready ? 'disabled' : ''}`)}</div></section><p class="review-policy">字庫未收但可推導的標註可依來源確認保留。跳過的字不計入練習字數，校對記錄隨語料匯出。</p>`;
}

export function modesView(reading, stage) {
  const prefix = reading.triple.slice(0,stage);
  return heading('鍵帽模式對照', `固定字「${e(reading.char)}」 · 已輸入 ${prefix || '∅'} · 當前 K${stage+1}`) + `<div class="comparison-intro"><div class="panel sample-state"><span class="sample-char">${e(reading.char)}</span><div><h3>${e(reading.position)}</h3><p>${e(reading.full)} · ${e(reading.triple)}</p></div></div><label class="mode-stage-label">輸入階段<select id="mode-stage">${[0,1,2].map(i=>option(String(i),`K${i+1}`,String(stage))).join('')}</select></label></div><nav class="mode-jump">${Object.entries(modeNames).map(([k,n])=>`<a href="#modes/${k}">${e(n)}</a>`).join('')}</nav>${Object.entries(modeNames).map(([k,n],i)=>`<section class="panel mode-card" id="mode-${k}"><div class="mode-heading"><div class="mode-title"><span class="mode-number">0${i+1}</span><h2>${e(n)}</h2></div><span class="mode-tagline">${k.startsWith('current')?'候選按已輸入前綴篩選':k==='qwerty'?'僅顯示物理鍵名':'全部三段映射常駐'}</span></div>${keyboard(k,reading,stage,prefix,false)}<div class="mode-explainer"><span>${k.endsWith('highlight')?'綠色表示下一正確鍵與對應片段。':'無答案高亮。'}</span>${button('使用此模式','use-mode','soft','',`data-mode="${k}"`)}</div></section>`).join('')}`;
}

export function resultsView(record, history) {
  if (!record) return heading('練習結果','完成一篇練習後，這裡會顯示速度、正確率與錯鍵分佈。')+'<a class="btn primary" href="#practice/three">開始練習</a>';
  const s=record.session, stats=sessionStats(s,0);
  const unique=new Map();for(const error of s.errors){const token=s.tokens[error.cursor];const k=`${token.char}:${token.position}`;if(!unique.has(k))unique.set(k,{token,errors:[]});unique.get(k).errors.push(error);}
  const max=Math.max(1,...stats.stageErrors);
  return `<div class="result-hero"><div class="result-mark">${icon('check')}</div><h1>練習結果</h1><p>${e(record.title)} · ${s.variant==='three'?'三拼':'全拼'} · ${s.variant==='three'?e(modeNames[s.settings.keyMode]):'QWERTY'} · ${e(new Date(record.at).toLocaleString('zh-Hant'))}</p></div><section class="panel result-stats">${[['練習速度',stats.speed,'字 / 分','按完成漢字計算'],['按鍵正確率',stats.accuracy.toFixed(1),'%',`${s.correct} 次正確 / ${s.attempts} 次字母按鍵`],['練習用時',formatTime(stats.milliseconds),'','不包含暫停時間'],['完成字數',stats.completed,`/ ${stats.total}`,'標點與跳過字不計入']].map(([label,value,unit,desc])=>`<div class="result-stat"><label>${label}</label><div class="number">${value}<small>${unit}</small></div><p>${desc}</p></div>`).join('')}</section><div class="result-columns"><section class="panel result-card"><h2>錯鍵分佈</h2><p class="card-sub">錯鍵退格修正後仍保留錯誤次數。</p><div class="error-bars">${stats.stageErrors.map((n,i)=>`<div class="bar-item"><label>K${i+1} ${['聲母','韻身','尾調'][i]}</label><div class="bar-track"><i style="width:${n/max*100}%"></i></div><span class="count">${n} 次</span></div>`).join('')}</div><div class="recommendation">${unique.size?`共 ${unique.size} 個字發生錯鍵，可集中複習。`:'本次沒有錯鍵，可以嘗試減少提示。'}</div><p class="small-muted">${s.settingsChanges?.length ? "本次曾調整提示，成績包含多種設定。<br>完成時提示：" : "提示："}${[['音韻地位',s.settings.showPosition],['全拼答案',s.settings.showFull],...(s.variant==='three'?[['三段拆分',s.settings.showParts]]:[])].map(([name,on])=>name+(on?'開啟':'關閉')).join(' · ')}</p></section><section class="panel result-card"><h2>錯字複習</h2>${[...unique.values()].map(({token,errors})=>`<div class="mistake-row"><div class="mistake-info"><span class="mistake-char">${e(token.char)}</span><div><b class="mono">${e(s.variant==='three'?token.triple:token.full)}</b><p>${errors.map(x=>`K${x.stage+1}：${e(x.actual)} → ${e(x.expected)}`).join('；')}</p></div></div><span class="tag amber">${errors.length} 次</span></div>`).join('')||'<p class="small-muted">本次沒有錯字。</p>'}${unique.size?button(`只練這 ${unique.size} 個字`,'mistakes','soft wide','repeat'):''}</section></div><div class="result-actions">${button('再練一次','retry','primary','repeat')}${button('減少提示','less-help','','sliders')}<a class="btn" href="#library">換一篇文章</a></div><section class="panel history-panel"><h2>歷次成績</h2><div class="history-list">${history.slice().reverse().map(r=>{const a=sessionStats(r.session,0);return `<button type="button" class="history-row" data-action="history" data-id="${e(r.id)}"><span>${e(r.title)} <small>${r.session.variant==='three'?'三拼 · '+e(modeNames[r.session.settings.keyMode]):'全拼'}${r.session.settingsChanges?.length?' · 提示曾調整':''} · ${e(new Date(r.at).toLocaleDateString('zh-Hant'))}</small></span><span>${a.accuracy.toFixed(1)}% · ${a.speed} 字 / 分</span></button>`;}).join('')}</div><p class="small-muted">保存最近 50 次成績。</p></section>`;
}
