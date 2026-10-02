export const STORAGE_KEY = 'tshet-unh-practice:v1';
export const defaultSettings = { variant: 'three', keyMode: 'full-highlight', showPosition: true, showFull: true, showParts: true };
const modes = ['qwerty', 'full-highlight', 'full-plain', 'current-highlight', 'current-plain'];

export function cleanSettings(input = {}) {
  return { variant: input.variant === 'full' ? 'full' : 'three',
    keyMode: modes.includes(input.keyMode) ? input.keyMode : defaultSettings.keyMode,
    ...Object.fromEntries(['showPosition', 'showFull', 'showParts'].map(k => [k, typeof input[k] === 'boolean' ? input[k] : true])) };
}

export function loadState(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { data: null, error: '' };
    const data = JSON.parse(raw);
    if (data.version !== 1 || !Array.isArray(data.documents) || !Array.isArray(data.history)) throw new Error('資料結構無效');
    return { data, error: '' };
  } catch { return { data: null, error: '本機資料無法讀取。現有資料未被覆寫；可先匯出復原副本，再重設儲存。' }; }
}

export function saveState(storage, data) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: 1 })); return ''; }
  catch { return '瀏覽器無法保存資料，可能是儲存空間不足或儲存權限關閉。請匯出語料備份。'; }
}
