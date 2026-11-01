// Hand checked against the user's scans. OCR is a locator, never the source of a reading.
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const corpus = JSON.parse(await readFile(new URL('public/corpora/shijing.json', root), 'utf8')).documents.slice(0, 10);
const sources = [
  { id: 'yuan2013', title: '詩經異文彙考辨證', author: '袁梅', year: 2013, publisher: '齊魯書社', isbn: '9787533325664', pdfOffset: 25, use: '逐圖核對正文印刷頁3–17，覆蓋附錄索引35個條目，拆為36筆網站記錄；以自己的摘要記錄異文及證據。' },
  { id: 'lu2015', title: '詩經集校集注集評', author: '魯洪生主編', year: 2015, publisher: '現代出版社、 中華書局', volume: 1, isbn: '9787514333343', pdfOffset: 22, use: '補查卷一集校與相關集注；另增9筆記錄，並保留所引學者的歸屬分歧，未全錄本書前十首所有校記。' },
];
const evidence = (sourceId, pages, witness, schools = [], basis = '其他傳本', note = '', scope = schools.length ? '分家' : '未定') => ({
  sourceId, printPages: Array.isArray(pages) ? pages : [pages],
  pdfPages: (Array.isArray(pages) ? pages : [pages]).map(page => page + sources.find(s => s.id === sourceId).pdfOffset),
  witness, schools, scope, basis, note,
});
const Y = (...args) => evidence('yuan2013', ...args);
const L = (...args) => evidence('lu2015', ...args);
const reading = (text, ...evidence) => ({ text, evidence });
let number = 0;
const entry = (poem, lemma, baseText, base, readings, note = '', disputed = false) => ({
  id: `zhou-nan-${String(++number).padStart(3, '0')}`,
  poemId: corpus[poem - 1].id, title: corpus[poem - 1].title,
  lemma, baseText, base, readings, note, disputed, section: number <= 35 ? '袁書索引' : '集校補充',
  verification: '現代整理頁已逐圖核字；所引古籍、石經及簡帛原件尚未全面覆核。',
});
const entries = [
  entry(1, '關關', '關關雎鳩', '關', [reading('𠴨', Y(3, '《玉篇》', [], '其他傳本', '口、官構形；只記異字，不據後起字的判斷改動正文。'))]),
  entry(1, '洲', '在河之洲', '洲', [reading('州', Y(3, '《說文》引詩'), L(15, '轉引陳喬樅《異文考》', [], '古今字判斷', '陳氏判為毛氏古文，不能由本條直接推出三家皆同。'))], '與先前《集疏》輯定表分開保存，保留輯者不同判斷。'),
  entry(1, '逑', '君子好逑', '逑', [
    reading('仇', Y([3, 4], '《釋文》異本、《禮記·緇衣》等引詩'), L(20, '漢石經魯詩殘碑（本書記錄）', ['魯'], '整理本記實物', '尚未核對殘碑拓片；《釋文》也記毛本作仇，並非魯詩獨有。')),
    reading('求', L(21, '陳壽祺、陳喬樅《遺說考》據《文選·西都賦》六臣注', ['韓'], '清人推定', '依唐代存書情況推定家別，非引文明言韓詩。')),
    reading('雔', Y(4, '高亨《文字形義學概論》', [], '訓詁校改', '本字說，袁書保留待考；不當作已見某家經文。')),
  ]),
  entry(1, '荇', '參差荇菜', '荇', [reading('莕', Y(4, '《釋文》異本、《爾雅》')), reading('䓷', Y(4, '《五經文字》《類篇》引《說文》', [], '其他傳本', '保留從艸、洐的字形，不能用普通荇字代替。'))]),
  entry(1, '左右流之', '左右流之', '流', [reading('摎', Y([4, 5], '馬瑞辰《毛詩傳箋通釋》', [], '訓詁校改', '流通作摎是訓詁通假說；所引張衡傳注並非直接引本句異文。'))], '與「左右芼之」原書合論，按附錄索引分列，避免把解字材料冒充三家經文。'),
  entry(1, '左右芼之', '左右芼之', '芼', [
    reading('覒', Y(5, '袁書列《韓詩》', ['韓'], '整理本列家別'), L(32, '《玉篇》引詩、陳《稽古編》', [], '其他傳本')),
    reading('毛', Y(5, '馬瑞辰《通釋》所舉省體'), L(32, '敦煌詩卷斯1722')),
  ], '覒從毛、見；OCR多次誤為現，已據頁圖訂正。'),
  entry(1, '服', '寤寐思服', '服', [reading('𠬝', Y([5, 6], '桂馥、馬瑞辰引《說文》說服的假借', [], '訓詁校改', '只記本字及訓義說；本條沒有明列作𠬝的三家傳本。'))]),
  entry(1, '輾', '輾轉反側', '輾', [reading('展', Y(6, '袁書列《韓詩》《魯詩》', ['韓', '魯'], '整理本列家別'), L(29, '《釋文》、敦煌詩卷斯1722', [], '其他傳本', '毛詩異本亦作展，不能視作三家專有。'))]),
  entry(1, '鍾鼓', '鍾鼓樂之', '鍾鼓', [
    reading('鼓鐘', Y(6, '袁書列《韓詩》', ['韓'], '整理本列家別'), L(34, '《韓詩外傳》', ['韓'], '整理本轉引古書', '此項含詞序變換，須保留兩字。')),
    reading('鐘鼓', Y(6, '明監本'), L(34, '監本毛詩等字形說')),
  ]),
  entry(2, '覃', '葛之覃兮', '覃', [reading('蕈', Y(7, '《釋文》《五經文字》《九經字樣》'), L(47, '陸德明《音義》異本')), { ...reading('〔覃之又作字，待辨〕', Y(7, '《釋文》又作本', [], '字形待辨', '頁面有另一構形，尚未確定對應碼位；不沿用OCR誤字。')), glyphStatus: '待辨' }]),
  entry(2, '維', '維葉萋萋', '維', [reading('惟', Y(7, '袁書列《韓詩》', ['韓'], '整理本列家別'), L(47, '王先謙《集疏》', ['韓'], '清人推定'))]),
  entry(2, '灌', '集于灌木', '灌', [reading('樌', Y(7, '《釋文·爾雅音義》'), L(49, '王先謙《集疏》', ['魯'], '清人推定', '王氏作「亦作」，不代表魯詩只有這一字形。'))]),
  entry(2, '濩', '是刈是濩', '濩', [reading('鑊', Y([7, 8], '《唐石經》'), L(52, '王先謙《集疏》所輯魯說', ['魯'], '清人推定'))], '唐石經的異字證據與清人判為魯詩的證據分存，不能由字形相同互相替代。'),
  entry(2, '斁', '服之無斁', '斁', [reading('射', Y(8, '《爾雅》及《禮記》引詩'), L(52, '王先謙《集疏》所輯齊說', ['齊'], '清人推定')), reading('𤢕', Y(8, '《釋文》又作本', [], '其他傳本', '犭、睪構形；異體不移植讀音。'))]),
  entry(3, '虺隤', '我馬虺隤', '虺隤', [
    reading('㾯頹', Y([8, 9], '《釋文》所引《說文》', [], '其他傳本', '袁書指出與今本《說文》不同，可能有傳鈔問題。'), L(71, '陸德明《音義》')),
    reading('㾯㿉', Y([8, 9], '袁梅據病義提出的正字說', [], '訓詁校改', '首字從疒、畏，次字從疒、貴；與《釋文》所引㾯頹分列，不用正字主張覆寫引文。')),
  ]),
  entry(3, '姑', '我姑酌彼金罍', '姑', [reading('夃', Y(9, '《說文》引詩'), L(71, '許慎《說文》引詩'))]),
  entry(3, '岡', '陟彼高岡', '岡', [reading('崗', Y(9, '玄應《一切經音義》《文選》注等引詩'))]),
  entry(3, '兕觥', '我姑酌彼兕觥', '兕觥', [reading('光觵', Y(9, '《釋文》字頭及異體說'), L(73, '陸德明《音義》')), reading('光觥', Y(9, '袁書所列古今字組合')), reading('兕觵', Y(9, '袁書所列古今字組合'))], '古文字與篆體圖形未強行換成楷書碼位；只錄可核實的楷體組合。'),
  entry(3, '吁', '云何吁矣', '吁', [reading('盱', Y(9, '《爾雅》郭注引詩'), L(76, '王先謙《集疏》', ['魯'], '清人推定')), reading('𢖳', Y(9, '《釋文·爾雅音義》或作本及本字說', [], '其他傳本', '從心、于，OCR常誤認為忏。'))]),
  entry(4, '樛', '南有樛木', '樛', [reading('朻', Y(10, '袁書引《釋文》馬融、韓詩本', ['韓'], '整理本轉引古注'), L(86, '《釋文》馬融、韓詩本', ['韓'], '整理本轉引古注'), L(87, '胡承珙《後箋》據馬融習魯詩而推', ['魯'], '清人推定', '胡氏用疑字提出，與韓詩本明列的層次不同。'))]),
  entry(4, '縈', '葛藟縈之', '縈', [reading('𢄋', Y(10, '《釋文》字頭')), reading('𦾵', Y(10, '《說文》引詩'), L(92, '王先謙《集疏》', ['魯', '韓'], '清人推定')), reading('褮', Y(10, '《說文》讀若本句', [], '訓詁校改', '此為讀若所涉字，不當作直接引詩的傳本文字。'))]),
  entry(5, '詵詵', '詵詵兮', '詵詵', [
    reading('𨐔𨐔', Y(11, '《釋文》引《說文》及袁氏重文推測', [], '訓詁校改'), L(102, '王先謙《集疏》概稱三家', [], '清人推定', '原書概稱三家，未分列齊魯韓三份證據。', '三家未分')),
    reading('兟兟', Y(11, '《玉篇》《五經文字》及袁氏古文推測', [], '訓詁校改')),
    reading('莘莘', Y(11, '《文選》注引毛傳', [], '其他傳本', '引文為毛傳訓釋，並非三家經文的獨立證明。')),
  ]),
  entry(5, '繩繩', '繩繩兮', '繩繩', [reading('憴憴', Y(11, '《爾雅》', [], '其他傳本', '僅憑此處不能分定家別。'))]),
  entry(6, '夭夭', '桃之夭夭', '夭夭', [reading('枖枖', Y([11, 12], '《說文》引詩，袁書概稱三家', [], '整理本列家別', '未分列三家，各家範圍待核。', '三家未分')), reading('𡝩𡝩', Y(12, '《說文》《廣雅》，袁書概稱三家', [], '整理本列家別', '女、芺構形，不隨OCR誤作媄。', '三家未分'))]),
  entry(6, '蓁蓁', '其葉蓁蓁', '蓁蓁', [reading('溱溱', Y(12, '王應麟《詩攷》引《通典·禮十九》'))]),
  entry(7, '兔', '肅肅兔罝', '兔', [reading('菟', Y(12, '《釋文》字頭及又作本'))]),
  entry(7, '逵', '施于中逵', '逵', [reading('馗', Y([12, 13], '《文選》注引《韓詩》及薛君章句', ['韓'], '整理本轉引古注'), L(137, '李善《文選》注引《韓詩》', ['韓'], '整理本轉引古注'))]),
  entry(8, '芣苢', '采采芣苢', '芣苢', [reading('芣苡', Y(13, '《釋文》及《文選·辯命論》注引韓詩', ['韓'], '整理本轉引古注'), L(150, '陸德明《音義》異本', [], '其他傳本', '毛詩異本也作苡，並非韓詩專有。')), reading('桴苡', Y(13, '《逸周書》'))]),
  entry(8, '襭', '薄言襭之', '襭', [reading('擷', Y(13, '《釋文》字頭及一本'), L(154, '《釋文》及敦煌詩卷斯3951')), reading('纈', L(154, '敦煌詩卷斯1722'))]),
  entry(9, '息', '不可休息', '息', [reading('思', Y([14, 15], '袁書列韓詩，並引《韓詩外傳》《詩集傳》', ['韓'], '整理本列家別'), L(164, '季《解頤》列韓詩', ['韓'], '整理本列家別'), L(164, '轉引陳《稽古編》對今本外傳的質疑', [], '歸屬爭議', '陳氏認為今本外傳可能受後人據意改字；不能只採其中一說。'))], '袁氏取休思；《集校》同時保留取休息及質疑韓詩引文的意見。', true),
  entry(9, '永', '江之永矣', '永', [reading('漾', Y(15, '《文選·登樓賦》注引韓詩及薛君', ['韓'], '整理本轉引古注'), L(167, '李善《文選》注引韓詩', ['韓'], '整理本轉引古注')), reading('羕', Y(15, '《說文》引詩及袁氏的韓詩本字說', ['韓'], '本字推定', '韓詩引文實作漾；羕是本字及所據系統的推定，不等同直接韓詩引文。'))]),
  entry(10, '遵彼汝墳', '遵彼汝墳', '墳', [reading('濆', Y([15, 16], '《詩地理攷》《後漢書·周磐傳》注所引韓詩', ['韓'], '整理本轉引古注'), L(194, '轉引馬瑞辰據《後漢書》注判韓詩', ['韓'], '清人推定'), L(194, '轉引王先謙《集疏》', [], '歸屬爭議', '王氏否定陳喬樅概稱三家今文，判濆為毛詩異文。')), reading('坋', L(190, '胡承珙《後箋》據大防義提出', [], '訓詁校改'))], '保留韓詩引文線索及王氏的反對，不歸併為「三家均作濆」。', true),
  entry(10, '惄', '惄如調飢', '惄', [reading('愵', Y(16, '袁書列《韓詩》', ['韓'], '整理本列家別'), L(190, '《釋文》引韓詩、《稽古編》據《玉海》校字', ['韓'], '整理本轉引古注', '溺是陳氏所議傳鈔字，與其取愵的判斷分列。')), reading('𢞔', Y(16, '《釋文》又作本、《玉篇》或作愵', [], '其他傳本')), reading('溺', L(190, '陳《稽古編》記《釋文》傳本', ['韓'], '傳鈔待辨', '陳氏判為愵的傳寫之誤，不作確定韓詩原字。'))]),
  entry(10, '調', '惄如調飢', '調', [
    reading('輖', Y(16, '《蜀石經》《說文鈔》《五音韻譜》引詩'), L(190, '《釋文》及敦煌詩卷斯3951')),
    reading('朝', Y(16, '袁書列《韓詩》', ['韓'], '整理本列家別'), L(190, '王先謙《集疏》列魯詩', ['魯'], '清人推定', '家別與袁書不同，須並存而非改成同一歸屬。')),
    reading('周', L(190, '王先謙《集疏》列齊詩', ['齊'], '清人推定')),
    { ...reading('〔朝之古文，待辨〕', Y(16, '《說文》朝的古文及袁氏本字說', [], '字形待辨', '此字尚未確定對應碼位，不能用形近的𣆪代替，也不直接當作韓詩引文。')), glyphStatus: '待辨' },
  ], '原正文合列調飢；依附錄索引把調與飢分列。朝的韓、魯歸屬有分歧。', true),
  entry(10, '飢', '惄如調飢', '飢', [reading('饑', Y(16, '袁書記一作饑並辨義', [], '其他傳本', '袁氏不取饑；採錄異體事實不表示同意其校改。'))]),
  // Supplements found in the second book, outside the 35 Yuan index items.
  entry(1, '雎', '關關雎鳩', '雎', [reading('鴡', L(15, '何楷《古義》列韓詩、《爾雅》《左傳》', ['韓'], '明人推定')), reading('睢', L(15, '敦煌詩卷斯1722'))]),
  entry(1, '參', '參差荇菜', '參', [reading('槮', L(23, '《說文》引詩'))]),
  entry(3, '砠', '陟彼砠矣', '砠', [reading('岨', L(75, '《說文》引詩、王先謙《集疏》', ['齊', '韓'], '清人推定'))]),
  entry(3, '瘏', '我馬瘏矣', '瘏', [reading('屠', L(75, '阜陽詩簡S001、《釋文》異本'), L(75, '本書轉述陳喬樅的魯詩說', ['魯'], '轉述待核', '與已收《四家異文考》原文對古今文的表述須再核；暫不裁定魯詩原字。'))], '阜陽漢簡的用字本身不自動證明魯詩家法。', true),
  entry(3, '痡', '我僕痡矣', '痡', [reading('鋪', L(76, '《釋文》異本、段玉裁《小學》'))]),
  entry(5, '斯', '螽斯羽', '斯', [reading('蟴', L(102, '王先謙《集疏》據《衆經音義》等', [], '清人推定', '原書概稱三家，未分列各家引證。', '三家未分'))]),
  entry(5, '薨薨', '薨薨兮', '薨薨', [reading('翃翃', L(106, '王先謙《集疏》據舍人本及《廣雅》', ['韓'], '清人推定', '清人據雄、翃等字形關係所作校定，並非現存韓詩原本。')), reading('𦐌𦐌', L(106, '王氏列翃的或體', ['韓'], '清人推定', '羽、厷構形，與翃分碼保留。'))]),
  entry(7, '赳赳', '赳赳武夫', '赳赳', [reading('糾糾', L(133, '《後漢書·桓榮傳》注引謝承《後漢書》'))]),
  entry(9, '方', '不可方思', '方', [reading('舫', L(167, '敦煌詩卷斯3951'))]),
  entry(10, '燬', '王室如燬', '燬', [reading('𤈦', Y(17, '《韓詩外傳》引詩及《說文》引詩', ['韓'], '整理本轉引古書', '袁氏據《韓詩外傳》判《說文》此引本韓詩；保留其判斷層次。'), L(197, '《後漢書》李賢注所引韓詩及薛君章句', ['韓'], '整理本轉引古注'))]),
];

