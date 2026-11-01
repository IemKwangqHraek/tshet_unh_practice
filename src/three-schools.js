import data from './data/shijing-three-schools.json' with { type: 'json' };
import archiveIndex from './data/shijing-three-schools-archive-index.json' with { type: 'json' };
import pilotData from './data/shijing-zhou-nan-pilot.json' with { type: 'json' };
import { escapeHTML as e } from './corpus.js';
import { getCatalogueSourceId } from './corpus-update.js';
import { shijingModern, shijingModernView } from './shijing-modern.js';

export const threeSchoolsData = data;
export const threeSchoolsArchiveIndex = archiveIndex;
export const threeSchoolsPilot = pilotData;
const poemOrder = id => ({ 'shijing-taoyao': 6, 'shijing-fuyi': 8 })[id] || Number(id.slice(8));
export const threeSchoolsPoems = [...new Map([...archiveIndex.poems.map(poem => [poem.id, poem.title]), ...data.entries.map(row => [row.poemId, row.title])])].sort(([a], [b]) => poemOrder(a) - poemOrder(b));
const archiveUrl = `${import.meta.env?.BASE_URL || '/'}collations/shijing-three-schools-archive.json`;
const archiveTextUrl = `${import.meta.env?.BASE_URL || '/'}collations/shijing-three-schools-archive.txt`;
const pageSize = 40;
let archive, archivePromise;

// Load the full transcription only when the collation page is opened.
export function loadThreeSchoolsArchive(fetcher = fetch) {
  if (archive) return Promise.resolve(archive);
  if (!archivePromise) archivePromise = fetcher(archiveUrl).then(async response => {
    if (!response.ok) throw new Error('原書輯錄載入失敗，請重試。');
    const value = await response.json();
    if (value.version !== archiveIndex.version || value.records?.length !== archiveIndex.records || value.candidates?.length !== archiveIndex.candidates) throw new Error('原書輯錄版本不符，請重新整理。');
    archive = value; return archive;
  }).catch(error => { archivePromise = undefined; throw error; });
  return archivePromise;
}

export function filterArchive(source, { query = '', school = '', poemId = '', book = '', mode = 'sources' } = {}) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const records = new Map(source.records.map(record => [record.id, record]));
  const related = new Set(source.candidates.filter(row => row.poemId === poemId).map(row => row.recordId));
  const rows = mode === 'candidates' ? source.candidates : source.records;
  return rows.filter(row => {
    const record = mode === 'candidates' ? records.get(row.recordId) : row;
    const volume = source.volumes.find(volume => volume.id === record.volumeId);
    const sourceBook = source.books.find(item => item.id === record.bookId);
    const haystack = [row.title, row.siteQuote, row.sourceQuote, record.id, record.sourceParagraphId, record.text, volume.name, sourceBook.title, sourceBook.author].join(' ').toLocaleLowerCase();
    return (!book || record.bookId === book) && (!school || (record.sourceSchool ? record.sourceSchool === school : record.familiesMentioned.includes(school)))
      && (!poemId || (mode === 'candidates' ? row.poemId === poemId : related.has(record.id))) && terms.every(term => haystack.includes(term));
  });
}

export function filterThreeSchools({ query = '', school = '', poemId = '' } = {}) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return data.entries.filter(row => (!poemId || row.poemId === poemId)
    && (!school || row.schools.includes(school))
    && terms.every(term => [row.title, row.baseText, row.base, row.variant, row.note,
      row.attribution, ...row.references.flatMap(ref => [ref.book, ref.quote])].join(' ').toLocaleLowerCase().includes(term)));
}

export function threeSchoolsLink(doc) {
  const id = getCatalogueSourceId(doc);
  const poem = shijingModern.poems.find(poem => poem.id === id);
  if (poem) return `<a class="btn" href="#shijing-variants/${e(id)}">本篇異文 · ${poem.reviewedRecords} 筆已核／${poem.indexItems} 個索引項${poem.reviewedRecords ? '' : poem.indexItems && poem.reviewedIndexItems===poem.indexItems ? ' · 索引已回查' : poem.indexItems===0 ? ' · 原索引未列條目' : ' · 待校'}</a>`;
  const count = data.entries.filter(row => row.poemId === id).length;
  const candidates = archiveIndex.poems.find(poem => poem.id === id)?.candidates || 0;
  return count || candidates ? `<a class="btn" href="#shijing-variants/${e(id)}">本篇三家詩資料 · ${count} 條整理／${candidates} 組待校</a>` : '';
}

