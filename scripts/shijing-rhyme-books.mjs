// Parse the pinned transcriptions as data; never run their repository scripts.
export function parseRhymeCsv(input) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quoted && input[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (c === ',' || c === '\n')) {
      row.push(field.replace(/\r$/, '')); field = '';
      if (c === '\n') { rows.push(row); row = []; }
    } else field += c;
  }
  if (quoted) throw new Error('韻書 CSV 引號未結束');
  if (field || row.length) rows.push([...row, field.replace(/\r$/, '')]);
  const headers = rows.shift();
  return rows.filter(row => row.some(Boolean)).map(row => {
    if (row.length !== headers.length) throw new Error('韻書 CSV 欄數不符');
    return Object.fromEntries(headers.map((header, i) => [header, row[i]]));
  });
}

export function validateRhymeReference(reference, rows) {
  const found = rows.find(row => reference.file === 'qieyun-wang3.csv'
    ? row['鈴木ID'] === reference.entryId
    : `${row['小韻號']}.${row['小韻字號']}` === reference.entryId);
  if (!found || found['字頭'] !== reference.char || found['反切'] !== reference.fanqie ||
      (found['地位'] || found['音韻地位']) !== reference.position || found['釋義'] !== reference.quote) {
    throw new Error(`詩經韻書引文失效：${reference.file} ${reference.entryId}`);
  }
  return found;
}
