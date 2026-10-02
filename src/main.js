import './design.css';
import './app.css';
import sampleTexts from './data/samples.json' with { type: 'json' };
import { derive } from './phonology.js';
import { parseImport, documentStatus, practiceTokens, confirmToken, skipToken, exportDocument, escapeHTML as e, newId } from './corpus.js';
import { createSession, inputKey, pause, resume, sessionStats, mistakeTokens } from './session.js';
import { loadState, saveState, cleanSettings, STORAGE_KEY } from './storage.js';
import { icon, button, practiceView, libraryView, importView, reviewView, modesView, resultsView, formatTime } from './views.js';

const app = document.querySelector('#app');
const sampleDocuments = sampleTexts.map((text, i) => ({ ...parseImport(text, 'txt', {
  source: 'https://github.com/nk2028/tshet-uinh-text-label', license: 'CC0-1.0', split: false })[0], id: `sample-${i}` }));
let storage;
try { storage = window.localStorage; } catch { storage = { getItem: () => null, setItem: () => { throw new Error('unavailable'); } }; }
const loaded = loadState(storage);
let storageError = loaded.error;
let protectCorruptStorage = Boolean(loaded.error);
let documents = structuredClone(sampleDocuments);
let history = [];
let settings = cleanSettings(loaded.data?.settings);
let selectedId = loaded.data?.selectedId || 'sample-1';
let activeSession = null;
let sessionDocumentId = null;
let resultId = null;
let reviewFilter = 'pending';
let reviewPage = 0;
let modeStage = 1;
let undoDocument = null;
let preview = [];
let draft = { filename: '', title: '', author: '', source: '', license: '', text: '', format: 'auto', split: true };
let notice = '';
let noticeTimer;
let saveTimer;
let lastRoute = '';
let composing = false;

if (loaded.data) {
  try {
    documents = loaded.data.documents.map(doc => ({ ...parseImport(JSON.stringify(exportDocument(doc)), 'json')[0], id: doc.id }));
    if (!documents.length) documents = [];
    history = loaded.data.history.filter(r => r.session?.finished && Array.isArray(r.session.tokens) && Array.isArray(r.session.errors)).slice(-50);
    if (loaded.data.activeSession && documents.some(d => d.id === loaded.data.sessionDocumentId)) {
      const saved = loaded.data.activeSession;
      if (!saved.finished && Array.isArray(saved.tokens) && saved.cursor >= 0 && saved.cursor < saved.tokens.length && Array.isArray(saved.errors)) {
        activeSession = saved;
        activeSession.runningSince = null;
        activeSession.paused = true;
        sessionDocumentId = loaded.data.sessionDocumentId;
      }
    }
  } catch {
    documents = structuredClone(sampleDocuments);
    storageError = '保存的語料結構無效。現有資料未被覆寫，請匯出復原副本後重設儲存。';
    protectCorruptStorage = true;
  }
}
if (!documents.some(d => d.id === selectedId)) selectedId = documents[0]?.id;

const currentDocument = () => documents.find(d => d.id === selectedId);
const currentRecord = () => history.find(r => r.id === resultId) || history.at(-1);
const routeName = () => (location.hash.slice(1).split('/')[0] || 'practice');

function updateSessionSettings() {
  if (!activeSession || activeSession.finished) return;
  if (activeSession.attempts && JSON.stringify(activeSession.settings) !== JSON.stringify(settings)) {
    activeSession.settingsChanges ??= [];
    activeSession.settingsChanges.push({ before: {...activeSession.settings}, after: {...settings}, cursor:activeSession.cursor,
      elapsed:sessionStats(activeSession,Date.now()).milliseconds });
  }
  activeSession.settings = {...settings};
}