const option = (value, label, selected) => `<option value="${e(value)}"${value === selected ? ' selected' : ''}>${e(label)}</option>`;
const referenceLocation = ref => ref.location.replace(/KR1g0003_SBCK_00([567])-(\d+[ab])/g,
  (_, volume, leaf) => `卷${{5:'五',6:'六',7:'七'}[volume]}・${leaf}葉`);

const sourceCitation = (record, source) => {
  const volume = source.volumes.find(volume => volume.id === record.volumeId);
  const book = source.books.find(book => book.id === record.bookId);
  return `<a href="${e(volume.url)}" target="_blank" rel="noopener noreferrer">${e(book.author)}《${e(book.title)}》${e(volume.name)} ↗</a>${record.sourceSchool ? `<p class="small-muted">原書編入${e(record.sourceSchool)}詩 · 陳氏輯定，待逐條覆核</p>` : ''}<p class="small-muted">轉錄第 ${record.number} 段 · ${e(record.id)}<br>來源段號 ${e(record.sourceParagraphId)} · 轉錄待校</p>`;
};
const scanSourcesView = () => archiveIndex.scanSources ? `<details class="collation-scans"><summary>《詩三家義集疏》公開影印：十冊、${archiveIndex.scanSources.files.reduce((sum,file) => sum + file.pages,0)} 個 PDF 頁面</summary><p>${e(archiveIndex.scanSources.coverage)}</p><p>${e(archiveIndex.scanSources.textStatus)}</p><ul>${archiveIndex.scanSources.files.map(file => `<li><a href="${e(file.url)}" target="_blank" rel="noopener noreferrer">${e(file.title)}</a>（${file.pages} 頁）</li>`).join('')}</ul></details>` : '';
const sourceLines = record => record.lines.filter(line => line.type !== 3).map(line => `<span${line.type === 2 ? ' class="collation-small"' : ''}>${e(line.text)}</span>`).join('');
const entryRows = rows => `<div class="table-scroll"><table class="three-schools-table"><thead><tr><th scope="col">篇章／本站原句</th><th scope="col">本站用字</th><th scope="col">異文</th><th scope="col">家別／依據</th></tr></thead><tbody>${rows.map(row => `<tr><td><strong>${e(row.title)}</strong><p>${e(row.baseText)}</p></td><td>${e(row.base)}</td><td class="variant-word">${e(row.variant)}</td><td><span class="tag">${row.schools.map(school => e(school) + '詩').join('、')}</span> <span class="small-muted">${e(row.attribution)}</span><p>${e(row.note)}</p>${row.references.map(ref => `<details><summary>${e(ref.book)} · ${e(referenceLocation(ref))}</summary><blockquote>${e(ref.quote)}</blockquote><p class="small-muted">${e(ref.verification)}</p><a href="${e(ref.url)}" target="_blank" rel="noopener noreferrer">查看出處 ↗</a>${ref.transcriptionUrl ? ` · <a href="${e(ref.transcriptionUrl)}" target="_blank" rel="noopener noreferrer">對讀轉錄 ↗</a>` : ''}</details>`).join('')}</td></tr>`).join('')}</tbody></table></div>`;

const pilotEvidence = row => row.readings.flatMap(reading => reading.evidence);
export const hasPilotSchoolClue = row => pilotEvidence(row).some(ref => ref.schools.length || ref.scope === '三家未分');
export function filterThreeSchoolsPilot({ query = '', school = '', poemId = '', scope = '' } = {}) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return pilotData.entries.filter(row => {
    const refs = pilotEvidence(row);
    const schoolMatch = !school || refs.some(ref => school === '三家未分' ? ref.scope === school : ref.schools.includes(school));
    const scopeMatch = !scope || (scope === 'three' ? hasPilotSchoolClue(row) : scope === 'other' ? !hasPilotSchoolClue(row) : scope === 'disputed' ? row.disputed : false);
    const haystack = [row.id, row.title, row.lemma, row.baseText, row.base, row.note, ...row.readings.map(r => r.text),
      ...refs.flatMap(ref => [ref.witness, ref.basis, ref.note, ref.scope, ...ref.schools]),
      ...pilotData.sources.filter(source => refs.some(ref => ref.sourceId === source.id)).flatMap(source => [source.title, source.author])].join(' ').toLocaleLowerCase();
    return (!poemId || row.poemId === poemId) && schoolMatch && scopeMatch && terms.every(term => haystack.includes(term));
  });
}

