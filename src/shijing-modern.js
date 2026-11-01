import data from './data/shijing-modern.json' with {type:'json'};
import {escapeHTML as e} from './corpus.js';
import {shijingRoute} from './shijing-routes.js';

export const shijingModern = data;
const pageSize = 40;
const base = import.meta.env?.BASE_URL || '/';
let index, indexPromise, indexError = '';
export async function loadShijingModernIndex(fetcher = fetch) {
  if (index) return index;
  if (!indexPromise) indexPromise = (async () => {
    try {
      indexError = '';
      const response = await fetcher(base + data.workIndex.url + '?v=' + data.workIndex.sha256.slice(0,12));
      if (!response.ok) throw new Error('全書索引載入失敗，請重試。');
      const text = await response.text();
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2,'0')).join('');
      const result = JSON.parse(text);
      if (hash !== data.workIndex.sha256 || result.version !== data.workIndex.version
        || result.units?.length !== data.progress.indexItems || result.poems?.length !== data.progress.totalPoems)
        throw new Error('全書索引版本不符，請重新整理。');
      index = result;
      return result;
    } catch (error) {
      indexError = error.message;
      indexPromise = undefined;
      throw error;
    }
  })();
  return indexPromise;
}

const refs = row => row.readings.flatMap(reading => reading.evidence);
export const hasModernSchoolClue = row => refs(row).some(ref => ref.schools.length || ref.scope === '三家未分');
export function filterModernEntries(filter = {}) {
  const terms = (filter.query || '').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return data.entries.filter(row => {
    const evidence = refs(row);
    const haystack = [row.title,row.id,row.baseText,row.base,row.lemma,row.note,row.auditId,
      ...row.readings.map(r => r.text),...evidence.flatMap(r => [r.witness,r.basis,r.note,r.scope,...r.schools])].join(' ').toLocaleLowerCase();
    return (!filter.poemId || row.poemId === filter.poemId)
      && (!filter.school || evidence.some(r => filter.school === '三家未分' ? r.scope === '三家未分' : r.schools.includes(filter.school)))
      && (!filter.scope || (filter.scope === 'three' ? hasModernSchoolClue(row) : filter.scope === 'other' ? !hasModernSchoolClue(row) : filter.scope === 'disputed' ? row.disputed : false))
      && terms.every(term => term.startsWith('ocr-check-') ? row.auditId === term : haystack.includes(term));
  });
}

export function filterModernIndex(source, filter = {}) {
  const terms = (filter.query || '').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return source.units.filter(unit => {
    const haystack = [unit.id,unit.title,unit.lemma,unit.lemmaOcr,unit.ocrAudit?.batchId,unit.ocrAudit?.summary,...unit.schoolMentions || [],
      ...unit.candidates.flatMap(c => [c.text,c.context])].join(' ').toLocaleLowerCase();
    return (!filter.poemId || unit.poemId === filter.poemId)
      && (!filter.scope || (filter.scope === 'pending' ? !unit.indexReviewed : filter.scope === 'linked' ? !!unit.reviewedEntryIds.length : filter.scope === 'unmatched' ? !unit.bodyMatch : filter.scope === 'audited' ? !!unit.ocrAudit : false))
      && terms.every(term => term.startsWith('ocr-check-') ? unit.ocrAudit?.batchId === term : haystack.includes(term));
  });
}

const option = (value,label,selected) => `<option value="${e(value)}"${value === selected ? ' selected' : ''}>${e(label)}</option>`;
const routeLink = (filter,label,classes='btn soft') => `<a class="${classes}" href="${e(shijingRoute(filter))}">${e(label)}</a>`;
const modes = [['modern','異文校讀・已核記錄'],['index','全書索引・OCR待校'],['entries','古注與清人輯定對照'],['sources','原書全錄・待校'],['candidates','古籍自動對句・待核']];
function form(filter, draft) {
  return `<form id="three-schools-filter" class="catalogue-filter"><label>顯示內容<select name="mode">${modes.map(([v,l]) => option(v,l,filter.mode || 'modern')).join('')}</select></label><label>搜尋字詞、出處或記錄號<input name="query" value="${e(filter.query || '')}" placeholder="例如 濆、朝、韓、清人推定"></label><label>篇章<select name="poemId">${option('','全部305篇',filter.poemId || '')}${data.poems.map(p => option(p.id,`${p.title} · ${p.indexItems}索引項／${p.reviewedRecords}筆已核`,filter.poemId)).join('')}</select></label>${draft ? '' : `<label>家別主張<select name="school">${option('','全部（含未定家別）',filter.school || '')}${['齊','魯','韓','三家未分'].map(s => option(s,s === '三家未分' ? s : s+'詩',filter.school)).join('')}</select></label>`}<label>記錄範圍<select name="scope">${(draft ? [['','全部索引項'],['pending','待逐圖校讀'],['linked','已連結校讀'],['unmatched','OCR正文尚未唯一定位'],['audited','已有OCR逐項核對']] : [['','全部已核記錄'],['three','含三家線索'],['other','其他版本／訓詁校改'],['disputed','有分歧，待覆核']]).map(([v,l]) => option(v,l,filter.scope || '')).join('')}</select></label><button class="btn soft" type="submit">搜尋</button></form>`;
}

