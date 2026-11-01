const modes = new Set(['modern','index','pilot','sources','candidates','entries']);

export function parseShijingRoute(hash) {
  const [path, search = ''] = hash.split('?');
  const [, part = '', poem = ''] = path.split('/');
  const params = new URLSearchParams(search);
  return {mode: modes.has(part) ? part : 'modern', poemId: modes.has(part) ? poem : part,
    query:params.get('q') || '', school:params.get('school') || '',
    scope:params.get('scope') || '', book:params.get('book') || '',
    page:Math.max(0, Math.floor(Number(params.get('page')) || 0))};
}

export function shijingRoute(filter) {
  const mode = modes.has(filter.mode) ? filter.mode : 'modern';
  const path = '#shijing-variants' + (mode === 'modern' ? '' : '/' + mode)
    + (filter.poemId ? '/' + encodeURIComponent(filter.poemId) : '');
  const params = new URLSearchParams();
  for (const [key, field] of [['q','query'],['school','school'],['scope','scope'],['book','book']]) {
    if (filter[field]) params.set(key, filter[field]);
  }
  if (filter.page > 0) params.set('page', String(Math.floor(filter.page)));
  return path + (params.size ? '?' + params : '');
}