const pilotRefView = ref => {
  const source = pilotData.sources.find(source => source.id === ref.sourceId);
  const label = ref.scope === '三家未分' ? '三家未分' : ref.schools.length ? ref.schools.map(school => school + '詩').join('、') : '未定家別';
  return `<li><span class="tag">${e(label)}</span> <strong>${e(ref.basis)}</strong> · ${e(ref.witness)}<p class="small-muted">${e(source.author)}《${e(source.title)}》${source.volume ? '卷' + source.volume : ''} · 印刷頁 ${ref.printPages.join('、')}／PDF 第 ${ref.pdfPages.join('、')} 頁</p>${ref.note ? `<p>${e(ref.note)}</p>` : ''}</li>`;
};
const pilotReadingLabel = reading => [...new Set(reading.evidence.map(ref => {
  const school = ref.scope === '三家未分' ? ref.scope : ref.schools.map(school => school + '詩').join('、');
  return school ? `${school} · ${ref.basis}` : ref.basis;
}))].map(e).join('／');

export function threeSchoolsPilotView(filter = {}) {
  const allRows = filterThreeSchoolsPilot(filter);
  const page = Math.max(0, Math.min(Math.floor(Number(filter.page) || 0), Math.max(0, Math.ceil(allRows.length / pageSize) - 1)));
  const rows = allRows.slice(page * pageSize, (page + 1) * pageSize);
  const pager = `<div class="pagination collation-pagination"><button class="btn soft" data-action="three-schools-page" data-page="${page - 1}"${page === 0 ? ' disabled' : ''}>上一頁</button><span>第 ${page + 1}／${Math.max(1, Math.ceil(allRows.length / pageSize))} 頁 · 符合 ${allRows.length} 條</span><button class="btn soft" data-action="three-schools-page" data-page="${page + 1}"${(page + 1) * pageSize >= allRows.length ? ' disabled' : ''}>下一頁</button></div>`;
  return `<div class="heading"><div><h1>《周南》前十首試輯</h1><p>逐條核對現代整理本的異文、家別與出處。</p></div><div class="collation-downloads"><a class="btn" href="${e(new URL('./data/shijing-zhou-nan-pilot.json', import.meta.url).href)}" download="shijing-zhou-nan-pilot.json">試輯 JSON</a><a class="btn" href="${e((import.meta.env?.BASE_URL || '/') + 'collations/shijing-zhou-nan-pilot.txt')}" download="shijing-zhou-nan-pilot.txt">試輯文字檔</a><a class="btn soft" href="#shijing-variants/sources">原書全錄</a></div></div>
    <section class="panel three-schools-intro"><div class="panel-title"><h2>10 首 · ${pilotData.entries.length} 條校讀記錄</h2><span class="tag">${pilotData.entries.filter(hasPilotSchoolClue).length} 條含三家線索 · ${pilotData.entries.filter(row => row.disputed).length} 條有分歧</span></div><p>${e(pilotData.coverage)}</p><p>${e(pilotData.verification)}</p><p>${e(pilotData.textPolicy)}</p><details><summary>來源與判讀方式</summary>${pilotData.sources.map(source => `<p>${e(source.author)}《${e(source.title)}》${source.volume ? '卷' + source.volume : ''}，${source.year}：${e(source.use)}</p>`).join('')}<p>${e(pilotData.attributionPolicy)}</p><p>${e(pilotData.glyphPolicy)}</p></details><div class="pilot-poems">${pilotData.poems.map(poem => `<a class="btn soft${filter.poemId === poem.id ? ' active' : ''}" href="#shijing-variants/pilot/${e(poem.id)}">${e(poem.title.replace('周南・',''))} · ${poem.records} 條</a>`).join('')}</div></section>
    <section class="panel three-schools-panel"><form id="three-schools-filter" class="catalogue-filter"><label>顯示內容<select name="mode">${[['modern','異文校讀・已核記錄'],['index','全書索引・逐項核對'],['pilot','十首試輯・現代整理本'],['sources','原書全錄・待校'],['candidates','自動對句・待核'],['entries','已整理異文對照']].map(([value,label]) => option(value,label,'pilot')).join('')}</select></label><label>搜尋異字、學者或出處<input name="query" value="${e(filter.query || '')}" placeholder="例如 濆、朝、韓、清人推定"></label><label>篇章<select name="poemId">${option('','全部十首',filter.poemId || '')}${pilotData.poems.map(poem => option(poem.id,poem.title,filter.poemId)).join('')}</select></label><label>家別主張<select name="school">${option('','全部（含未定家別）',filter.school || '')}${['齊','魯','韓','三家未分'].map(school => option(school,school === '三家未分' ? school : school + '詩',filter.school)).join('')}</select></label><label>記錄範圍<select name="scope">${[['','全部校讀記錄'],['three','含三家線索'],['other','其他版本／訓詁校改'],['disputed','有分歧，待覆核']].map(([value,label]) => option(value,label,filter.scope || '')).join('')}</select></label><button class="btn soft" type="submit">搜尋</button></form><p class="small-muted" role="status">家別依每份證據分別標示；篩出某家仍會顯示該條的其他證據與反對意見。讀若及本字說不計作實見三家經文。</p>${pager}
    ${rows.length ? `<div class="table-scroll"><table class="three-schools-table pilot-table"><thead><tr><th scope="col">篇章／本站原句</th><th scope="col">本站用字</th><th scope="col">異文及相關字</th><th scope="col">家別主張／逐項出處</th></tr></thead><tbody>${rows.map(row => `<tr data-pilot-id="${e(row.id)}"><td><strong>${e(row.title)}</strong><p>${e(row.baseText)}</p><p class="small-muted">${e(row.section)} · ${e(row.lemma)}<br>${e(row.id)}</p>${row.disputed ? '<span class="tag pilot-disputed">有分歧</span>' : ''}</td><td>${e(row.base)}</td><td class="variant-word">${row.readings.map(reading => `<div>${e(reading.text)}${reading.glyphStatus ? '<small> · 字形待辨</small>' : ''}</div>`).join('')}</td><td>${row.note ? `<p>${e(row.note)}</p>` : ''}${row.readings.map(reading => `<details><summary>${e(reading.text)} · ${pilotReadingLabel(reading)}</summary><ul class="pilot-evidence">${reading.evidence.map(pilotRefView).join('')}</ul></details>`).join('')}<p class="small-muted">${e(row.verification)}</p></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><h3>沒有符合的條目</h3><p>可清空搜尋或篩選；未收錄不表示沒有異文。</p></div>'}${pager}</section>`;
}

export function threeSchoolsView(filter = {}, source = archive) {
  if (!filter.mode || ['modern','index'].includes(filter.mode)) return shijingModernView(filter);
  if (filter.mode === 'pilot') return threeSchoolsPilotView(filter);
  const mode = ['entries','candidates'].includes(filter.mode) ? filter.mode : 'sources';
  const allRows = mode === 'entries' ? filterThreeSchools(filter) : source ? filterArchive(source, { ...filter, mode }) : [];
  const page = Math.max(0, Math.min(Math.floor(Number(filter.page) || 0), Math.max(0, Math.ceil(allRows.length / pageSize) - 1)));
  const rows = allRows.slice(page * pageSize, (page + 1) * pageSize);
  const recordMap = source && new Map(source.records.map(record => [record.id, record]));
  const pager = `<div class="pagination collation-pagination"><button class="btn soft" data-action="three-schools-page" data-page="${page - 1}"${page === 0 ? ' disabled' : ''}>上一頁</button><span>第 ${page + 1}／${Math.max(1, Math.ceil(allRows.length / pageSize))} 頁 · 符合 ${allRows.length} ${mode === 'candidates' ? '組' : mode === 'sources' ? '段' : '條'}</span><button class="btn soft" data-action="three-schools-page" data-page="${page + 1}"${(page + 1) * pageSize >= allRows.length ? ' disabled' : ''}>下一頁</button></div>`;
  return `<div class="heading"><div><h1>三家詩異文輯錄</h1><p>原書全錄、待校對句與已整理對照，均可檢索出處。</p><a class="btn soft" href="#shijing-variants">查看異文校讀 · ${shijingModern.entries.length} 筆已核</a></div><div class="collation-downloads"><a class="btn" href="${e(archiveUrl)}" download="shijing-three-schools-archive.json">全錄 JSON</a><a class="btn" href="${e(archiveTextUrl)}" download="shijing-three-schools-archive.txt">全錄文字檔</a><a class="btn" href="${e(new URL('./data/shijing-three-schools.json', import.meta.url).href)}" download="shijing-three-schools.json">整理表 JSON</a></div></div>
    <section class="panel three-schools-intro"><div class="panel-title"><h2>收錄進度</h2><span class="tag">${archiveIndex.records.toLocaleString()} 段原文 · ${archiveIndex.candidates} 組待校對句 · ${data.entries.length} 條整理</span></div><p>${e(archiveIndex.coverage)}</p><p>原書轉錄完整收存不等於異文已全部核定。《集疏》尚未全錄；目前不能稱為兩書全部異文總表。</p><p>${e(data.textPolicy)}</p><details><summary>版本、家別與覆核說明</summary><p>${e(archiveIndex.verification)}</p><p>${e(archiveIndex.attribution)}</p>${archiveIndex.books.map(book => `<p>${e(book.author)}《${e(book.title)}》：${e(book.edition)}。${e(book.catalogueNote)}</p>`).join('')}<p>${e(data.attributionPolicy)}</p><p>${e(archiveIndex.missingSources[0].reason)}</p></details><p class="small-muted">原指定書目：<a href="https://ctext.org/wiki.pl?if=gb&amp;res=598482" target="_blank" rel="noopener noreferrer">王先謙《詩三家義集疏》</a>；<a href="https://ctext.org/library.pl?if=en&amp;res=1361" target="_blank" rel="noopener noreferrer">陳喬樅《詩經四家異文考》</a>。</p>${scanSourcesView()}</section>
    <section class="panel three-schools-panel"><form id="three-schools-filter" class="catalogue-filter"><label>顯示內容<select name="mode">${[['modern','異文校讀・已核記錄'],['index','全書索引・逐項核對'],['sources','原書全錄・待校'],['candidates','自動對句・待核'],['entries','已整理異文對照']].map(([value,label]) => option(value,label,mode)).join('')}</select></label><label>搜尋字詞、出處或段號<input name="query" value="${e(filter.query || '')}" placeholder="例如 州、逶迤、chen-v1-p0007"></label><label>篇章${mode === 'sources' ? '（依對句關聯）' : ''}<select name="poemId">${option('', '全部篇章／未對句原文', filter.poemId || '')}${threeSchoolsPoems.map(([id, title]) => option(id, title, filter.poemId)).join('')}</select></label>${mode !== 'entries' ? `<label>原書<select name="book">${option('', '全部原書', filter.book || '')}${archiveIndex.books.map(book => option(book.id, book.title, filter.book)).join('')}</select></label>` : ''}<label>${mode === 'entries' ? '家別' : '家別線索（原書分類／段中提及）'}<select name="school">${option('', mode === 'entries' ? '全部家別' : '全部（包括家別未明）', filter.school || '')}${['齊','魯','韓'].map(school => option(school, school + '詩', filter.school)).join('')}</select></label><button type="submit" class="btn soft">搜尋</button></form>
    <p class="small-muted" role="status">${mode === 'entries' ? '家別沿用引文或清人輯定；並非現存三家詩原本。' : '家別線索優先依原書的輯佚分類；未分家者按段中提及，均另行標明。按篇章只查自動對句關聯，可能漏失；清空篇章可查全部原文。對句中的差字也可能是 OCR 誤識。'}</p>
    ${mode !== 'entries' && !source ? '<p role="status">正在載入原書輯錄……</p><button class="btn soft" data-action="three-schools-retry">重新載入</button>' : `${pager}${rows.length ? mode === 'entries' ? entryRows(rows) : mode === 'candidates' ? `<div class="table-scroll"><table class="three-schools-table"><thead><tr><th>篇章</th><th>本站字句</th><th>轉錄字句・待校</th><th>原文及出處</th></tr></thead><tbody>${rows.map(row => { const record = recordMap.get(row.recordId); return `<tr><td>${e(row.title)}<p class="small-muted">${e(row.status)}<br>${record.sourceSchool ? '家別見原書輯佚分類' : '家別未據此判定'}</p></td><td>${e(row.siteQuote)}</td><td>${e(row.sourceQuote)}</td><td>${sourceCitation(record,source)}<details><summary>查看原段與後續兩段</summary>${[record, ...source.records.filter(next => next.volumeId === record.volumeId && next.number > record.number && next.number <= record.number + 2)].map(next => `<blockquote>${sourceLines(next)}</blockquote>`).join('')}<button class="btn soft" data-action="three-schools-context" data-record="${e(record.id)}">定位原書段落</button></details></td></tr>`; }).join('')}</tbody></table></div>` : `<div class="collation-records">${rows.map(record => `<article class="collation-record" data-record-id="${e(record.id)}">${sourceCitation(record,source)}<blockquote>${sourceLines(record)}</blockquote></article>`).join('')}</div>` : '<div class="empty-state"><h3>沒有符合的條目</h3><p>可清空搜尋或篩選；未收錄不表示沒有異文。</p></div>'}${pager}`}</section>`;
}
