import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { threeSchoolsData as data, filterThreeSchools, threeSchoolsView, threeSchoolsLink, filterArchive, threeSchoolsArchiveIndex, loadThreeSchoolsArchive, threeSchoolsPilot as pilot, filterThreeSchoolsPilot, hasPilotSchoolClue } from '../src/three-schools.js';
import { parseCommentary } from '../scripts/shijing-commentary.mjs';
import { archiveIndex, archiveText, buildCandidates } from '../scripts/build-shijing-collation.mjs';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

test('ten-poem pilot covers every Yuan index item and anchors extended characters without normalization', async () => {
  const { documents } = JSON.parse(await read('../public/corpora/shijing.json'));
  assert.deepEqual(pilot.poems.map(poem => poem.id), documents.slice(0,10).map(doc => doc.id));
  assert.deepEqual(pilot.poems.map(poem => poem.yuanItems), [9,5,5,2,2,2,2,2,2,4]);
  assert.equal(pilot.entries.length,45);
  assert.equal(pilot.entries.filter(row => row.section === '集校補充').length,9);
  assert.equal(pilot.entries.filter(row => row.yuanIndexItem).length,36);
  assert.equal(new Set(pilot.entries.map(row=>row.yuanIndexItem).filter(Boolean)).size,35);
  assert.equal(pilot.entries.find(row=>row.id==='zhou-nan-034').yuanIndexItem,pilot.entries.find(row=>row.id==='zhou-nan-035').yuanIndexItem);
  const hui=pilot.entries.find(row=>row.id==='zhou-nan-045');
  assert.equal(hui.yuanIndexItem,35);
  assert.ok(hui.readings[0].evidence.some(ref=>ref.sourceId==='yuan2013' && ref.printPages.includes(17)));
  assert.equal(new Set(pilot.entries.map(row => row.id)).size,45);
  for (const row of pilot.entries) {
    const doc = documents.find(doc => doc.id === row.poemId);
    assert.ok(doc.tokens.map(token => token.char).join('').includes(row.baseText), row.id);
    for (const start of row.positions) assert.equal(doc.tokens.slice(start,start + [...row.base].length).map(token => token.char).join(''),row.base);
    assert.match(row.verification,/未全面覆核/);
    for (const reading of row.readings) {
      assert.notEqual(reading.text,row.base);
      for (const ref of reading.evidence) {
        const source = pilot.sources.find(source => source.id === ref.sourceId);
        assert.ok(source);
        assert.deepEqual(ref.pdfPages,ref.printPages.map(page => page + source.pdfOffset));
        if (ref.scope === '三家未分') assert.deepEqual(ref.schools,[]);
        assert.ok(ref.schools.every(school => ['齊','魯','韓'].includes(school)));
      }
    }
  }
  const readings = pilot.entries.flatMap(row => row.readings);
  assert.ok(readings.some(reading => reading.text === '𡝩𡝩'));
  assert.ok(readings.some(reading => reading.text === '覒'));
  assert.equal(readings.filter(reading => reading.glyphStatus === '待辨').length,2);
});

test('pilot retains contradictory attributions and keeps collective and non-school evidence distinct', () => {
  const fen = pilot.entries.find(row => row.lemma === '遵彼汝墳');
  const refs = fen.readings.find(reading => reading.text === '濆').evidence;
  assert.ok(refs.some(ref => ref.schools.includes('韓')));
  assert.ok(refs.some(ref => ref.basis === '歸屬爭議' && !ref.schools.length));
  const chao = pilot.entries.find(row => row.lemma === '調').readings.find(reading => reading.text === '朝');
  assert.ok(chao.evidence.some(ref => ref.schools.includes('韓')));
  assert.ok(chao.evidence.some(ref => ref.schools.includes('魯')));
  assert.equal(filterThreeSchoolsPilot({scope:'disputed'}).length,4);
  const collective = filterThreeSchoolsPilot({school:'三家未分'});
  assert.ok(collective.some(row => row.lemma === '夭夭'));
  assert.ok(!filterThreeSchoolsPilot({school:'齊'}).some(row => row.lemma === '夭夭'));
  assert.ok(filterThreeSchoolsPilot({scope:'other'}).every(row => !hasPilotSchoolClue(row)));
  assert.ok(filterThreeSchoolsPilot({query:'唐石經 鑊',poemId:'shijing-002'})[0].readings.some(reading => reading.evidence.some(ref => ref.schools.includes('魯') && ref.sourceId === 'lu2015')));
});

