import { test } from 'node:test';
import assert from 'node:assert/strict';
import TshetUinh from 'tshet-uinh';
import { convertReading } from '../src/polyhedron.js';
import { romanizePolyhedron } from '../src/polyhedron-scheme.js';
import { inspectToken, suggestions, hasReadingAlternatives, parseImport, exportDocument } from '../src/corpus.js';

test('source-only Tang positions round-trip without silently confirming arbitrary imports', () => {
  const rows = [
    ['隨', 'zsjye', '船合三支平'], ['翠', 'cjyih', '章合三脂去'],
    ['近', 'ginx', '羣開三B真上'], ['行', 'ngrang', '疑開二庚平'],
    ['淮', 'ghruaix', '匣合二皆上'], ['藎', 'zsinh', '邪開三真去'],
  ];
  for (const [char, source, position] of rows) {
    const token = convertReading(char, source, { includeUnattestedPositions: true });
    assert.deepEqual(token.positions, [position]);
    assert.equal(romanizePolyhedron(TshetUinh.音韻地位.from描述(position)), source);
    assert.equal(token.conversion, 'unattested');
    assert.notEqual(inspectToken(token).status, 'ready');
    assert.deepEqual(convertReading(char, source).positions, []);
  }
  for (const source of ['tab', 'gop', 'gu', 'tiung', 'zjyok', 'ziin', 'ghaung', 'keih', '???']) {
    assert.deepEqual(convertReading('字', source, { includeUnattestedPositions: true }).positions, []);
  }
});

test('suggestions keep selected, source and dictionary readings distinct through export', () => {
  const token = { char: '將', positions: ['清開三陽平'], position: '精開三陽平', confirmed: true, sourceReading: 'chiang' };
  const [doc] = parseImport(JSON.stringify({ tokens: [token] }), 'json');
  const choices = suggestions(parseImport(JSON.stringify(exportDocument(doc)), 'json')[0].tokens[0]);
  assert.equal(choices.find(r => r.position === '精開三陽平').full, 'tsvang');
  assert.ok(choices.find(r => r.position === '精開三陽平').origins.includes('selected'));
  assert.ok(choices.find(r => r.position === '精開三陽平').origins.includes('dictionary'));
  assert.deepEqual(choices.find(r => r.position === '清開三陽平').origins, ['annotation']);
  assert.equal(new Set(choices.map(r => r.position)).size, choices.length);

  const selectedOnly = suggestions({ char: '隨', positions: [], position: '船合三支平', confirmed: true });
  assert.ok(selectedOnly.some(r => r.position === '船合三支平' && r.origins.includes('selected')));
  assert.equal(hasReadingAlternatives(token), true);
  assert.equal(hasReadingAlternatives({ char: '𠮷', sourceReading: 'leu/lek' }), true);
  assert.equal(hasReadingAlternatives({ char: '𠮷', sourceReading: 'leu/unknown' }), false);
  assert.equal(hasReadingAlternatives({ char: '。' }), false);
});