const family = ref => ref.scope === '三家未分' ? ref.scope : ref.schools.length ? ref.schools.map(s=>s+'詩').join('、') : '未定家別';
const readingLabel = reading => [...new Set(reading.evidence.map(ref => `${family(ref)} · ${ref.basis}`))].map(e).join('／');
const evidenceView = ref => {
  const source = data.sources.find(source => source.id === ref.sourceId);
  return `<li><span class="tag">${e(family(ref))}</span> <strong>${e(ref.basis)}</strong> · ${e(ref.witness)}<p class="small-muted">${e(source.author)}《${e(source.title)}》${source.volume ? '卷'+source.volume : ''} · 印刷頁 ${ref.printPages.join('、')}／PDF 第 ${ref.pdfPages.join('、')} 頁</p>${ref.note ? `<p>${e(ref.note)}</p>` : ''}</li>`;
};
const glyphView = (url,alt) => `<img class="collation-glyph" src="${e(base+url)}" alt="${e(alt)}" loading="lazy">`;
const auditView = audit => audit ? `<details class="ocr-audit"><summary>OCR已逐項核對 · ${e(audit.checkedOn)}</summary><p>人工定位：印刷頁 ${[audit.page,...audit.continuationPages||[]].join('、')}／PDF 第 ${[audit.pdfPage,...(audit.continuationPages||[]).map(p=>p+25)].join('、')} 頁。</p><p>${e(audit.summary)}</p>${audit.decisions.length ? `<ul class="pilot-evidence">${audit.decisions.map(d=>`<li>原候選「${e(d.ocr)}」：<strong>${e(d.label)}</strong>${d.result ? ` → ${e(d.result)}` : ''}<p>${e(d.note)}</p></li>`).join('')}</ul>` : '<p>原未抽出候選；已按正文回查補錄。</p>'}<ul class="pilot-evidence">${audit.findings.map(f=>`<li><strong>${e(f.text)}</strong> · ${e(f.kind)} · ${e(family(f))}${f.witness ? ` · ${e(f.witness)}` : ''}${f.qualification ? ` · ${e(f.qualification)}` : ''}${f.note ? `<p>${e(f.note)}</p>` : ''}</li>`).join('')}</ul>${(audit.glyphs||[]).map(g=>`<figure>${glyphView(g.url,g.alt)}<figcaption class="small-muted">${e(g.note)}</figcaption></figure>`).join('')}<p class="small-muted">已核指袁書整理頁；古籍原件尚未全面覆核。</p></details>` : '';
const reviewedRows = rows => `<div class="table-scroll"><table class="three-schools-table pilot-table modern-reviewed-table"><thead><tr><th scope="col">篇章／本站原句</th><th scope="col">本站用字</th><th scope="col">異文及相關字</th><th scope="col">家別主張／逐項出處</th></tr></thead><tbody>${rows.map(row => `<tr data-modern-id="${e(row.id)}"><td><strong>${e(row.title)}</strong><p>${e(row.baseText)}</p><p class="small-muted">${e(row.id)} · ${e(row.status)}</p>${row.disputed ? '<span class="tag pilot-disputed">有分歧</span>' : ''}${routeLink({mode:'index',poemId:row.poemId},'本篇工作索引','text-link')}</td><td>${e(row.base)}</td><td class="variant-word">${row.readings.map(r=>`<div>${e(r.text)}${r.glyphStatus ? `<small> · ${e(r.glyphStatus)}</small>` : ''}${r.qualification ? `<small> · ${e(r.qualification)}</small>` : ''}${r.glyphImage ? glyphView(r.glyphImage,r.text) : ''}</div>`).join('')}</td><td>${row.note ? `<p>${e(row.note)}</p>` : ''}${row.readings.map(r=>`<details><summary>${e(r.text)} · ${readingLabel(r)}</summary><ul class="pilot-evidence">${r.evidence.map(evidenceView).join('')}</ul></details>`).join('')}<p class="small-muted">${e(row.verification)}</p></td></tr>`).join('')}</tbody></table></div>`;

