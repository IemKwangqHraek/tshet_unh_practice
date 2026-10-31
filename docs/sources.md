# 資料來源

## 本地方案與鍵位

`src/scheme.js` 是 TU3K 倉庫 `prengQvm.js` 的函數包裝快照，使用相同的全拼、三段與三拼推導規則。來源提交為 `f68b7f0b690f00a6134715b348d99cfe72123213`；雜湊、資料數量與採用的「韻」讀音記錄在 [snapshot.json](snapshot.json)。

鍵表來自 `config/keyboards/default.json`，固定音節表來自 `data/positions.tsv`。3,809 個音節為已驗證的 3,808 個音韻地位加本方案補充「怎」，不宣稱覆蓋所有理論音韻地位。有效的導入讀音也會加入當次候選篩選。

2026-10-31 同步莊組蒸韻 B 拼式：7 個地位的 `rv` 改為 `ri`，如色 `srik`、測 `tshrik`、側 `tsrik`；知組仍用 C 拼式，如陟 `trvk`。三拼配鍵不變，音節快照與方案同時更新。語料保存音韻地位，載入與練習時依現行方案推導；恢復未完成進度時也會更新尚未完成的字音。已完成的歷史成績保留當時答案與錯鍵紀錄。

本方案原始上游為 [IemKwangqHraek/prengQvm](https://github.com/IemKwangqHraek/prengQvm)。新專案標為 private，未替來源未明示授權的方案另行宣告開源授權。

## 音韻地位與字庫

當前字釋義直接使用固定版本 tshet-uinh 字庫的原文條目，按字頭及選定音韻地位匹配，保留同一讀音的各個來源條目。《切韻》資料標明為王三《切韻》；未收釋義時不借用其他讀音的條目。

使用 [tshet-uinh 0.15.4](https://github.com/nk2028/tshet-uinh-js) 的描述解析與逐字讀音資料，授權 MIT。依賴版本與間接依賴鎖定於 `package-lock.json`；MIT 授權全文保存在 `docs/licenses/tshet-uinh.txt`。

字典未收指該版本字庫沒有該字與音韻地位的組合，不代表不能推導，也不代表其他韻書沒有該讀音。本站保留人工標註，確認後仍可練習；字庫建議不會直接覆蓋原文選讀。

## 標註語料

三篇初始範例與內建「classics」語料取自 [nk2028/tshet-uinh-text-label](https://github.com/nk2028/tshet-uinh-text-label)，固定提交 `9d57ef6e9637538788f2f56fa1fd90e3e13f7f6b`，授權 CC0-1.0。選取 16 篇古典作品，包括 9 首宋詞；未納入二十世紀詩作和報章文本。原始標註包含在 `src/data/samples.json` 及 `public/corpora/classics.json`，授權全文在 `docs/licenses/text-label-CC0.txt`。

[biopolyhedron/middle-chinese-text-label](https://github.com/biopolyhedron/middle-chinese-text-label) 的《唐詩三百首》《論語》已轉換，固定提交 `54e591d3de18843eaa942467c99e528cebe0cb11`。兩份原始 TXT 檔头均明示 `#licence: cc by-nc-sa 3.0`，署名 polyhedron，另注明盈利性使用須聯繫作者；README 的「版權歸作者所有」亦保留在來源記錄中。轉換產物維持原注音的 CC BY-NC-SA 3.0 標記；許可資訊和原始拼音随每篇匯出，不能改標 CC0 或 MIT。原始授權說明見 [唐詩檔頭](https://github.com/biopolyhedron/middle-chinese-text-label/blob/54e591d3de18843eaa942467c99e528cebe0cb11/dang_sji_300_sjux.txt)、[論語檔頭](https://github.com/biopolyhedron/middle-chinese-text-label/blob/54e591d3de18843eaa942467c99e528cebe0cb11/luon_ngiox.txt) 及 [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/)。

音韻地位到古韻羅馬字的推導來自 [nk2028/obsolete-romanizations-examples](https://github.com/nk2028/obsolete-romanizations-examples)，提交 `cdf3891543d6cfe8e20b2784b2baf0e3be2c2bbe`，作者 Ayaka、unt，CC0-1.0。`src/polyhedron-scheme.js` 是已檢查的函數包裝快照，補入兩個選項的明確預設值；不在重建時執行遠端程式碼。

唐詩原文配對使用 [chinese-poetry/chinese-poetry](https://github.com/chinese-poetry/chinese-poetry) 的 MIT 版本（提交 `b8594f81a89752241442f2ce267d6f66f96704ee`，授權全文見 `docs/licenses/chinese-poetry-MIT.txt`）及 [rime-aca/corpus](https://github.com/rime-aca/corpus) 的古典正文轉錄（提交 `d74f5c03669b349f26428ec00c2fc12bc5726fff`）。後者倉庫未明示整理授權，本次只抽取公有領域古典作品的 `詩文`，不使用現代導言與押韻備註。每篇保留實際原文 URL 和版本；異文可造成待校對讀音。

《詩經》試點〈芣苢〉〈桃夭〉的正文取自同一固定版本 rime-aca/corpus 的 `詩經.txt`，只抽取公有領域詩文。兩篇的漢字序列逐字核對 [Shijing-net](https://gitlab.huma-num.fr/chi-know-po/shijing-net) 提交 `8db512f5948fec9f05173778e225b4e99b62b82e` 的 XML 詩句；陸德明音義按 XML ID 引用。Shijing-net 由 Marie Bizais-Lillig、Ilaine Wang 編校，語料授權 CC BY-SA 4.0，全文許可保存於 `docs/licenses/shijing-net-CC-BY-SA-4.0.txt`。其 XML 是分層古注，並非逐字已消歧的現成切韻標註；本次選讀由切韻練字試點編校（Codex）完成，衍生選讀同採 CC BY-SA 4.0。

〈桃夭〉「華」補據朱熹 [《詩集傳》卷之一](https://zh.wikisource.org/w/index.php?title=詩經集傳/卷之一&oldid=2626705) 的「音花」，固定維基文庫修訂 `2626705`，轉錄許可標記 CC BY-SA 4.0。只用此處直音，不據該版本的其他注音改動本篇讀法。字庫單一地位作基底，多讀字選讀、古注異讀、字庫候選、原文 URL、注釋 URL 及來源版本均保留。具體依據在 `scripts/shijing-selections.json`，網站校對頁的「語料資料」亦可查看。

全書擴充沿用同一固定版本的 305 篇正文。[Kanripo《詩集傳》四部叢刊本](https://github.com/kanripo/KR1c0009/tree/efc202d5265c368b0ea6e54850872ff4b5aef667) 固定提交 `efc202d5265c368b0ea6e54850872ff4b5aef667` 的 `KR1c0009_001.txt` 至 `_020.txt`，以朱熹古注作正文配對與音義依據。轉錄中存在缺頁及異文，採局部正文窗口核對，不據缺漏強行位移。另固定 [Kanripo《經典釋文》](https://github.com/kanripo/KR1g0003/tree/31270f868a66396f7dc16d02e19518effe14cb90) 提交 `31270f868a66396f7dc16d02e19518effe14cb90` 的 `_005.txt`、`_006.txt`、`_007.txt`（陸德明毛詩音義三卷），供補證。新增 23 份來源均有 SHA-256。

古典正文、朱熹與陸德明的古注原典屬公有領域；上述 Kanripo 與 rime-aca 倉庫未明示轉錄整理的授權，本次保存來源及版本，不另為其整理工作宣告授權。本次新增的選讀、對應與字義規則採 CC BY-SA 4.0；既有兩篇的 Shijing-net 引文仍依其 CC BY-SA 4.0，字庫仍依 MIT。切韻系讀法不冒充上古擬音或宋人協韻讀法。明示的補音引文及廣韻參照在重建時驗證；其他字義規則的廣韻反切與釋義亦逐條驗證。未決音義、候選和古注不因擴充而丟棄。

本輪消歧檢索交叉閱讀 [《毛詩正義》卷二十三](https://zh.wikisource.org/wiki/毛詩正義_(四庫全書本)/卷23)、[《經典釋文》毛詩音義下的固定轉錄](https://github.com/kanripo/KR1g0003/blob/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) 和 [《廣韻》去聲宕韻](https://ctext.org/text.pl?if=gb&node=310063)。實際生成語料仍使用已核驗 SHA-256 的 Kanripo 快取及固定字庫，沒有把網頁 OCR 直接用於自動標註。新規則同時核驗古注卷頁、引文與所附底文詞頭；檢索結論和逐項變更記於 [shijing-research.md](shijing-research.md) 及 [shijing-research.json](shijing-research.json)。

2026-10-03 重建時以 GitHub 固定提交的內容 API 交叉核對，修正既有 `poly-tang.txt` 與 `rime-tang.txt` 的 SHA-256 記錄；來源提交不變，重建後三個既有語料包內容完全相同。

固定來源的檔案、URL、提交、SHA-256、授權記錄在 `scripts/corpus-sources.json`；逐包統計與對齊缺漏在 `docs/corpus-report.json`。轉換規則與搜尋結論見 [語料轉換說明](corpus-conversion.md)。

本網站的操作與資料保存均在瀏覽器內完成。點擊資料來源的外部連結會開啟對應網站，不會傳送導入語料。

2026-10-03 語義覆核新增 [nk2028/tshet-uinh-data](https://github.com/nk2028/tshet-uinh-data/tree/21585e22c8a730ca2fd175112f4d18e16d5ce578) 固定提交 `21585e22c8a730ca2fd175112f4d18e16d5ce578` 的 `韻書/王三.csv`、`韻書/廣韻.csv` 及 CC0-1.0 授權（全文見 `docs/licenses/qieyun-data-CC0-1.0.txt`）。王三為王仁昫《刊謬補缺切韻》傳本的整理資料，來源提示小韻內部待校；廣韻為澤存堂本加校訂的轉錄。[故宮傳本說明](https://www.dpm.org.cn/lemmas/241753.html) 作書名、傳本背景核對，沒有把現代復元本當陸法言完整原本。

韻書全文作固定來源驗證；本次各選讀同時保存對比條目的原始地位描述、反切及完整釋義。王三與現用字庫的地位描述規格有差異，選定地位仍按現用 tshet-uinh 0.15.4 表示，原欄不改寫。《釋文》所引較早《聲類》《韻集》逸文，以及《埤蒼》《字林》字書音義，分層保存於 [shijing-semantic-review.json](shijing-semantic-review.json)。前兩書未取得可供本輪逐字核對的完整原本；引用字書不冒充引用完整韻書。178 處新增選讀中 20 處依本篇音注，其餘為本版語境選讀，原候選與同義異讀保留。

## 異文覆核的新增正文來源

2026-10-03 全庫異文回查新增 [東里書齋《唐詩三百首》](https://www.donglishuzhai.net/books/tangshi300.html) 的正文快照 `scripts/snapshots/tang-dongli.json`，來源清單及 SHA-256 見 `scripts/corpus-edition-sources.json`。目錄列出的 295 個頁面均取得，抽出 297 個詩文單元；只保存古典正文、標題及作者，不採現代注釋、普通話拼音或校注說明。古典作品屬公有領域，網站轉錄未明示整理授權，保留此限制；原 polyhedron 標音的 CC BY-NC-SA 3.0 標記照存。

《詩經》151 組字形對應與 74 處限定篇句差異以固定《詩集傳》轉錄的原字及卷頁核驗；字庫用字對應則逐條驗證字頭、地位、反切與完整釋義。原始轉錄差異沒有一概提升為古本異文。結果、範圍及未配對事項見 [全庫異文覆核](corpus-edition-review.md)。

## 剩餘字位确认的古注來源

本輪新增 [Kanripo《論語注疏》四庫全書本](https://github.com/kanripo/KR1h0007/tree/3deaf2c46d2849519048a43445a4d66aa3c5871f)，固定提交 `3deaf2c46d2849519048a43445a4d66aa3c5871f`。何晏集解、陸德明音義、邢昺疏的二十卷原文保存於 `scripts/snapshots/analects-commentary.json`，逐檔記 URL、SHA-256；引用另定位到卷頁及原文 UTF-16 偏移。古典原文屬公有領域，電子轉錄未另查得明示整理授權，保留出處而不另宣告其轉錄許可。

《詩經》的本輪確認继续使用上述已固定的《詩集傳》《經典釋文》及兩韻書。少量《康熙字典》《洪武正韻牋》《毛詩正義》的網頁旁證附原文 URL，與固定來源的機械驗證區分。詞義採讀、直音值參照及本篇常音分別說明；詳細字位與前後選讀見 [corpus-confirmation-review.json](corpus-confirmation-review.json)。
