# 資料來源

## 本地方案與鍵位

`src/scheme.js` 是 TU3K 倉庫 `prengQvm.js` 的函數包裝快照，使用相同的全拼、三段與三拼推導規則。來源提交為 `36773009a44262afdfa0db5d4048c1f905aabea1`；雜湊、資料數量與採用的「韻」讀音記錄在 [snapshot.json](snapshot.json)。

鍵表來自 `config/keyboards/default.json`，固定音節表來自 `data/positions.tsv`。3,809 個音節為已驗證的 3,808 個音韻地位加本方案補充「怎」，不宣稱覆蓋所有理論音韻地位。有效的導入讀音也會加入當次候選篩選。

本方案原始上游為 [IemKwangqHraek/prengQvm](https://github.com/IemKwangqHraek/prengQvm)。新專案標為 private，未替來源未明示授權的方案另行宣告開源授權。

## 音韻地位與字庫

使用 [tshet-uinh 0.15.4](https://github.com/nk2028/tshet-uinh-js) 的描述解析與逐字讀音資料，授權 MIT。依賴版本與間接依賴鎖定於 `package-lock.json`；MIT 授權全文保存在 `docs/licenses/tshet-uinh.txt`。

字典未收指該版本字庫沒有該字與音韻地位的組合，不代表不能推導，也不代表其他韻書沒有該讀音。本站保留人工標註，確認後仍可練習；字庫建議不會直接覆蓋原文選讀。

## 標註語料

三篇初始範例與內建「classics」語料取自 [nk2028/tshet-uinh-text-label](https://github.com/nk2028/tshet-uinh-text-label)，固定提交 `9d57ef6e9637538788f2f56fa1fd90e3e13f7f6b`，授權 CC0-1.0。選取 16 篇古典作品，包括 9 首宋詞；未納入二十世紀詩作和報章文本。原始標註包含在 `src/data/samples.json` 及 `public/corpora/classics.json`，授權全文在 `docs/licenses/text-label-CC0.txt`。

[biopolyhedron/middle-chinese-text-label](https://github.com/biopolyhedron/middle-chinese-text-label) 的《唐詩三百首》《論語》已轉換，固定提交 `54e591d3de18843eaa942467c99e528cebe0cb11`。兩份原始 TXT 檔头均明示 `#licence: cc by-nc-sa 3.0`，署名 polyhedron，另注明盈利性使用須聯繫作者；README 的「版權歸作者所有」亦保留在來源記錄中。轉換產物維持原注音的 CC BY-NC-SA 3.0 標記；許可資訊和原始拼音随每篇匯出，不能改標 CC0 或 MIT。原始授權說明見 [唐詩檔頭](https://github.com/biopolyhedron/middle-chinese-text-label/blob/54e591d3de18843eaa942467c99e528cebe0cb11/dang_sji_300_sjux.txt)、[論語檔頭](https://github.com/biopolyhedron/middle-chinese-text-label/blob/54e591d3de18843eaa942467c99e528cebe0cb11/luon_ngiox.txt) 及 [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/)。

音韻地位到古韻羅馬字的推導來自 [nk2028/obsolete-romanizations-examples](https://github.com/nk2028/obsolete-romanizations-examples)，提交 `cdf3891543d6cfe8e20b2784b2baf0e3be2c2bbe`，作者 Ayaka、unt，CC0-1.0。`src/polyhedron-scheme.js` 是已檢查的函數包裝快照，補入兩個選項的明確預設值；不在重建時執行遠端程式碼。

唐詩原文配對使用 [chinese-poetry/chinese-poetry](https://github.com/chinese-poetry/chinese-poetry) 的 MIT 版本（提交 `b8594f81a89752241442f2ce267d6f66f96704ee`，授權全文見 `docs/licenses/chinese-poetry-MIT.txt`）及 [rime-aca/corpus](https://github.com/rime-aca/corpus) 的古典正文轉錄（提交 `d74f5c03669b349f26428ec00c2fc12bc5726fff`）。後者倉庫未明示整理授權，本次只抽取公有領域古典作品的 `詩文`，不使用現代導言與押韻備註。每篇保留實際原文 URL 和版本；異文可造成待校對讀音。

固定來源的檔案、URL、提交、SHA-256、授權記錄在 `scripts/corpus-sources.json`；逐包統計與對齊缺漏在 `docs/corpus-report.json`。轉換規則與搜尋結論見 [語料轉換說明](corpus-conversion.md)。

本網站的操作與資料保存均在瀏覽器內完成。點擊資料來源的外部連結會開啟對應網站，不會傳送導入語料。