test('pilot renders without the large archive and offers bounded pages, readable evidence and safe search', () => {
  const html = threeSchoolsView({mode:'pilot'});
  assert.equal((html.match(/data-pilot-id=/gu)||[]).length,40);
  assert.ok(!html.includes('正在載入原書輯錄'));
  assert.match(html,/download="shijing-zhou-nan-pilot.txt"/);
  assert.match(html,/字形待辨/);
  assert.equal((threeSchoolsView({mode:'pilot',page:1}).match(/data-pilot-id=/gu)||[]).length,5);
  const fen = threeSchoolsView({mode:'pilot',query:'zhou-nan-032',school:'韓'});
  assert.match(fen,/PDF 第 216 頁/);
  assert.match(fen,/王氏否定/);
  assert.ok(!threeSchoolsView({mode:'pilot',query:'\"><script>alert(1)</script>'}).includes('<script>'));
});

test('every variant belongs to an existing poem and quotes its actual practice text', async () => {
  const { documents } = JSON.parse(await read('../public/corpora/shijing.json'));
  assert.equal(new Set(data.entries.map(row => row.id)).size, data.entries.length);
  for (const row of data.entries) {
    const doc = documents.find(doc => doc.id === row.poemId);
    assert.ok(doc, row.title);
    assert.equal(doc.title, row.title);
    assert.ok(doc.tokens.map(token => token.char).join('').includes(row.baseText), row.id);
    assert.ok(row.baseText.includes(row.base), row.id);
    assert.notEqual(row.base, row.variant);
    assert.ok(row.schools.length && row.schools.every(school => ['齊', '魯', '韓'].includes(school)));
  }
});

test('direct quotations resolve to the pinned source page, text, and checksum', async () => {
  const files = new Map();
  for (const row of data.entries.filter(row => row.attribution === '古注明引')) {
    assert.deepEqual(row.schools, ['韓']);
    for (const ref of row.references) {
      if (!files.has(ref.file)) {
        const raw = await read('../.cache/corpus-sources/' + ref.file);
        files.set(ref.file, { raw, parsed: parseCommentary(raw) });
      }
      const { raw, parsed } = files.get(ref.file);
      assert.equal(createHash('sha256').update(raw).digest('hex'), ref.sha256);
      assert.ok(parsed.tokens.some(token => token.page === ref.lemmaPage && token.comment === ref.quote), row.id);
      // A wrapped note can begin on the page after its headword.
      assert.ok(raw.includes(`<pb:${ref.quotePage}>`), row.id);
      assert.ok(raw.includes(`<pb:${ref.quoteEndPage}>`), row.id);
      assert.match(ref.quote, /韓詩/);
      assert.ok(ref.url.includes(ref.commit));
    }
  }
});

test('compiled attributions retain uncertainty instead of claiming surviving school originals', () => {
  for (const row of data.entries.filter(row => row.attribution === '清人輯定')) {
    assert.ok(row.references.every(ref => ref.book === '詩三家義集疏' && ref.verification.includes('尚待影印覆核')));
  }
  assert.ok(data.referenceBooks.find(book => book.title === '詩經四家異文考').use.includes('五卷電子轉錄已全錄'));
});

test('search combines poem, school and variant text without treating missing schools as agreement', () => {
  assert.equal(filterThreeSchools({ poemId: 'shijing-001' }).length, 2);
  assert.equal(filterThreeSchools({ poemId: 'shijing-001', school: '韓' }).length, 1);
  assert.equal(filterThreeSchools({ query: '葛覃 射', school: '齊' }).length, 1);
  assert.equal(filterThreeSchools({ query: '嬥嬥' })[0].title, '小雅・小旻之什・大東');
  assert.equal(filterThreeSchools({ poemId: 'shijing-taoyao' }).length, 0);
  assert.match(threeSchoolsView({ mode: 'entries', poemId: 'shijing-taoyao' }), /未收錄不表示沒有異文/);
});