// The index is not identical to the website row count: 調 and 飢 share one
// source item; 王室如燬 is Yuan's fourth 汝墳 item, on the following page.
for (const row of entries) {
  const n = Number(row.id.slice(-3));
  if (n <= 35) row.yuanIndexItem = n <= 33 ? n : 34;
  if (n === 45) { row.yuanIndexItem = 35; row.section = '袁書索引'; }
}

// Anchoring is literal: no Unicode normalization or silent replacement of the practice text.
for (const row of entries) {
  const doc = corpus.find(doc => doc.id === row.poemId);
  const text = doc.tokens.map(token => token.char).join('');
  assert.ok(text.includes(row.baseText), `${row.id}: source phrase absent from site`);
  assert.ok(row.baseText.includes(row.base), row.id);
  row.positions = [];
  for (let start = 0; start < doc.tokens.length; start++) {
    if (doc.tokens.slice(start, start + [...row.base].length).map(token => token.char).join('') === row.base) row.positions.push(start);
  }
  assert.ok(row.positions.length, row.id);
  for (const item of row.readings) {
    assert.notEqual(item.text, row.base, row.id);
    assert.ok(item.evidence.length, row.id);
    for (const ref of item.evidence) {
      assert.ok(ref.pdfPages.every((page, i) => page === ref.printPages[i] + sources.find(s => s.id === ref.sourceId).pdfOffset));
      if (ref.scope === '三家未分') assert.deepEqual(ref.schools, []);
    }
  }
}
assert.equal(new Set(entries.map(row => row.yuanIndexItem).filter(Boolean)).size, 35);
assert.equal(entries.filter(row => row.section === '袁書索引').length, 36);
const poems = corpus.map((doc, i) => ({
  id: doc.id, title: doc.title, number: i + 1,
  yuanItems: new Set(entries.filter(row => row.poemId === doc.id).map(row => row.yuanIndexItem).filter(Boolean)).size,
  yuanRecords: entries.filter(row => row.poemId === doc.id && row.yuanIndexItem).length,
  supplementItems: entries.filter(row => row.poemId === doc.id && row.section === '集校補充').length,
  records: entries.filter(row => row.poemId === doc.id).length,
}));
assert.deepEqual(poems.map(p => p.yuanItems), [9, 5, 5, 2, 2, 2, 2, 2, 2, 4]);
const result = {
  version: 2, editedOn: '2026-10-31', title: '周南前十首異文試輯',
  coverage: '《關雎》至《汝墳》十首。袁書35個索引條目拆作36筆，再從《集校》補充9筆，共45筆校讀記錄；不是兩部書全部校記，也不是45筆均屬三家異文。',
  verification: '袁書正文印刷頁3–17（PDF第28–42頁）已逐頁看圖；《集校》核對各條引用頁。這是現代整理本的校讀小樣，所引古籍、石經及簡帛原件未全面覆核。',
  corrections: ['第二版訂正：調、飢共用袁書「調飢」索引項；「王室如燬」見印刷頁17，改列袁書索引。總記錄仍為45筆。'],
  textPolicy: '本站正文與讀音不變。讀若、假借、本字說與實見傳本文字分開記錄；不從異體字自動推音。',
  attributionPolicy: '每個異文各存引本、家別、推定者和雙頁碼；三家未分不展開成齊魯韓三條確證。家別有爭議時並列各說，不以多數決歸併。',
  glyphPolicy: '擴展區楷字按掃描構形保留；篆文圖形未強行楷定。OCR的現／覒、痕／㾯、天／夭等已人工分辨；有疑的古文字楷定另標待核。',
  sources, poems, entries,
};
const label = ref => ref.scope === '三家未分' ? '三家未分' : ref.schools.length ? ref.schools.map(s => s + '詩').join('、') : '未定家別';
const text = [result.title, result.coverage, result.verification, result.textPolicy, result.attributionPolicy, '',
  ...sources.map(s => `${s.id}: ${s.author}《${s.title}》${s.volume ? '卷' + s.volume : ''}，${s.publisher}，${s.year}。`), '',
  ...poems.flatMap(poem => [poem.title, ...entries.filter(row => row.poemId === poem.id).flatMap(row => [
    `[${row.id}] ${row.lemma}（${row.section}${row.disputed ? '；有分歧' : ''}）`, `本站：${row.baseText}；對照字：${row.base}`,
    ...row.readings.flatMap(item => [`  ${row.base} → ${item.text}`, ...item.evidence.map(ref => `    ${label(ref)}／${ref.basis}；${ref.witness}。${ref.sourceId} 印刷頁${ref.printPages.join('、')}；PDF第${ref.pdfPages.join('、')}頁。${ref.note}`)]),
    ...(row.note ? [`說明：${row.note}`] : []), '',
  ])]),
].join('\n').trimEnd() + '\n';
for (const [path, content] of [
  ['src/data/shijing-zhou-nan-pilot.json', JSON.stringify(result, null, 2) + '\n'],
  ['public/collations/shijing-zhou-nan-pilot.txt', text],
]) {
  if (process.argv.includes('--check')) assert.equal(await readFile(new URL(path, root), 'utf8'), content, `${path} stale`);
  else await writeFile(new URL(path, root), content);
}
console.log(`十首試輯：${poems.length}首，袁書35個索引項／36筆＋補充9筆＝${entries.length}筆，${entries.filter(r => r.disputed).length}筆標有分歧。`);