const draftRows = rows => `<div class="table-scroll"><table class="three-schools-table pilot-table modern-index-table"><thead><tr><th scope="col">篇章／原書條目</th><th scope="col">索引字頭</th><th scope="col">校讀狀態</th><th scope="col">頁碼與作字句候選</th></tr></thead><tbody>${rows.map(unit => `<tr data-unit-id="${e(unit.id)}"><td><strong>${e(unit.title)}</strong><p class="small-muted">本篇第 ${unit.number} 項<br>${e(unit.id)}</p></td><td>${e(unit.lemma)}${unit.lemma !== unit.lemmaOcr ? `<p class="small-muted">索引OCR：${e(unit.lemmaOcr || '未識出')}</p>` : ''}</td><td><span class="tag">${e(unit.status)}</span>${unit.reviewedEntryIds.length ? routeLink({mode:'modern',poemId:unit.poemId},'查看本篇校讀','text-link') : unit.ocrAudit ? '<p class="small-muted">已回查正文，本項未新增經文異字記錄。</p>' : '<p class="small-muted">尚未裁定家別</p>'}</td><td><p>袁書索引：印刷頁 ${unit.indexPrintPage}／PDF 第 ${unit.indexPdfPage} 頁</p><p>正文範圍：印刷頁 ${unit.bodyPrintRange.join('–')}／PDF 第 ${unit.bodyPdfRange.join('–')} 頁</p>${unit.bodyMatch ? `<p class="small-muted">機器定位待核：印刷頁 ${unit.bodyMatch.printPage}／PDF 第 ${unit.bodyMatch.pdfPage} 頁；字頭 ${e(unit.bodyMatch.lemmaOcr)}</p>` : '<p class="small-muted">原OCR字頭尚未唯一定位；人工定位如有核定，見下方記錄。</p>'}${auditView(unit.ocrAudit)}${unit.candidates.length ? `<details><summary>${unit.candidates.length} 個原OCR候選 · ${unit.ocrAudit ? '核定見上方' : '全部待核'}</summary>${unit.reviewedEntryIds.length ? '<p>本項已有校讀；下列仍保留原OCR底稿，請另查看核字及證據。</p>' : ''}<p class="small-muted">可能含訓解、引文、否定語或OCR誤字；不能直接當作三家經文。</p><ul class="pilot-evidence">${unit.candidates.map(c=>`<li><strong>${e(c.text)}</strong> · 印刷頁 ${c.printPage}／PDF 第 ${c.pdfPage} 頁<blockquote>${e(c.context)}</blockquote></li>`).join('')}</ul></details>` : '<p class="small-muted">未抽出作字句候選，不表示沒有異文。</p>'}</td></tr>`).join('')}</tbody></table></div>`;