function persist(immediate = false) {
  clearTimeout(saveTimer);
  const save = () => {
    if (protectCorruptStorage) return;
    const snapshot = activeSession && !activeSession.finished ? { ...activeSession,
      elapsed: sessionStats(activeSession, Date.now()).milliseconds, runningSince: null, paused: true } : null;
    const error = saveState(storage, { documents, history, settings, selectedId, activeSession: snapshot, sessionDocumentId });
    if (error && error !== storageError) { storageError = error; renderStorageError(); }
  };
  immediate ? save() : saveTimer = setTimeout(save, 150);
}

function renderStorageError() {
  const target = document.querySelector('#storage-warning');
  if (target) target.innerHTML = storageError ? `<p>${e(storageError)}</p>${button('匯出復原副本','export-backup')}${button('重設本機儲存','reset-storage')}` : '';
}

function notify(message, isError = false) {
  notice = message;
  const target = document.querySelector('#notice');
  if (target) { target.textContent = message; target.className = `notice visible ${isError ? 'notice-error' : ''}`; }
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { notice = ''; if (target) target.className = 'notice'; }, 6500);
}

function setDocument(id) {
  if (activeSession && !activeSession.finished) pause(activeSession, Date.now());
  selectedId = id;
  activeSession = null;
  sessionDocumentId = null;
  reviewPage = 0;
  persist();
}

function ensureSession(force = false) {
  const doc = currentDocument();
  if (!doc || documentStatus(doc).pending) { activeSession = null; return; }
  if (!force && activeSession && sessionDocumentId === doc.id && activeSession.variant === settings.variant && !activeSession.finished) return;
  const tokens = practiceTokens(doc);
  activeSession = tokens.length ? createSession(tokens, settings.variant, settings, Date.now()) : null;
  sessionDocumentId = doc.id;
}

function route(hash) {
  if (location.hash === hash) onRoute();
  else location.hash = hash;
}

function onRoute() {
  const name = routeName();
  if (lastRoute === 'practice' && name !== 'practice' && activeSession && !activeSession.finished) pause(activeSession, Date.now());
  if (name === 'practice') {
    const variant = location.hash.split('/')[1];
    if (variant === 'full' || variant === 'three') settings.variant = variant;
    ensureSession();
  }
  lastRoute = name;
  render();
  persist();
  if (name === 'modes' && location.hash.includes('/')) document.getElementById(`mode-${location.hash.split('/')[1]}`)?.scrollIntoView({ block: 'start' });
}

