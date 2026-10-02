# 資料來源

## 本地方案與鍵位

`src/scheme.js` 是 TU3K 倉庫 `prengQvm.js` 的函數包裝快照，使用相同的全拼、三段與三拼推導規則。來源提交為 `36773009a44262afdfa0db5d4048c1f905aabea1`；雜湊、資料數量與採用的「韻」讀音記錄在 [snapshot.json](snapshot.json)。

鍵表來自 `config/keyboards/default.json`，固定音節表來自 `data/positions.tsv`。3,809 個音節為已驗證的 3,808 個音韻地位加本方案補充「怎」，不宣稱覆蓋所有理論音韻地位。有效的導入讀音也會加入當次候選篩選。

本方案原始上游為 [IemKwangqHraek/prengQvm](https://github.com/IemKwangqHraek/prengQvm)。新專案標為 private，未替來源未明示授權的方案另行宣告開源授權。

## 音韻地位與字庫

使用 [tshet-uinh 0.15.4](https://github.com/nk2028/tshet-uinh-js) 的描述解析與逐字讀音資料，授權 MIT。依賴版本與間接依賴鎖定於 `package-lock.json`；MIT 授權全文保存在 `docs/licenses/tshet-uinh.txt`。

字典未收指該版本字庫沒有該字與音韻地位的組合，不代表不能推導，也不代表其他韻書沒有該讀音。本站保留人工標註，確認後仍可練習；字庫建議不會直接覆蓋原文選讀。

## 標註語料

內建三篇範例取自 [nk2028/tshet-uinh-text-label](https://github.com/nk2028/tshet-uinh-text-label)，授權 CC0-1.0。原始標註仍包含在 `src/data/samples.json`，每篇語料保留來源及許可資訊。

[biopolyhedron/middle-chinese-text-label](https://github.com/biopolyhedron/middle-chinese-text-label) 提供中古拼音轉寫。這類語料需要先與原文對齊，再轉換成本站的音韻地位格式；本站沒有隨附其文本。使用者導入時需自行保留該份語料的來源與原始授權資訊。

本網站的操作與資料保存均在瀏覽器內完成。點擊資料來源的外部連結會開啟對應網站，不會傳送導入語料。