export function shijingModernView(filter = {}, source = index) {
  const draft = filter.mode === 'index';
  const poem = data.poems.find(p=>p.id === filter.poemId);
  const all = draft ? source ? filterModernIndex(source,filter) : [] : filterModernEntries(filter);
  const page = Math.max(0,Math.min(Math.floor(Number(filter.page)||0),Math.max(0,Math.ceil(all.length/pageSize)-1)));
  const rows = all.slice(page*pageSize,(page+1)*pageSize);
  const pager = `<div class="pagination collation-pagination"><button class="btn soft" data-action="three-schools-page" data-page="${page-1}"${!page ? ' disabled' : ''}>上一頁</button><span>第 ${page+1}／${Math.max(1,Math.ceil(all.length/pageSize))} 頁 · 符合 ${all.length} ${draft ? '項' : '筆'}</span><button class="btn soft" data-action="three-schools-page" data-page="${page+1}"${(page+1)*pageSize>=all.length ? ' disabled' : ''}>下一頁</button></div>`;
  const progress = data.progress;
  return `<div class="heading modern-heading"><div><h1>${draft ? '全書異文工作索引' : '三家詩異文輯錄'}</h1><p>${draft ? '逐篇查漏與回查頁碼；字頭和讀法候選仍待校。' : '按篇查閱異文、家別主張與逐項出處。'}</p></div><div class="collation-downloads"><a class="btn" href="${e(new URL('./data/shijing-modern.json',import.meta.url).href)}" download="shijing-modern-reviewed.json">已核 JSON</a><a class="btn" href="${e(base+'collations/shijing-modern-reviewed.txt')}" download>已核文字檔</a><a class="btn" href="${e(base+data.workIndex.url)}" download>全書工作 JSON</a><a class="btn" href="${e(base+data.workIndex.textUrl)}" download>全書工作文字檔</a></div></div>
    <section class="panel three-schools-intro"><div class="modern-progress"><div><strong>${progress.totalPoems}</strong><span>篇已建索引</span></div><div><strong>${progress.indexItems.toLocaleString()}</strong><span>原書索引條目</span></div><div><strong>${progress.reviewedRecords}</strong><span>筆已核記錄 · ${progress.reviewedPoems}篇</span></div><div><strong>${progress.unreviewedIndexItems.toLocaleString()}</strong><span>索引項待逐圖校讀</span></div></div><p>${e(data.coverage)}</p><p class="small-muted">已核記錄有 ${progress.disputedRecords} 筆分歧、${progress.pendingGlyphs} 處字形或字碼待定；「已核」指現代整理頁，古籍原件尚未全面覆核。</p><div class="collation-downloads">${routeLink({mode:'modern',poemId:filter.poemId},'異文校讀')}${routeLink({mode:'index',poemId:filter.poemId},'全書索引')}${routeLink({mode:'sources',poemId:filter.poemId},'原書全錄')}</div>${[...data.ocrAudits].reverse().map(batch=>`<p class="modern-audit-status">${e(batch.checkedOn)} ${batch.count === data.ocrAudit.count ? '續批' : '首批'} ${batch.count} 項已逐圖核對 · ${routeLink({mode:'index',query:batch.id},`查看${batch.count}項核對結果`,'text-link')} · <a class="text-link" href="${e(base+batch.textUrl)}" download>下載核對報告</a></p>`).join('')}<details class="modern-method"><summary>來源、核字層次與訂正</summary><p>${e(data.verification)}</p><p>${e(data.textPolicy)}</p><p>${e(data.attributionPolicy)}</p>${data.sources.map(s=>`<p>${e(s.author)}《${e(s.title)}》${s.volume ? '卷'+s.volume : ''}，${s.year}。${e(s.use)}</p>`).join('')}${data.corrections.map(note=>`<p>${e(note)}</p>`).join('')}<p>全書工作索引另保留六篇無辭笙詩的零條記錄，不加入305篇練習文本；索引條目、網站記錄與確定異文數分別計算。</p></details>${poem ? `<p class="modern-poem-status"><strong>${e(poem.title)}</strong> · 袁書 ${poem.indexItems} 個索引項 · ${poem.reviewedRecords} 筆已核記錄</p>` : ''}</section>
    <section class="panel three-schools-panel">${form({...filter,mode:draft ? 'index' : 'modern'},draft)}<p class="small-muted" role="status">${draft ? '此處為全書OCR工作底稿。三家字樣只作搜尋線索，未賦予候選確定家別；請查看「異文校讀」中的逐項證據。' : '家別依每份證據分別標示；篩出某家仍保留其他證據和反對意見。'}</p>${draft && !source ? `<p role="status">${e(indexError || '正在載入全書工作索引……')}</p><button class="btn soft" data-action="modern-index-retry">重新載入索引</button>` : `${pager}${rows.length ? draft ? draftRows(rows) : reviewedRows(rows) : `<div class="empty-state"><h3>${poem && !draft && !poem.reviewedRecords ? '本篇尚待逐圖校讀' : '沒有符合的記錄'}</h3><p>${poem?.indexItems === 0 ? '袁書索引本篇列0條；不代表其他版本或三家沒有異文。' : '未收錄或未抽出候選，不表示沒有異文。'}</p>${!draft ? routeLink({mode:'index',poemId:filter.poemId},'查看本篇工作索引') : ''}</div>`}${pager}`}</section>`;
}