test('view escapes search input and links revised local copies to their catalogue poem', () => {
  const html = threeSchoolsView({ query: '\"><script>bad()</script>' });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.match(threeSchoolsView({mode:'sources'}), /目前不能稱為兩書全部異文總表/);
  assert.match(threeSchoolsView({mode:'sources'}), /家別線索（原書分類／段中提及）/);
  const copy = { id: 'local-copy', title: '人工改名', provenance: { catalogueCopy: { catalogueId: 'shijing-001' } } };
  const before = structuredClone(copy);
  assert.match(threeSchoolsLink(copy), /#shijing-variants\/shijing-001/);
  assert.deepEqual(copy, before);
  assert.equal(threeSchoolsLink({ id: 'sample-1' }), '');
});

test('complete source snapshots preserve every ordered paragraph and its source identity', async () => {
  const source = JSON.parse(await read('../public/collations/shijing-three-schools-archive.json'));
  assert.deepEqual(archiveIndex(source), threeSchoolsArchiveIndex);
  assert.equal(source.volumes.length, 74);
  assert.equal(source.records.length, 17195);
  assert.equal(source.records.filter(row => row.bookId === 'chen').length, 5554);
  assert.equal(source.records.filter(row => row.bookId === 'feng').length, 1273);
  assert.equal(source.records.filter(row => row.bookId === 'yishuo').length, 10368);
  assert.equal(new Set(source.records.map(row => row.sourceParagraphId)).size, source.records.length);
  for (const volume of source.volumes) {
    const rows = source.records.filter(row => row.volumeId === volume.id);
    assert.equal(rows.length, volume.expectedParagraphs, volume.id);
    assert.equal(createHash('sha256').update(rows.map(row => row.text).join('\n')).digest('hex'), volume.textSha256);
    rows.forEach((row, index) => {
      assert.equal(row.number, index + 1);
      assert.equal(row.text, row.lines.map(line => line.text).join(''));
      assert.equal(createHash('sha256').update(JSON.stringify(row.lines)).digest('hex'), row.sha256);
      assert.equal(row.status, '轉錄待校');
      assert.ok(!Object.hasOwn(row, 'schools'), 'mentioning a school is not an attribution');
      if (row.sourceSchool) {
        assert.equal(volume.sourceSchool, row.sourceSchool);
        assert.ok(volume.sourceChapterName.startsWith(row.sourceSchool + '詩遺說攷'));
        assert.match(row.schoolBasis, /分卷歸類/);
      }
    });
  }
  for (let volume = 1; volume <= 5; volume++) {
    const heading = source.records.find(row => row.volumeId === `chen-v${volume}`);
    assert.match(heading.text, /詩經四家異文攷/);
  }
  assert.equal(archiveText(source), await read('../public/collations/shijing-three-schools-archive.txt'));
  assert.ok(source.records.some(row => row.lines.some(line => line.type === 2)));
  assert.ok(source.records.some(row => row.lines.some(line => line.type === 3 && line.pageId)));
  for (const [school,count] of [['魯',4417],['齊',2709],['韓',3225]]) {
    assert.equal(source.records.filter(row => row.sourceSchool === school).length, count);
  }
  assert.equal(source.scanSources.files.length, 10);
  assert.equal(source.scanSources.files.reduce((sum,file) => sum + file.pages, 0), 1547);
  for (const scan of source.scanSources.files) {
    assert.ok(scan.url.startsWith('https://upload.wikimedia.org/wikipedia/commons/'));
    assert.match(scan.sha1, /^[a-f0-9]{40}$/u);
  }
});

test('tentative quotations are anchored in actual tokens without assigning families or dropping raw evidence', async () => {
  const source = JSON.parse(await read('../public/collations/shijing-three-schools-archive.json'));
  const { documents } = JSON.parse(await read('../public/corpora/shijing.json'));
  const normalized = text => [...text.normalize('NFKC')].filter(char => /\p{Script=Han}/u.test(char));
  const records = new Map(source.records.map(row => [row.id, row]));
  for (const candidate of source.candidates) {
    const doc = documents.find(doc => doc.id === candidate.poemId);
    assert.equal(doc.tokens.slice(candidate.position, candidate.position + [...candidate.siteQuote].length).map(token => token.char).join(''), candidate.siteQuote);
    const left = normalized(candidate.siteQuote), right = normalized(candidate.sourceQuote);
    assert.equal(left.length, right.length);
    assert.equal(left.filter((char, index) => char !== right[index]).length, 1);
    assert.ok(records.get(candidate.recordId).lines.filter(line => line.type === 1).map(line => line.text).join('').includes(candidate.sourceQuote));
    assert.equal(candidate.status, '自動對句・待核');
    assert.ok(!Object.hasOwn(candidate, 'schools'));
  }
  // Punctuation must not make a three-character prefix look one letter away.
  const fixture = [{ id: 'p', title: '例', tokens: [...'，君子好逑。'].map(char => ({ char })) }];
  const rows = [{ id: 'r', lines: [{ type: 1, text: '君子好仇。' }] }];
  assert.equal(buildCandidates(rows, fixture)[0].siteQuote, '君子好逑');
  assert.equal(buildCandidates(rows, [{ ...fixture[0], tokens: [...'，君子好。'].map(char => ({ char })) }]).length, 0);
  const mao = source.records.find(row => row.id === 'chen-v1-p0007');
  assert.match(mao.text, /毛氏古文/);
  assert.deepEqual(mao.familiesMentioned, []);
});

test('archive filters, bounded pages, and downloads expose the full transcription independently of the table', async () => {
  const source = JSON.parse(await read('../public/collations/shijing-three-schools-archive.json'));
  assert.equal(filterArchive(source).length, 17195);
  assert.equal(filterArchive(source, { book: 'chen' }).length, 5554);
  assert.equal(filterArchive(source, { query: 'chen-v1-p0007' })[0].text.includes('毛氏古文'), true);
  assert.ok(filterArchive(source, { school: '韓' }).every(row => row.sourceSchool === '韓' || row.familiesMentioned.includes('韓')));
  const attributed = filterArchive(source, { book: 'yishuo', school: '韓' });
  assert.ok(attributed.length >= 3225);
  assert.ok(attributed.some(row => !row.familiesMentioned.includes('韓')));
  assert.ok(filterArchive(source, { mode: 'candidates', poemId: 'shijing-001' }).every(row => row.poemId === 'shijing-001'));
  const first = threeSchoolsView({ mode: 'sources' }, source);
  assert.equal((first.match(/class="collation-record"/gu) || []).length, 40);
  assert.ok(!first.includes('data-record-id="chen-v1-p0041"'));
  assert.match(threeSchoolsView({ mode: 'sources', page: 1 }, source), /data-record-id="chen-v1-p0041"/);
  assert.match(threeSchoolsView({ mode: 'sources', page: 1e9 }, source), /data-record-id="yishuo-v58-p0113"/);
  assert.match(first, /download="shijing-three-schools-archive.txt"/);
  assert.match(first, /公開影印：十冊、1547/);
  assert.match(threeSchoolsView({ mode: 'sources', book: 'yishuo', school: '韓' }, source), /原書編入韓詩 · 陳氏輯定/);
  assert.match(threeSchoolsView({ mode: 'candidates', poemId: 'shijing-001' }, source), /家別未據此判定/);
  const unsafe = structuredClone(source);
  unsafe.records[0].lines.find(line => line.type === 1).text = '<script>bad()</script>';
  assert.ok(!threeSchoolsView({mode:'sources'}, unsafe).includes('<script>'));
  let calls = 0;
  await assert.rejects(loadThreeSchoolsArchive(async () => ({ ok: false })), /載入失敗/);
  const fetcher = async url => { calls++; assert.match(url, /\/collations\/shijing-three-schools-archive.json$/); return { ok: true, json: async () => source }; };
  const [a, b] = await Promise.all([loadThreeSchoolsArchive(fetcher), loadThreeSchoolsArchive(fetcher)]);
  assert.equal(a, b);
  assert.equal(calls, 1);
});
