#!/usr/bin/env python3
"""Import local Vision locator output as an explicitly unreviewed work index.

Full modern-book prose stays in ignored .cache. Only index facts, page
locations, and short literal 作/寫 OCR candidates are exported. A match never
assigns a school or upgrades a record to reviewed. Run build:modern afterwards.
"""
import hashlib
import json
import re
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache/modern-shijing/yuan-full-ocr'
SOURCE_HASH = '49be56a9ae517badc002fe930e844ef25f505e98a87db5825414b9b7531aab76'


def read_page(page):
    path = CACHE / f'page-{page:04}.json'
    return json.loads(path.read_text())


def lines(page, minimum_x=.09):
    rows = []
    for obs in sorted(read_page(page)['observations'], key=lambda o: -o['y']):
        if not (minimum_x < obs['x'] < .90 and obs['y'] > .06):
            continue
        if rows and abs(rows[-1][0]['y'] - obs['y']) < .012:
            rows[-1].append(obs)
        else:
            rows.append([obs])
    return [{'page': page, 'y': round(row[0]['y'], 5),
             'x': round(min(o['x'] for o in row), 5),
             'text': ''.join(o['candidates'][0]['text'] for o in sorted(row, key=lambda o: o['x']))}
            for row in rows]


# Index headings and item lists have independent counts. Six 無辭 poems stay
# in source metadata without inventing six practice texts.
header = re.compile(r'^(.*?)條[目日]\s*(\d+)條[、，,\s]*單字\s*(\d+)個')
heads, volumes = [], []
current = None
for page in range(911, 1010):
    for line in lines(page, .10):
        text = line['text']
        if text.startswith('卷'):
            volumes.append({'headingOcr': text, 'firstPoem': len(heads), 'indexPdfPage': page})
        match = header.match(text)
        if match and '總計' not in text:
            current = {'headingOcr': match[1], 'count': int(match[2]),
                       'characters': int(match[3]), 'indexPdfPage': page,
                       'indexPrintPage': page - 25, 'items': []}
            heads.append(current)
            continue
        if not current:
            continue
        # Keep original numbering separately: a duplicate or OCR 0 must not
        # shift every later entry. Position is the stable source-item identity.
        match = re.match(r'^([^［\[【〔L（]{0,7})[［\[【〔L（](.*)$', text)
        if match:
            number, raw = match[1], match[2]
        else:
            match = re.match(r'^\s*([\dIl！]+)\s*[.．、]\s*(.*［?.*］)$', text)
            if not match:
                continue
            number, raw = match[1], match[2]
        if '條目' in raw:
            continue
        lemma = re.sub(r'^[［\[【〔L（]+', '', raw).rstrip('］]】〕」了')
        current['items'].append({'numberOcr': number, 'lemmaOcr': lemma,
                                 'indexPdfPage': page, 'indexPrintPage': page - 25,
                                 'indexY': line['y']})

assert len(heads) == 311
assert len(volumes) == 31
assert sum(h['count'] for h in heads) == 2129
assert sum(h['characters'] for h in heads) == 2483
for h in heads:
    assert len(h['items']) == h['count'], (h['headingOcr'], h['count'], len(h['items']))

# The contents has one printed-page number per poem plus 29 section rows.
# Four repairs below were read from complete scan pages, not inferred from
# surrounding numbers. All other numbers remain locator-level OCR data.
toc = []
for page in range(10, 26):
    for obs in sorted(read_page(page)['observations'], key=lambda o: -o['y']):
        match = re.search(r'[（(](\d+)[)）]', obs['candidates'][0]['text'])
        if match and obs['x'] > .3:
            toc.append({'tocPdfPage': page, 'printPage': int(match[1]), 'y': obs['y']})
toc = toc[2:-5]  # before 周南 and after 殷武: not poem/section locators
for page, y, printed in [(12, .826, 55), (12, .792, 56), (14, .3546, 145)]:
    toc.append({'tocPdfPage': page, 'printPage': printed, 'y': y, 'repair': '逐圖補讀'})
toc.sort(key=lambda row: (row['tocPdfPage'], -row['y']))
for row in toc:
    if row['tocPdfPage'] == 21 and row['printPage'] == 979:
        row['printPage'] = 646
        row['repair'] = '逐圖訂正OCR 979→646'
assert len(toc) == 340
assert all(a['printPage'] <= b['printPage'] for a, b in zip(toc, toc[1:])), 'TOC page order'
section_starts = {v['firstPoem'] for v in volumes[:29]}
cursor = 0
for i, h in enumerate(heads):
    if i in section_starts:
        cursor += 1
    h['toc'] = toc[cursor]
    cursor += 1
assert cursor == 340