function render(focusTyping = false) {
  const name = routeName();
  const titles = {practice: settings.variant === 'three' ? '三拼練習' : '全拼練習', library: '語料', import: '導入語料', review: '校對讀音', modes: '鍵帽模式對照', results: '練習結果'};
  document.title = `${titles[name] || '練習'} · 切韻練字`;
  const navs = [
    ['practice/three','keyboard','三拼練習'], ['practice/full','book','全拼練習'], ['modes','sliders','鍵帽模式對照'],
    ['library','book','語料'], ['import','upload','導入語料'], ['review','list','校對讀音'], ['results','chart','練習結果']
  ];
  let body;
  if (name === 'import') body = importView(draft, preview);
  else if (name === 'library') body = libraryView(documents, selectedId);
  else if (name === 'review') body = reviewView(currentDocument(), reviewFilter, reviewPage, documents);
  else if (name === 'modes') body = modesView({ ...derive('曉開四蕭上', '曉'), char: '曉' }, modeStage);
  else if (name === 'results') body = resultsView(currentRecord(), history);
  else body = practiceView(currentDocument(), activeSession, settings, documents);
  app.innerHTML = `<div class="app"><aside class="sidebar"><a class="brand" href="#practice/three"><span class="brand-mark">切</span><div><div class="brand-name">切韻練字</div><div class="brand-sub">TSHET-UNH PRACTICE</div></div></a><div class="nav-label">練習與語料</div><nav class="nav" aria-label="主要功能">${navs.map(([target,glyph,label])=>`<a href="#${target}" class="${target.split('/')[0]===name&&(name!=='practice'||target.endsWith(settings.variant))?'active':''}">${icon(glyph)}${label}</a>`).join('')}</nav><div class="sidebar-bottom"><div class="version-box"><strong>prengQvm · 默認鍵位 v1</strong>韻：unh · 云合三C文去<br>資料保存在此瀏覽器</div></div></aside><main class="main view-${e(name)}"><div class="topbar"><span>${e(titles[name]||'練習')}</span><span class="local-badge">${icon('check')}本機練習</span></div><div id="storage-warning" class="storage-warning" role="alert"></div>${undoDocument?`<div class="undo-banner">已移除「${e(undoDocument.title)}」${button('撤銷','undo-remove','soft')}</div>`:''}${body}<footer class="view-footer"><span>全拼／三拼 · UTF-8 逐字音韻地位 · prengQvm</span><a href="https://github.com/nk2028/tshet-uinh-text-label" target="_blank" rel="noreferrer">語料來源 ↗</a></footer></main><div id="notice" class="notice ${notice?'visible':''}" role="status" aria-live="polite">${e(notice)}</div></div>`;
  renderStorageError();
  if (focusTyping) document.querySelector('#typing')?.focus({ preventScroll: true });
  document.querySelector('.live-poem .current')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function handleKey(key) {
  if (routeName() !== 'practice' || !activeSession) return;
  const result = inputKey(activeSession, key, Date.now());
  if (result === 'finished') {
    const doc = currentDocument();
    const record = { id: newId(), documentId: doc.id, title: doc.title, at: new Date().toISOString(), session: structuredClone(activeSession) };
    history.push(record);
    history = history.slice(-50);
    resultId = record.id;
    persist(true);
    route('#results');
    return;
  }
  if (result === 'incomplete') notify('音節尚未輸完，請繼續輸入。');
  else if (result === 'confirm') notify('音節已完整，請按 Space 確認。');
  else if (result === 'paused') notify('練習已暫停，按「繼續」恢復。');
  if (!['ignored','blocked','incomplete','confirm','paused'].includes(result)) render(!activeSession.paused);
  persist();
}

function download(name, content, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name.replace(/[<>:"/\\|?*]/g,'_'); a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readDraft() {
  const form = document.querySelector('#import-form');
  if (!form) return;
  const data = new FormData(form);
  for (const key of ['title','author','source','license','text','format']) draft[key] = String(data.get(key) || '');
  draft.split = data.has('split');
}

async function loadFile(file) {
  if (!file) return;
  if (file.size > 2_000_000) throw new Error('單次導入上限為 2 MB，請將語料分篇導入');
  readDraft();
  try { draft.text = new TextDecoder('utf-8', {fatal:true}).decode(await file.arrayBuffer()); }
  catch { throw new Error('文件不是有效 UTF-8，請先轉換編碼'); }
  draft.filename = file.name;
  draft.title = '';
  draft.format = /\.json$/i.test(file.name) ? 'json' : /\.tsv$/i.test(file.name) ? 'tsv' : 'auto';
  preview = [];
  render();
  notify('已載入文件，請識別並預覽。');
}

function practiceDocument(id) {
  if (id !== selectedId) setDocument(id);
  const doc = currentDocument();
  if (!doc) return;
  if (documentStatus(doc).pending) { reviewFilter = 'pending'; route('#review'); return; }
  ensureSession(true);
  route(`#practice/${settings.variant}`);
  document.querySelector('#typing')?.focus({preventScroll:true});
}

function repeatRecord(mistakes = false, lessHelp = false) {
  const record = currentRecord();
  if (!record) return;
  settings = cleanSettings(record.session.settings);
  settings.variant = record.session.variant;
  if (lessHelp) Object.assign(settings, {keyMode:'qwerty',showPosition:false,showFull:false,showParts:false});
  const tokens = mistakes ? mistakeTokens(record.session) : record.session.tokens;
  const doc = parseImport(JSON.stringify({ title: record.title + (mistakes ? ' · 錯字複習' : ' · 再練'),
    tokens: tokens.map(t => ({char:t.char,position:t.position,confirmed:true})) }), 'json')[0];
  doc.id = `repeat-${newId()}`;
  // Repeated sessions retain the exact selected readings; the generated text can be exported like any other document.
  documents.push(doc);
  setDocument(doc.id);
  practiceDocument(doc.id);
}

app.addEventListener('click', event => {
  const element = event.target.closest('[data-action]');
  if (!element || element.disabled) return;
  const action = element.dataset.action;
  const doc = currentDocument();
  try {
    if (action === 'key') handleKey(element.dataset.key);
    else if (action === 'pause') { handleKey('Escape'); }
    else if (action === 'restart') { ensureSession(true); render(true); persist(); }
    else if (action === 'practice-doc') practiceDocument(element.dataset.id);
    else if (action === 'review-doc') { if (element.dataset.id!==selectedId) setDocument(element.dataset.id); reviewFilter='pending'; reviewPage=0; route('#review'); }
    else if (action === 'export-doc') { const target=documents.find(d=>d.id===element.dataset.id); download(`${target.title}.json`,JSON.stringify(exportDocument(target),null,2)); }
    else if (action === 'sample-import') { readDraft(); Object.assign(draft,{text:sampleTexts[1],title:'',author:'',source:'https://github.com/nk2028/tshet-uinh-text-label',license:'CC0-1.0',format:'txt',split:false}); preview=[]; render(); }
    else if (action === 'review-example') { readDraft(); Object.assign(draft,{text:'# 校對範例\n聞(明三C文平|明三C文去)曉抬(定開一咍平)。',title:'',author:'',source:'人工構造校對範例',license:'',format:'txt',split:false}); preview=[]; render(); }
    else if (action === 'save-import') { if(!preview.length)throw new Error('請重新識別並預覽語料。'); documents.push(...preview); const first=preview[0]; preview=[]; setDocument(first.id); reviewFilter='pending'; route('#review'); notify('語料已保存，請確認待處理讀音。'); }
    else if (action === 'json-example') download('example.json',JSON.stringify(exportDocument(sampleDocuments[1]),null,2));
    else if (action === 'review-filter') { reviewFilter=element.dataset.filter; reviewPage=0; render(); }
    else if (action === 'review-page') { reviewPage=Math.max(0,reviewPage+Number(element.dataset.direction)); render(); }
    else if (action === 'choose-reading') { confirmToken(doc.tokens[Number(element.dataset.index)],element.dataset.position); activeSession=null; persist(); render(); notify('已確認此字選讀。'); }
    else if (action === 'skip' || action === 'unskip') { const token=doc.tokens[Number(element.dataset.index)]; if(action==='skip')skipToken(token);else token.skip=false; activeSession=null; persist(); render(); }
    else if (action === 'use-mode') { settings.keyMode=element.dataset.mode; updateSessionSettings(); persist(); route('#practice/three'); }
    else if (action === 'history') { resultId=element.dataset.id; render(); }
    else if (action === 'retry') repeatRecord();
    else if (action === 'mistakes') repeatRecord(true);
    else if (action === 'less-help') repeatRecord(false,true);
    else if (action === 'remove-doc') { undoDocument=documents.find(d=>d.id===element.dataset.id); documents=documents.filter(d=>d.id!==element.dataset.id); if(selectedId===element.dataset.id)setDocument(documents[0]?.id); persist(); render(); }
    else if (action === 'undo-remove') { documents.push(undoDocument); undoDocument=null; persist(); render(); }
    else if (action === 'export-backup') { download('tshet-unh-backup.json', storage.getItem(STORAGE_KEY)||JSON.stringify({documents:documents.map(exportDocument),history,settings},null,2)); }
    else if (action === 'reset-storage') {
      // Recovery is explicit and reversible through the exported backup.
      const original = storage.getItem(STORAGE_KEY);
      if (original) download('tshet-unh-recovery-backup.json', original);
      protectCorruptStorage=false; storageError=''; persist(true); render(); notify('已下載復原副本，並以目前資料重設本機儲存。');
    }
  } catch(error) { notify(error.message,true); }
});

app.addEventListener('submit', event => {
  event.preventDefault();
  try {
    if (event.target.id === 'import-form') {
      readDraft(); preview=parseImport(draft.text,draft.format,{...draft}); render(); notify(`已識別 ${preview.length} 篇語料，請檢查預覽後保存。`);
    } else if (event.target.matches('.reading-editor')) {
      const index=Number(event.target.dataset.index); const position=new FormData(event.target).get('position');
      confirmToken(currentDocument().tokens[index],position); activeSession=null; persist(); render(); notify('已確認此字選讀。');
    } else if (event.target.id==='metadata-form') {
      const data=new FormData(event.target); for(const key of ['title','author','source','license'])currentDocument()[key]=String(data.get(key)||'').trim(); persist();render();notify('語料資料已保存。');
    }
  } catch(error) { notify(error.message,true); }
});

app.addEventListener('change', async event => {
  const element=event.target;
  try {
    if(element.id==='file-input')await loadFile(element.files[0]);
    else if(element.id==='article-select') { setDocument(element.value); ensureSession(); render(); }
    else if(element.id==='review-article') { setDocument(element.value); reviewPage=0;render(); }
    else if(element.id==='key-mode') { settings.keyMode=element.value; updateSessionSettings(); persist();render(); }
    else if(element.dataset.setting) { settings[element.dataset.setting]=element.checked; updateSessionSettings(); persist();render(); }
    else if(element.id==='mode-stage') { modeStage=Number(element.value);render(); }
    else if(element.closest('#import-form')) { readDraft();preview=[]; }
  } catch(error) { notify(error.message,true); }
});

app.addEventListener('input', event => {
  if(event.target.closest('#import-form')) { readDraft(); preview=[]; document.querySelector('.preview-panel')?.remove(); }
});
app.addEventListener('keydown', event => {
  if(routeName()!=='practice')return;
  if(event.isComposing||composing)return;
  if(event.ctrlKey||event.metaKey||event.altKey)return;
  if(event.key==='Escape' || event.target.id==='typing' && (/^[a-z]$/i.test(event.key)||event.key==='Backspace'||event.key===' ')) {
    event.preventDefault(); if(!event.repeat)handleKey(event.key);
  }
});
app.addEventListener('compositionstart', event => { if(event.target.id==='typing'){composing=true;notify('請切換至英文鍵盤輸入；輸入法組字不計入本次練習。');} });
app.addEventListener('compositionend', event => { composing=false; if(event.target.id==='typing')event.target.value=''; });
app.addEventListener('paste', event => { if(event.target.id==='typing'){event.preventDefault();notify('請逐鍵輸入，以記錄正確率與錯鍵。');} });
app.addEventListener('dragover', event => { if(event.target.closest('#drop-zone')){event.preventDefault();event.target.closest('#drop-zone').classList.add('drag-active');} });
app.addEventListener('dragleave', event => event.target.closest('#drop-zone')?.classList.remove('drag-active'));
app.addEventListener('drop', async event => { if(event.target.closest('#drop-zone')){event.preventDefault();try{await loadFile(event.dataTransfer.files[0]);}catch(error){notify(error.message,true);}} });
window.addEventListener('hashchange',onRoute);
window.addEventListener('beforeunload',()=>persist(true));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&activeSession&&!activeSession.finished){pause(activeSession,Date.now());persist(true);if(routeName()==='practice')render();}});
setInterval(()=>{
  if(routeName()!=='practice'||!activeSession)return;
  const stats=sessionStats(activeSession,Date.now());
  const time=document.querySelector('#metric-time'), speed=document.querySelector('#metric-speed');
  if(time)time.textContent=formatTime(stats.milliseconds); if(speed)speed.textContent=stats.speed;
},500);
onRoute();