corpus = json.loads((ROOT / 'public/corpora/shijing.json').read_text())['documents']
assert len(corpus) == 305
poems, untexted, units = [], [], []
doc_cursor = 0
for i, h in enumerate(heads):
    if '無辭' in h['headingOcr']:
        assert h['count'] == 0
        untexted.append({k: v for k, v in h.items() if k != 'items'})
        continue
    doc = corpus[doc_cursor]
    doc_cursor += 1
    title = doc['title'].split('・')[-1]
    # Align the *complete ordered* source catalogue, then retain its OCR title
    # for audit. Duplicate 柏舟/揚之水/黃鳥 never match across sections by name.
    raw_title = re.sub(r'^[一二三四五六七八九十百、；;—.\s]+', '', h['headingOcr'])
    title_score = SequenceMatcher(None, title, raw_title).ratio()
    start = h['toc']['printPage'] + 25
    end = heads[i + 1]['toc']['printPage'] + 25 if i + 1 < len(heads) else 885
    poem = {'id': doc['id'], 'title': doc['title'], 'number': doc_cursor,
            'sourceHeadingOcr': h['headingOcr'], 'titleMatchScore': round(title_score, 3),
            'titleMapping': '依完整篇序對應；保留OCR篇名備核', 'indexItems': h['count'],
            'sourceCharacters': h['characters'], 'indexPdfPage': h['indexPdfPage'],
            'indexPrintPage': h['indexPrintPage'], 'bodyPdfRange': [start, end],
            'bodyPrintRange': [start - 25, end - 25], 'tocPdfPage': h['toc']['tocPdfPage']}
    poems.append(poem)
    for n, item in enumerate(h['items'], 1):
        units.append({**item, 'id': f'yuan2013-{len(units) + 1:04}',
                      'poemId': doc['id'], 'title': doc['title'], 'number': n,
                      'bodyPdfRange': [start, end], 'bodyPrintRange': [start - 25, end - 25],
                      'status': '索引OCR待校', 'schools': []})
assert doc_cursor == 305
assert len(untexted) == 6
assert len(units) == 2129

# Body matching is a locator only. No full modern commentary enters the
# public index. A missing/ambiguous lemma remains visible rather than dropped.
body_lines = []
for page in range(28, 886):
    body_lines.extend(lines(page))
body_heads = []
for index, line in enumerate(body_lines):
    for match in re.finditer(r'^[〔［【（\[]([^〕］】\]]{1,35})[〕］】\]]', line['text']):
        body_heads.append({'line': index, 'lemmaOcr': match[1], 'page': line['page'], 'y': line['y']})

clean = lambda s: re.sub(r'[^\u3400-\u9fff\U00020000-\U0002ffff]', '', s)
matched = 0
for unit in units:
    start, end = unit['bodyPdfRange']
    options = []
    for j, head in enumerate(body_heads):
        if not start <= head['page'] <= end:
            continue
        score = SequenceMatcher(None, clean(unit['lemmaOcr']), clean(head['lemmaOcr'])).ratio()
        if score >= .66:
            options.append((score, j, head))
    options.sort(key=lambda x: (-x[0], x[1]))
    if not options or (len(options) > 1 and options[0][0] == options[1][0]):
        unit['candidates'] = []
        continue
    score, j, head = options[0]
    finish = body_heads[j + 1]['line'] if j + 1 < len(body_heads) else len(body_lines)
    segment = [line for line in body_lines[head['line']:finish]
               if line['page'] <= min(end, head['page'] + 2)]
    candidates = []
    for line in segment:
        for match in re.finditer(r'(?:作|寫)[“「]([^”」\n]{1,12})[”」]', line['text']):
            word = match[1]
            if not clean(word) or any(c['text'] == word for c in candidates):
                continue
            candidates.append({'text': word, 'pdfPage': line['page'],
                               'printPage': line['page'] - 25,
                               'context': line['text'][max(0, match.start() - 16):match.end() + 16]})
    unit['bodyMatch'] = {'pdfPage': head['page'], 'printPage': head['page'] - 25,
                         'y': head['y'], 'lemmaOcr': head['lemmaOcr'], 'similarity': round(score, 3),
                         'status': '機器定位待核'}
    unit['candidates'] = candidates
    unit['schoolMentions'] = sorted(set(re.findall(r'[齊魯韓](?=詩)', ''.join(line['text'] for line in segment))))
    matched += 1

snapshot = {
    'version': 1, 'sourceId': 'yuan2013', 'sourcePdfSha256': SOURCE_HASH,
    'sourcePdfPages': 1017, 'sourceIndexPdfRange': [911, 1009], 'bodyOcrPdfRange': [28, 885],
    'engine': 'Apple Vision VNRecognizeTextRequest; zh-Hant; local only',
    'policy': '全書索引及作字句的OCR工作底稿；字頭、讀法、否定語、家別和正文定位均待逐圖覆核。空候選不表示無異文。',
    'totals': {'poems': 305, 'untexted': 6, 'indexItems': 2129, 'sourceCharacters': 2483,
               'bodyMatched': matched, 'candidateReadings': sum(len(u['candidates']) for u in units)},
    'tocRepairs': [row for row in toc if row.get('repair')],
    'untexted': untexted, 'poems': poems, 'units': units,
    'ocrHashes': {f'page-{p:04}.json': hashlib.sha256((CACHE / f'page-{p:04}.json').read_bytes()).hexdigest()
                  for p in list(range(10, 26)) + list(range(28, 886)) + list(range(911, 1010))},
}
target = ROOT / 'scripts/snapshots/shijing-yuan-modern.json'
target.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(snapshot['totals'], ensure_ascii=False))
