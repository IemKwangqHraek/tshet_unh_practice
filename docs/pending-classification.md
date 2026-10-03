# 剩餘待核字位分類

2026-10-03，本輪有據確認後的現況：四包共 **931 個待核字位**。前輪為 2,279，本輪新增確認 1,348；另有 3 處已有選讀更正，詳見 [本輪確認記錄](corpus-confirmation-review.md) 和 [逐字前後變更](corpus-confirmation-review.json)。同一字在不同篇句或重章分別計數。

| 語料 | 仍待核 |
| --- | --- |
| 其他經典 | 0 |
| 《論語》 | 86 |
| 唐詩 | 194 |
| 《詩經》 | 651 |

完整逐字清單在 [pending-classification.json](pending-classification.json)，保存原字、上下文、候選、卡點、引文及下一步。索引為不含標點的零起始漢字序號。

## 證據種類

| 證據類別 | 字位 |
| --- | --- |
| 尚未建立本句歷史多說證據 | 707 |
| 文獻有另讀或音注分歧 | 217 |
| 古注有不同義解，未確證不同音 | 1 |
| 通例適用或本句音義關係待核 | 4 |
| 現代原注明列兩讀 | 2 |

「尚未建立」不等於古人一致，也不保證能唯一化。現代注者的問號只表示存疑，沒有算成兩個讀法。音注分歧可能出於不同學說、傳本或音系，需要分辨；不把所有不同切字都當作兩個音韻地位。

前輪 183 個《詩經》古注多說字位全部保留。其中 35 處涉及不同傳統（32 處涉及毛鄭），117 處已取得不相交的可能地位集合，31 處仍待换算。本輪新增證據另列於下表，尚未冒充全部完成上述換算分級。

## 現行卡點

這是另一個分類維度，與證據種類不能相加。有本句異讀的字位也可能同時有音注配對問題。

| 卡點 | 字位 | 後續核對 |
| --- | --- | --- |
| 原注缺音、存疑或另列讀法 | 22 | 回查原始標音、修訂或其他有據注本；問號只證明注者存疑，不能據此斷言有兩種古讀。 |
| 有借讀或同音詞頭線索 | 13 | 尋找本句通假或訓詁證據；與另一字同音只提供線索，不能直接確認借讀。 |
| 原標音與詞頭音義仍待互證 | 173 | 按具體詞義、字形和原注音系回查韻書；字庫不合本身不足以證明原注有誤。 |
| 原拼音格式或音系待核 | 33 | 核對原拼音方案、排印與轉換規則；未映射的拼音不等於缺音，不擅改為最相近字串。 |
| 另本文字更合原標音 | 37 | 查明原標音所依完整版本；保留現版和另本，不能僅為符合音注拼接正文。 |
| 異體或字庫詞頭對應待確認 | 2 | 核對替代詞頭的原韻書釋義及本句用法；相容字形只作查字線索，不全域替換正文。 |
| 現行選讀尚缺可採用的義例判據 | 362 | 按本句詞義、詞性、專名及通假查《釋文》《廣韻》等；字庫多讀本身不足以證明本句歷來多說，人工引文亦須進一步判斷採讀。 |
| 本篇常音與切韻字庫待互證 | 147 | 按具體篇句核對直音字、反切上下字、借讀與韻書音義，避免以字庫首項代替考證。 |
| 自動配對只取得協韻提示 | 39 | 補接人工覆核所得常音，或另查常讀及本句義項；協韻注不直接用作切韻系常讀的唯一依據。 |
| 現行正文窗口未命中 | 85 | 核對缺頁、轉錄字形及重章位置，接回該處古注；不將配對失敗當讀音爭議。人工覆核可能已另有引文。 |
| 音注格式或同上指引待展開 | 13 | 還原聲調、並讀、同上等音注格式，確認它所指的詞例；展開後仍須檢查古注分歧。 |
| 古注已提示用字或正文差異 | 5 | 先確認所讀的是哪個字或哪個版本，再依該版本配音；保留其他版本。 |

《論語》14 段的整段對齊問題已修復；原注缺少的 13 個音節仍留空，「文」的平、去兩讀並存。原來的對齊診斷保留為歷史記錄，不能再把整段 819 字算作未配對。

已核到足夠音義依據的詞位已寫入內建語料。其餘需要更直接的本句音注、原標音版本或傳本校勘，不以普通話讀音、最相近拼寫或字庫首項補滿。新增未決個案的具體理由保存在 JSON 的 currentReview／retainedEvidence。

重建命令：npm run classify:pending；一致性檢查：npm run check:pending。

<!-- pending-cases:start -->

## 逐項索引

以下表格由分類資料自動生成。索引仍從 0 起算；同篇同字同一證據的重章合併列索引，完整上下文保存在 JSON。

<details>
<summary>古注多說的全部 183 字位</summary>

| 篇名 | 字／索引 | 已核證據 | 分級／出處 |
| --- | --- | --- | --- |
| 邶風・匏有苦葉 | 鷕 · 19 | 同篇雌雉鳴聲明列數讀；可定詞義，不能僅因數值轉換失敗刪掉古讀。 | 不同注法待換算；[KR1g0003_SBCK_005-12b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 邶風・谷風 | 御 · 168 | 禦寒同義，明列徐邈另一讀；此處只覆蓋「亦以御冬」。 | 換算可辨異位；[KR1g0003_SBCK_005-13b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 鄘風・干旄 | 紕 · 10 | 同一句毛、鄭分別注音；應選學說後才定讀。 | 學說分歧；[KR1g0003_SBCK_005-17b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 鄘風・干旄 | 祝 · 58 | 毛釋祝為織；鄭改讀屬、釋著，涉及字詞與音義選擇。 | 學說分歧；[KR1g0003_SBCK_005-17b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 衛風・淇奧 | 奧 · 3 | 本篇篇名兼首句「淇奧」明列於六、烏報；另有水曲／水名解釋。 | 換算可辨異位；[KR1g0003_SBCK_005-18a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 衛風・碩人 | 蝤 · 38 | 蝤蠐名物注明載徐、沈異音，兼異體與物種解釋；需分名物傳承與切韻映射。 | 換算可辨異位；[KR1g0003_SBCK_005-19a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 衛風・氓 | 咥 · 188 | 本篇「咥其笑矣」釋笑而明列數音；不可用單一現代字音排除。 | 換算可辨異位；[KR1g0003_SBCK_005-20a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 衛風・氓 | 泮 · 215 | 同篇毛讀判釋坡，鄭讀畔釋涯，確有音義解釋分歧。 | 學說分歧；[KR1g0003_SBCK_005-20a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 衛風・竹竿 | 檜 · 53 | 同一船材木名明列古活、古會兩讀。 | 換算可辨異位；[KR1g0003_SBCK_005-20b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 王風・中谷有蓷 | 暵 · 4、30、56 | 同篇「暵其乾／脩／濕」明列呼但、徐音漢等；重章三處同詞。 | 換算可辨異位；[KR1g0003_SBCK_005-22a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 王風・中谷有蓷 | 仳 · 10、36、62 | 仳離釋別，注明列匹指、徐符鄙、敷姊等；字林末段轉錄含缺字，故不憑末段另立音位。 | 換算可辨異位；[KR1g0003_SBCK_005-22a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 王風・大車 | 啍 · 19 | 大車行聲／重遲貌在同詞下明載他敦及徐徒孫。 | 換算可辨異位；[KR1g0003_SBCK_005-23a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 鄭風・出其東門 | 縞 · 40 | 白色衣料同義明列上、去兩反切。 | 換算可辨異位；[KR1g0003_SBCK_005-26b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 齊風・著 | 著 · 3 | 先列三讀，末句另談協句；歷史多讀可確立，協句偏好不當作唯一常讀。 | 換算可辨異位；[KR1g0003_SBCK_005-28a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 齊風・南山 | 崔 · 2、3 | 同篇山高貌疊詞有子雖與音隹；兩疊字同詞。 | 換算可辨異位；[KR1g0003_SBCK_005-28a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 齊風・南山 | 衡 · 53 | 同篇從衡解為橫，明列橫音及如字；字詞理解可定，歷史讀法仍有兩項。 | 不同注法待換算；[KR1g0003_SBCK_005-28b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 齊風・載驅 | 薄 · 3 | 疾驅聲疊詞首音與徐音不同；已定為車行聲。 | 換算可辨異位；[KR1g0003_SBCK_005-29a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 唐風・山有樞 | 廷 · 38 | 洒掃的庭內，同一名詞列平、去兩讀。 | 換算可辨異位；[KR1g0003_SBCK_005-31a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 唐風・葛生 | 蘞 · 20 | 同一蔓草名明列數音；名物可定，音系映射需各存。 | 換算可辨異位；[KR1g0003_SBCK_005-33a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 秦風・車鄰 | 阪 · 16、38 | 同篇阪地名詞明列音反與扶板；两章同詞。 | 換算可辨異位；[KR1g0003_SBCK_005-33b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 秦風・黃鳥 | 防 · 68 | 徐邈明載毛、鄭異音；須查兩家防義與具體音系後選系統。 | 學說分歧；[KR1g0003_SBCK_005-35a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 秦風・黃鳥 | 鍼 · 105、109 | 人名鍼虎有明載徐氏另一讀；本篇兩次同人名。 | 換算可辨異位；[KR1g0003_SBCK_005-35a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 陳風・東門之楊 | 肺 · 23 | 楊葉盛貌疊詞有送氣與濁聲母異讀。 | 換算可辨異位；[KR1g0003_SBCK_006-2a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 陳風・月出 | 糾 · 10 | 窈糾姿態詞明列多音；不能由本字另一詞義代替。 | 換算可辨異位；[KR1g0003_SBCK_006-3a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 陳風・澤陂 | 悁 · 47 | 憂悶義有異本另讀；原轉錄「又作戸感反」語法可疑，需影印核驗，但確實保存另一音讀說法。 | 不同注法待換算；[KR1g0003_SBCK_006-3b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 檜風・匪風 | 鬵 · 39 | 釜器名同義明列音尋、音岑及才今反。 | 換算可辨異位；[KR1g0003_SBCK_006-4b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 曹風・候人 | 祋 · 7 | 兵器殳義列去、入兩讀，非語義足以淘汰的候選。 | 不同注法待換算；[KR1g0003_SBCK_006-5a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 曹風・候人 | 芾 · 15 | 祭服蔽膝同義明列沈重另一讀。 | 換算可辨異位；[KR1g0003_SBCK_006-5a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 豳風・七月 | 條 · 104 | 本篇採桑動作明載他彫、如字、沈音，不宜與一般枝條名詞全域合併。 | 換算可辨異位；[KR1g0003_SBCK_006-5b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 豳風・七月 | 凌 · 344 | 冰室名明列去、平兩读。 | 換算可辨異位；[KR1g0003_SBCK_006-6b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 豳風・狼跋 | 疐 · 5、17 | 原文㚄為疐字體，絆倒義列丁四及陟值；同篇兩處同詞。 | 換算可辨異位；[KR1g0003_SBCK_006-8b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・鹿鳴之什・鹿鳴 | 示 · 28 | 毛示、鄭改寘，涉及字詞與訓義，不可只依字库給一讀。 | 學說分歧；[KR1g0003_SBCK_006-9a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・鹿鳴之什・伐木 | 釃 · 100 | 篩濾酒義明列徐、又音、葛洪三讀；數位缺字不影響保存的反切。 | 換算可辨異位；[KR1g0003_SBCK_006-10b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・鹿鳴之什・伐木 | 酤 · 126 | 毛釋一宿酒、鄭釋買；讀戶／顧／沽，應先選訓義。 | 學說分歧；[KR1g0003_SBCK_006-10b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・白華之什・蓼蕭 | 濃 · 81 | 恩澤厚貌明列冬、鍾類異讀。 | 不同注法待換算；[KR1g0003_SBCK_006-14a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・彤弓之什・采芑 | 嘽 · 173 | 眾盛之貌明列吐丹與徐音他；需核徐音字映射。 | 換算可辨異位；[KR1g0003_SBCK_006-15b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・彤弓之什・采芑 | 焞 · 175 | 盛貌明列吐雷與他屯。 | 換算可辨異位；[KR1g0003_SBCK_006-15b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・彤弓之什・采芑 | 霆 · 177 | 同篇雷霆明列廷、徐挺、又定，三讀為原文明載。 | 換算可辨異位；[KR1g0003_SBCK_006-15b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・彤弓之什・車攻 | 龐 · 11 | 同篇馬匹充實貌有鹿同與徐扶公兩讀。 | 換算可辨異位；[KR1g0003_SBCK_006-15b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・彤弓之什・車攻 | 柴 · 79 | 積禽之義明列三反切及異字。 | 換算可辨異位；[KR1g0003_SBCK_006-16a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・彤弓之什・吉日 | 差 · 29 | 差擇馬匹義有兩反切。 | 不同注法待換算；[KR1g0003_SBCK_006-16b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・彤弓之什・吉日 | 挾 · 77 | 同篇持挾義明列三音。 | 換算可辨異位；[KR1g0003_SBCK_006-16b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・彤弓之什・庭燎 | 燎 · 8、27、46 | 庭中大燭名詞有去、平兩讀；三章同詞。 | 不同注法待換算；[KR1g0003_SBCK_006-17a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・彤弓之什・庭燎 | 艾 · 25 | 毛釋久、鄭釋芟末，五蓋／刈不同，確屬音義學說分歧。 | 學說分歧；[KR1g0003_SBCK_006-17a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・祈父之什・白駒 | 遁 · 70 | 同篇遯／遁為避世義，明列去、上兩讀。 | 換算可辨異位；[KR1g0003_SBCK_006-18a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・祈父之什・斯干 | 芋 · 67 | 毛釋大讀香于、鄭改幠讀火吳釋覆，確為字詞音義分歧。 | 學說分歧；[KR1g0003_SBCK_006-18b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・祈父之什・無羊 | 何 · 52 | 同篇何蓑何笠的負荷義明列上、平兩讀。 | 換算可辨異位；[KR1g0003_SBCK_006-19a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・祈父之什・節南山 | 節 · 0 | 南山高峻貌明載在切、如字、音截，且有韓詩異訓。 | 不同注法待換算；[KR1g0003_SBCK_006-19b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・祈父之什・節南山 | 氐 · 71 | 毛、鄭同句分丁禮、都履讀。 | 學說分歧；[KR1g0003_SBCK_006-19b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・祈父之什・節南山 | 弔 · 89、162 | 釋至而列如字與丁歷；本篇兩處同詞。 | 不同注法待換算；[KR1g0003_SBCK_006-20a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・祈父之什・十月之交 | 番 · 100 | 人名番明列方袁、徐甫言，兼潘／繁異本。 | 不同注法待換算；[KR1g0003_SBCK_006-21b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・祈父之什・雨無正 | 浩 · 0、1 | 昊天廣大貌明列古老、胡老；疊詞兩字。 | 換算可辨異位；[KR1g0003_SBCK_006-22a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・小旻之什・小弁 | 屬 · 81 | 親屬義明列燭與徐蜀。 | 換算可辨異位；[KR1g0003_SBCK_006-23b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・小旻之什・小弁 | 壞 · 146 | 病木、木瘤義本字另作瘣，胡罪／如字／回多讀，應保留異體與音義層。 | 換算可辨異位；[KR1g0003_SBCK_006-24a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・小旻之什・巧言 | 僭 · 36 | 毛訓數、鄭訓不信並分音，確屬音義兩說。 | 學說分歧；[KR1g0003_SBCK_006-25a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・小旻之什・何人斯 | 飄 · 79 | 疾風同義明列避遙、沈方消。 | 不同注法待換算；[KR1g0003_SBCK_006-25b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・小旻之什・大東 | 憚 · 78 | 勞苦義列丁佐、徐音旦，兼癉異體。 | 換算可辨異位；[KR1g0003_SBCK_006-27b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・小旻之什・大東 | 捄 · 185 | 長貌明列虯與其牛反；限本篇捄詞。 | 換算可辨異位；[KR1g0003_SBCK_006-27a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・小旻之什・大東 | 揭 · 226 | 同篇「揭其柄」明列居竭、徐起謁。 | 不同注法待換算；[KR1g0003_SBCK_006-27b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・北山之什・無將大車 | 重 · 46 | 累積塵埃義明列直龍、直用。 | 換算可辨異位；[KR1g0003_SBCK_006-28b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・北山之什・小明 | 憚 · 76 | 同篇勞苦義明列丁佐、徐音旦。 | 換算可辨異位；[KR1g0003_SBCK_006-28b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・北山之什・楚茨 | 踖 · 98、99 | 爨竈有容義明列七夕、七略；此處第二音未標協韻，須與《詩集傳》叶七略分開記錄。 | 換算可辨異位；[KR1g0003_SBCK_006-29a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・北山之什・信南山 | 畇 · 8、9 | 耕地墾闢貌明列勻、蘇遵、旬；原轉錄含重字須保留。 | 換算可辨異位；[KR1g0003_SBCK_006-29b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・北山之什・信南山 | 苾 · 125、126 | 香氣同義兩讀，《楚茨》此注明言下篇《信南山》同，僅按明示沿用。 | 換算可辨異位；[KR1g0003_SBCK_006-29a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・北山之什・大田 | 覃 · 14 | 耜鋒利義明列以冉與徐以廉。 | 換算可辨異位；[KR1g0003_SBCK_006-29b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・北山之什・瞻彼洛矣 | 韎 · 16 | 韎韐赤色皮服有昧、亡界兩讀。 | 換算可辨異位；[KR1g0003_SBCK_006-30a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・桑扈之什・鴛鴦 | 鴛 · 0、16 | 鳥名上字明列於袁、沈溫；本篇兩章同詞。 | 換算可辨異位；[KR1g0003_SBCK_006-30b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・桑扈之什・鴛鴦 | 鴦 · 1、17 | 鳥名下字明列於崗、於良；本篇兩章同詞。 | 換算可辨異位；[KR1g0003_SBCK_006-30b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・桑扈之什・鴛鴦 | 艾 · 46 | 養義明列魚蓋與徐刈；非另取草名。 | 換算可辨異位；[KR1g0003_SBCK_006-31a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・桑扈之什・賓之初筵 | 仇 · 99 | 毛作匹偶、鄭讀㪺挹酒，確有詞义与音读分歧。 | 學說分歧；[KR1g0003_SBCK_006-32b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・桑扈之什・賓之初筵 | 坐 · 138 | 本篇坐席名詞明列如字、徐才臥。 | 不同注法待換算；[KR1g0003_SBCK_006-32b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・桑扈之什・賓之初筵 | 語 · 263 | 同篇「勿言勿語」明列去、如字兩讀。 | 不同注法待換算；[KR1g0003_SBCK_006-33a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・桑扈之什・采菽 | 檻 · 34 | 泉涌出義明列銜覽、徐下斬。 | 不同注法待換算；[KR1g0003_SBCK_006-33b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・桑扈之什・采菽 | 淠 · 50、51 | 旂旗動貌明列三讀；疊詞兩字。 | 換算可辨異位；[KR1g0003_SBCK_006-33b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・桑扈之什・采菽 | 柞 · 97 | 木名明列清、濁聲母兩讀。 | 換算可辨異位；[KR1g0003_SBCK_006-33b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・桑扈之什・角弓 | 猱 · 84 | 猿類名物明列乃刀及沈乃遘。 | 換算可辨異位；[KR1g0003_SBCK_006-34a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・桑扈之什・角弓 | 瀌 · 102、103 | 雪盛貌三讀，限本篇疊詞兩字。 | 換算可辨異位；[KR1g0003_SBCK_006-34b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・桑扈之什・角弓 | 遺 · 111 | 王申毛如字、鄭讀隨，涉及借字學說。 | 學說分歧；[KR1g0003_SBCK_006-34b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・桑扈之什・角弓 | 婁 · 114 | 王訓數、鄭訓斂並分音，另沈力俱；須先定所從訓解。 | 學說分歧；[KR1g0003_SBCK_006-34b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・桑扈之什・菀柳 | 菀 · 25 | 本篇兩章有菀者柳為木盛貌，明列鬱與徐於阮；此處只收仍待核的第二章。 | 換算可辨異位；[KR1g0003_SBCK_006-34b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・都人士之什・都人士 | 蠆 · 87 | 蠆虫名两反切，借蠆尾說髮貌；名物既定而音不唯一。 | 不同注法待換算；[KR1g0003_SBCK_006-35a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・都人士之什・漸漸之石 | 卒 · 30 | 毛、鄭於此句不同聲母讀法；毛訓竟而鄭當另核該家解釋。 | 學說分歧；[KR1g0003_SBCK_006-37b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 大雅・文王之什・文王 | 麗 · 119 | 數目義明列力計及沈力知。 | 換算可辨異位；[KR1g0003_SBCK_007-1b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・文王之什・文王 | 易 · 198 | 毛釋不容易、鄭釋不可改易；音義學說分歧。 | 學說分歧；[KR1g0003_SBCK_007-1b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・文王之什・大明 | 造 · 129 | 造舟／浮梁詞明列數讀，非單一創造義可決。 | 換算可辨異位；[KR1g0003_SBCK_007-2a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・文王之什・緜 | 契 · 61 | 「爰契我龜」明列苦計、苦結，釋開；字形挈為異本。 | 換算可辨異位；[KR1g0003_SBCK_007-2b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・文王之什・緜 | 捄 · 120 | 土簍名詞明列俱、徐鳩；勿與《大東》長貌捄混。 | 換算可辨異位；[KR1g0003_SBCK_007-3a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・文王之什・緜 | 陾 · 122、123 | 築牆眾人／築牆聲疊詞列耳升、如之與說文音而。 | 換算可辨異位；[KR1g0003_SBCK_007-3a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・文王之什・緜 | 拔 · 180 | 本篇「柞棫拔矣」明列蒲貝與蒲蓋。 | 不同注法待換算；[KR1g0003_SBCK_007-3a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・文王之什・緜 | 喙 · 192 | 本篇「昆夷駾矣，維其喙矣」困義列許穢與徐尺銳。 | 不同注法待換算；[KR1g0003_SBCK_007-3b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・文王之什・棫樸 | 淠 · 32 | 舟行貌明列匹世與沈孚計。 | 換算可辨異位；[KR1g0003_SBCK_007-3b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・文王之什・棫樸 | 相 · 71 | 本篇助祭句有如字與一云鄭息亮；不能據字库一律選去聲。 | 學說分歧；[KR1g0003_SBCK_007-4a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・文王之什・思齊 | 媚 · 9 | 愛義列美記、沈眉。 | 不同注法待換算；[KR1g0003_SBCK_007-4b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・文王之什・思齊 | 御 · 46 | 毛訓迎、鄭訓治，音義明確分歧。 | 學說分歧；[KR1g0003_SBCK_007-4b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・文王之什・皇矣 | 栵 · 63 | 木名栭明列例、列兩讀。 | 換算可辨異位；[KR1g0003_SBCK_007-5a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・文王之什・皇矣 | 王 · 170 | 王此大邦稱君之義明列如字與徐于況。 | 不同注法待換算；[KR1g0003_SBCK_007-5b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・文王之什・皇矣 | 援 · 201 | 毛釋取讀袁／于願，鄭釋跋扈讀胡喚；需先選學說。 | 學說分歧；[KR1g0003_SBCK_007-5b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・文王之什・皇矣 | 按 · 232 | 字形按／遏同釋止而注音相異；保留版本對應，不視為全域通音。 | 換算可辨異位；[KR1g0003_SBCK_007-6a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・文王之什・靈臺 | 囿 · 27 | 靈囿名詞明列又與徐于目兩讀。 | 換算可辨異位；[KR1g0003_SBCK_007-6b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・文王之什・靈臺 | 於 · 60、68 | 明列於讀烏與鄭如字，並明說下於樂、於論同。 | 學說分歧；[KR1g0003_SBCK_007-6b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・文王之什・靈臺 | 論 · 65 | 論釋思有盧門與一云鄭倫；音義解釋需保留傳承層。 | 學說分歧；[KR1g0003_SBCK_007-6b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・生民之什・生民 | 唪 · 147、148 | 多果實疊詞明列布孔、徐薄孔。 | 換算可辨異位；[KR1g0003_SBCK_007-8a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・生民之什・生民 | 秠 · 206 | 黒黍一稃二米名物有孚鄙、孚悲、郭芳婢；原轉錄後半混接另一字注，分類僅據前三音。 | 換算可辨異位；[KR1g0003_SBCK_007-8a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・生民之什・生民 | 叟 · 239 | 淘米聲叟／溲／溞詞明列所留與郭音騷。 | 換算可辨異位；[KR1g0003_SBCK_007-8b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・生民之什・行葦 | 敦 · 66、82 | 畫弓名詞明列彫與徐都雷，注明下同。 | 換算可辨異位；[KR1g0003_SBCK_007-9a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・生民之什・行葦 | 挾 · 87 | 本篇挾箭明列子協、子合。 | 換算可辨異位；[KR1g0003_SBCK_007-9b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・生民之什・行葦 | 鍭 · 89、91 | 箭名明列去、平兩讀。 | 換算可辨異位；[KR1g0003_SBCK_007-9a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・生民之什・卷阿 | 伴 · 20 | 伴奐之詞明列判、徐畔。 | 換算可辨異位；[KR1g0003_SBCK_007-11a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・生民之什・卷阿 | 昄 · 47 | 大義明列徐、孫、郭、字林數音。 | 換算可辨異位；[KR1g0003_SBCK_007-11a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・生民之什・板 | 熇 · 122、123 | 熾盛疊詞明列徐許酷、沈許各。 | 換算可辨異位；[KR1g0003_SBCK_007-12b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・蕩之什・蕩 | 呼 · 162 | 呼叫同詞明列平、去讀；異本作謼或號呼句亦記錄。 | 換算可辨異位；[KR1g0003_SBCK_007-13b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・蕩之什・蕩 | 近 · 185 | 接近敗亡明列附近之近及如字，不能僅按常見詞性唯一化。 | 不同注法待換算；[KR1g0003_SBCK_007-13b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・蕩之什・桑柔 | 泯 · 47 | 滅義列面忍、名賓、徐民。 | 換算可辨異位；[KR1g0003_SBCK_007-15a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・蕩之什・桑柔 | 荓 · 172 | 使義明列普耕與徐補耕，兼迸／拼異本。 | 換算可辨異位；[KR1g0003_SBCK_007-15a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・蕩之什・桑柔 | 逮 · 175 | 及義明列代與大計。 | 換算可辨異位；[KR1g0003_SBCK_007-15a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・蕩之什・桑柔 | 贅 · 213 | 屬義明列之芮、拙稅。 | 不同注法待換算；[KR1g0003_SBCK_007-16a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・蕩之什・雲漢 | 霆 · 94 | 雷霆明列庭、挺、徒佞三讀。 | 換算可辨異位；[KR1g0003_SBCK_007-17a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・蕩之什・雲漢 | 相 · 115 | 同篇旱災祈禱句毛、鄭明列異讀。 | 學說分歧；[KR1g0003_SBCK_007-17a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・蕩之什・雲漢 | 黽 · 205 | 努力詞明列彌忍、湎，非不同詞義可排除。 | 換算可辨異位；[KR1g0003_SBCK_007-17a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・蕩之什・崧高 | 揉 · 235 | 使萬邦順服義有汝又、如字、柔，兼柔異本；歷史多讀明確。 | 換算可辨異位；[KR1g0003_SBCK_007-18b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・蕩之什・烝民 | 茹 · 138、151 | 柔茹／剛不茹的吞食義同列上、去兩讀。 | 換算可辨異位；[KR1g0003_SBCK_007-18b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・蕩之什・韓奕 | 共 · 33 | 毛訓執、鄭讀恭，音義分歧。 | 學說分歧；[KR1g0003_SBCK_007-19a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・蕩之什・韓奕 | 貓 · 230 | 虎屬名物有如字與武交，不能只用家貓現代音裁決。 | 不同注法待換算；[KR1g0003_SBCK_007-20a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・蕩之什・江漢 | 鋪 · 31 | 同篇「來鋪」有普吳與徐孚。 | 換算可辨異位；[KR1g0003_SBCK_007-20a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・蕩之什・常武 | 闞 · 109 | 同篇聲勢詞明列四音。 | 換算可辨異位；[KR1g0003_SBCK_007-21b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・蕩之什・常武 | 敦 · 114 | 王申毛釋厚如字，鄭改屯讀徒門，兼韓詩迫義。 | 學說分歧；[KR1g0003_SBCK_007-21b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・蕩之什・瞻卬 | 說 · 70 | 赦釋明列稅與他活。 | 換算可辨異位；[KR1g0003_SBCK_007-22a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・蕩之什・瞻卬 | 弔 · 162 | 同篇不弔有如字、的兩讀。 | 不同注法待換算；[KR1g0003_SBCK_007-22b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・蕩之什・瞻卬 | 檻 · 211 | 泉涌貌有胡覽、徐下斬。 | 不同注法待換算；[KR1g0003_SBCK_007-22b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 周頌・臣工之什・噫嘻 | 假 · 6 | 鄭王讀格釋至，沈載毛如字，需選說。 | 學說分歧；[KR1g0003_SBCK_007-25a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 周頌・臣工之什・豐年 | 稌 · 5 | 稻名明列杜與徐勑古。 | 不同注法待換算；[KR1g0003_SBCK_007-25a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 周頌・臣工之什・武 | 耆 · 24 | 毛指致、鄭巨移老、韓同鄭音而釋惡，歷史音義分歧明確。 | 學說分歧；[KR1g0003_SBCK_007-26b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 周頌・閔予小子之什・敬之 | 易 · 10 | 本篇天命不易明載鄭亦、王以豉；非同一通用字音可決。 | 學說分歧；[KR1g0003_SBCK_007-27a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 周頌・閔予小子之什・載芟 | 飶 · 97 | 食物香氣名詞明列蒲節、蒲必。 | 換算可辨異位；[KR1g0003_SBCK_007-27b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 周頌・閔予小子之什・良耜 | 趙 · 35 | 除草刺地動作詞有徒了、如字、沈起了／徒少。 | 換算可辨異位；[KR1g0003_SBCK_007-28a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 周頌・閔予小子之什・絲衣 | 載 · 4 | 絲衣載弁動詞有如字與戴音。 | 不同注法待換算；[KR1g0003_SBCK_007-28b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 周頌・閔予小子之什・絲衣 | 鼒 · 19 | 小鼎名物列兹、徐災、郭才。 | 換算可辨異位；[KR1g0003_SBCK_007-28b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 周頌・閔予小子之什・酌 | 造 · 24 | 毛釋為、鄭釋詣，音義分歧。 | 學說分歧；[KR1g0003_SBCK_007-28b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 周頌・閔予小子之什・般 | 嶞 · 8 | 狹長山名詞明列吐果、同果。 | 換算可辨異位；[KR1g0003_SBCK_007-29a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 魯頌・駉 | 駓 · 46 | 黃白雜毛馬名列符悲与字林丕。 | 換算可辨異位；[KR1g0003_SBCK_007-29b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 魯頌・有駜 | 咽 · 23、24、55、56 | 鼓聲／鼓節疊詞列烏玄、於巾；本篇兩章同詞。 | 換算可辨異位；[KR1g0003_SBCK_007-30a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 魯頌・有駜 | 駽 · 71 | 青驪馬名列呼縣、火玄、徐胡眄、炫。 | 換算可辨異位；[KR1g0003_SBCK_007-30a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 魯頌・泮水 | 茆 · 71 | 茆草名不仅卯／徐柳／韋萌藻異音，原注明言解者不同、未詳其正，兼歷史名物爭議。 | 換算可辨異位；[KR1g0003_SBCK_007-30b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 魯頌・泮水 | 屈 · 92 | 毛收／鄭治異訓，徐載鄭另讀其勿。 | 學說分歧；[KR1g0003_SBCK_007-30b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 魯頌・泮水 | 狄 · 173 | 王達、鄭剔治同讀；沈又載毛如字而陸氏注明來源不明。保留確證為古人已記多說，不能把毛說當無疑定論。 | 學說分歧；[KR1g0003_SBCK_007-30b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 魯頌・泮水 | 吳 · 182 | 鄭如字、王音誤，原轉錄末段疑有脫字；兩家異音條已明列，細節待影印。 | 學說分歧；[KR1g0003_SBCK_007-30b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 魯頌・閟宮 | 綅 · 290 | 絲線名詞列息廉、沈倉林、侵。 | 換算可辨異位；[KR1g0003_SBCK_007-32a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 魯頌・閟宮 | 兒 · 450 | 老年更生細齒名詞有五兮、如字；字書作齯。 | 不同注法待換算；[KR1g0003_SBCK_007-32a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 商頌・那 | 假 · 19 | 毛訓大、鄭改格訓升，音義及字詞分歧。 | 學說分歧；[KR1g0003_SBCK_007-32b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 商頌・烈祖 | 假 · 33、57 | 毛釋大、鄭釋至；原注明「下以假以享同」，只適用鬷假與以假兩處，來假另有專注不納此組。 | 學說分歧；[KR1g0003_SBCK_007-33a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 商頌・玄鳥 | 員 · 83 | 毛釋均讀圓、鄭音云，實有學說分歧。 | 學說分歧；[KR1g0003_SBCK_007-34b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 商頌・長發 | 隕 · 23 | 同篇均／周異訓，明載圓及徐于貧反。 | 換算可辨異位；[KR1g0003_SBCK_007-34b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 商頌・長發 | 綴 · 103 | 國家綴旒比喻有陟劣、徐張衞及毛表／鄭結異訓。 | 換算可辨異位；[KR1g0003_SBCK_007-35a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |

</details>

<details>
<summary>原優先清單中仍待核的 11 個字位</summary>

| 篇名 | 字／索引 | 上下文 | 具體下一步 |
| --- | --- | --- | --- |
| 王風・中谷有蓷 | 暵 · 4 | 中谷有蓷暵其乾矣有女仳 | 查切韻／廣韻同字同義的反切及本篇釋文，辨反切字在該系統中的用音；保留現有候選。 |
| 秦風・小戎 | 俴 · 2 | 小戎俴收五楘梁輈游 | 查切韻／廣韻同字同義的反切及本篇釋文，辨反切字在該系統中的用音；保留現有候選。 |
| 秦風・小戎 | 靷 · 13 | 輈游環脅驅陰靷鋈續文茵暢轂 | 對照影印或另一版本，確認朱注㣧與釋文之忍的原字，再按引軸義比較上／去音。 |
| 檜風・匪風 | 鬵 · 39 | 能亨魚溉之釜鬵誰將西歸懷之 | 先補㝷／尋對應以說明朱氏選讀，同時保留釋文明載尋／岑二音，不宣稱唯一。 |
| 小雅・北山之什・小明 | 除 · 55 | 我往矣日月方除曷云其還歲聿 | 先核直盧的影印或他本；分開標注朱氏去聲與其他家月令解釋，不能直接歸無爭議。 |
| 大雅・文王之什・皇矣 | 阮 · 220 | 恭敢距大邦侵阮徂共王赫斯怒 | 查切韻／廣韻同字同義的反切及本篇釋文，辨反切字在該系統中的用音；保留現有候選。 |
| 大雅・生民之什・板 | 蹻 · 111 | 夫灌灌小子蹻蹻匪我言耄爾用 | 查切韻／廣韻同字同義的反切及本篇釋文，辨反切字在該系統中的用音；保留現有候選。 |
| 大雅・蕩之什・蕩 | 喪 · 186 | 沸如羹小大近喪人尚乎由行內 | 查切韻／廣韻同字同義的反切及本篇釋文，辨反切字在該系統中的用音；保留現有候選。 |
| 大雅・蕩之什・雲漢 | 假 · 297 | 星大夫君子昭假無贏大命近止 | 以本篇假至義和格庚入至義互證，另建有來源的借讀候選；不要全局給假增音。 |
| 大雅・蕩之什・烝民 | 茹 · 138 | 人亦有言柔則茹之剛則吐之維 | 查切韻／廣韻同字同義的反切及本篇釋文，辨反切字在該系統中的用音；保留現有候選。 |
| 魯頌・有駜 | 駽 · 71 | 駜有駜駜彼乘駽夙夜在公在公 | 查切韻／廣韻同字同義的反切及本篇釋文，辨反切字在該系統中的用音；保留現有候選。 |

</details>

<details>
<summary>本輪新發現的異讀與待核通例</summary>

| 篇名 | 字／索引 | 保留理由 | 出處 |
| --- | --- | --- | --- |
| 爲政第二 · 1 | 共 · 15 | 本句古注有共字與鄭本拱字的讀法差別：共求用反，鄭作拱俱勇反；原音雖合拱，仍保留不同解讀。 | [002-1a](https://raw.githubusercontent.com/kanripo/KR1h0007/3deaf2c46d2849519048a43445a4d66aa3c5871f/KR1h0007_002.txt) |
| 八佾第三 · 23 | 從 · 17 | 從之之從何讀為縱、鄭解八音皆作；已定位原音所屬何家，但未消除古注解讀差别。 | [003-21a](https://raw.githubusercontent.com/kanripo/KR1h0007/3deaf2c46d2849519048a43445a4d66aa3c5871f/KR1h0007_003.txt) |
| 述而第七 · 15 | 食 · 4 | 本句食古注明列如字與音嗣兩讀，不據原音抹去另一說。 | [007-9a](https://raw.githubusercontent.com/kanripo/KR1h0007/3deaf2c46d2849519048a43445a4d66aa3c5871f/KR1h0007_007.txt) |
| 述而第七 · 26 | 亡 · 19 | 亡而爲有之亡古注明列如字與音無兩說；即使義可訓無亦不縮成一讀。 | [007-12b](https://raw.githubusercontent.com/kanripo/KR1h0007/3deaf2c46d2849519048a43445a4d66aa3c5871f/KR1h0007_007.txt) |
| 鄉黨第十 · 8 | 食 · 101 | 疏食之食古注明列音嗣又如字；保留多讀。 | [010-12b](https://raw.githubusercontent.com/kanripo/KR1h0007/3deaf2c46d2849519048a43445a4d66aa3c5871f/KR1h0007_010.txt) |
| 陽貨第十七 · 21 | 期 · 41 | 期可的期，音義另注居宜反；不能把本章前一期音基直接套用到此，原注 ki 與古注仍待比對。 | [017-14a](https://raw.githubusercontent.com/kanripo/KR1h0007/3deaf2c46d2849519048a43445a4d66aa3c5871f/KR1h0007_017.txt)；[017-14a](https://raw.githubusercontent.com/kanripo/KR1h0007/3deaf2c46d2849519048a43445a4d66aa3c5871f/KR1h0007_017.txt) |
| 子張第十九 · 2 | 亡 · 18 | 亡雖訓無，本句音義明言亡如字無也；原注卻讀無音，語義一致不足以取消讀法差別，留待考證。 | [019-1b](https://raw.githubusercontent.com/kanripo/KR1h0007/3deaf2c46d2849519048a43445a4d66aa3c5871f/KR1h0007_019.txt) |
| 邶風・雄雉 | 忮 · 57 | 《釋文》同篇不忮另有韋昭音洎；屬明載異讀，依本次範圍暫不選。 | [KR1c0009_SBCK_002-11b](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_002.txt)；[KR1g0003_SBCK_005-12a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 鄭風・溱洧 | 渙 · 4 | 本篇原注明列另一讀法，依本輪要求保留。 | [KR1g0003_SBCK_005-27a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 鄭風・溱洧 | 渙 · 5 | 本篇原注明列另一讀法，依本輪要求保留。 | [KR1g0003_SBCK_005-27a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 魏風・葛屨 | 摻 · 9 | 《釋文》本篇摻摻列所銜、所感、徐息廉等，不應因朱注首音而掩去明列異音。 | [KR1c0009_SBCK_005-12a](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_005.txt)；[KR1g0003_SBCK_005-29b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt) |
| 唐風・山有樞 | 婁 · 13 | 朱注明列力侯、力俱二反，保留兩讀。 | [KR1c0009_SBCK_006-2b](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_006.txt) |
| 陳風・宛丘 | 湯 · 2 | 朱注他郎他浪二反；釋文又記舊他浪反，保留明列異讀。 | [KR1c0009_SBCK_007-1b](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_007.txt)；[KR1g0003_SBCK_006-1a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 曹風・下泉 | 愾 · 24 | 本篇原注明列另一讀法，依本輪要求保留。 | [KR1g0003_SBCK_006-5b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 曹風・下泉 | 愾 · 40 | 本篇原注明列另一讀法，依本輪要求保留。 | [KR1g0003_SBCK_006-5b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・鹿鳴之什・四牡 | 駸 · 86 | 本篇原注明列另一讀法，依本輪要求保留。 | [KR1g0003_SBCK_006-9b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・鹿鳴之什・四牡 | 駸 · 87 | 朱注侵寢二音；釋文楚金與字林七林的聲母也待辨，保留明列異讀。 | [KR1c0009_SBCK_009-5a](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_009.txt)；[KR1g0003_SBCK_006-9b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・鹿鳴之什・常棣 | 歎 · 47 | 《釋文》本篇明列吐丹反又吐旦反以協上韻，依本次指示保留有明列又音的詞位。 | [KR1c0009_SBCK_009-8a](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_009.txt)；[KR1g0003_SBCK_006-10a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・祈父之什・斯干 | 去 · 63 | 「鳥鼠攸去」的離去／除去解釋未能排除其他讀法；《洪武正韻牋》丘於切平聲條直接引本句，《康熙字典》亦引《韻會》《正韻》及《正字通》同驅說。這是本句有據別讀，暫不以《廣韻》離也單一定為去聲；晚出韻書與切韻音系及協韻的關係仍待核。 | [KR1c0009_SBCK_011-7a](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_011.txt)；[原文](https://ytenx.org/zim?dzih=%E5%8E%BB&dzyen=1&jtdt=1&jtkb=1)；[同文書局本164頁第10字；武英殿本761頁第3字](https://www.kangxizidian.com/kxhans/%E5%8E%BB) |
| 小雅・祈父之什・正月 | 烕 · 256 | 《釋文》呼悅反標齊人語，又列字林武劣反，屬跨來源明列讀法，暫不消歧。 | [KR1c0009_SBCK_011-20a](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_011.txt)；[KR1g0003_SBCK_006-21a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・小旻之什・大東 | 潸 · 28 | 釋文潸焉所姦反外又引說文山晏反，依本輪排除明列不同讀法的範圍暫不選。 | [KR1c0009_SBCK_012-23a](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_012.txt)；[KR1g0003_SBCK_006-27a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・小旻之什・四月 | 盡 · 88 | 盡瘁的竭盡義不足以單獨排除精母；《釋文》「能盡：津忍反後放此」是待核的跨篇通例，而精母義例亦不限於「盡前盡後」。暫保留候選，待釐清通例在本句的適用範圍，不據接近義強定從母。 | [KR1c0009_SBCK_012-27b](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_012.txt)；[KR1g0003_SBCK_005-8a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt)；[原文](https://zdic.net/hant/%E7%9B%A1) |
| 小雅・北山之什・北山 | 盡 · 79 | 盡瘁的竭盡義不足以單獨排除精母；《釋文》「能盡：津忍反後放此」是待核的跨篇通例，而精母義例亦不限於「盡前盡後」。暫保留候選，待釐清通例在本句的適用範圍，不據接近義強定從母。 | [KR1g0003_SBCK_005-8a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt)；[原文](https://zdic.net/hant/%E7%9B%A1) |
| 小雅・北山之什・楚茨 | 盡 · 278 | 《康熙字典》即忍／子忍切條直接引「維其盡之」，精母並不限於「盡前盡後」；《釋文》另有「能盡：津忍反後放此」通例，《集傳》本字則將子忍反列為協韻。常音／協韻及通例適用範圍須續核，暫撤回單定從母。 | [KR1c0009_SBCK_013-10b](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_013.txt)；[KR1g0003_SBCK_005-8a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_005.txt)；[KR1c0009_SBCK_013-10b](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_013.txt)；[原文](https://zdic.net/hant/%E7%9B%A1) |
| 小雅・桑扈之什・頍弁 | 蔦 · 72 | 本篇原注明列另一讀法，依本輪要求保留。 | [KR1g0003_SBCK_006-31a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・桑扈之什・角弓 | 瘉 · 47 | 「同上」實回指前句瘉的「預與二音」，不是可單值展開的格式；須保留兩音。 | [KR1c0009_SBCK_014-14a](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_014.txt)；[KR1c0009_SBCK_014-14a](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_014.txt) |
| 小雅・都人士之什・白華 | 懆 · 75 | 《釋文》列七感反、說文七倒反，朱注七到反亦不一致，待分辨轉寫及不同讀法。 | [KR1c0009_SBCK_015-6b](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_015.txt)；[KR1g0003_SBCK_006-36b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 小雅・都人士之什・漸漸之石 | 漸 · 1 | 釋文漸漸之石明列士銜反與沈時銜反，不能據朱氏首注直接刪另一讀。 | [KR1c0009_SBCK_015-9a](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_015.txt)；[KR1g0003_SBCK_006-37a](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_006.txt) |
| 大雅・文王之什・大明 | 挾 · 22 | 《釋文》本篇子燮反、一作子協反；先保留明列不同反切，不在本輪強選。 | [KR1c0009_SBCK_016-7a](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_016.txt)；[KR1g0003_SBCK_007-1b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・生民之什・生民 | 副 · 52 | 本篇原注明列另一讀法，依本輪要求保留。 | [KR1g0003_SBCK_007-7b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・生民之什・民勞 | 汔 · 4 | 《釋文》許一反外還列說文巨乞反，並有毛危／鄭幾解釋，按本輪範圍留待核。 | [KR1c0009_SBCK_017-22b](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_017.txt)；[KR1g0003_SBCK_007-11b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・生民之什・板 | 殿 · 147 | 本篇原注明列另一讀法，依本輪要求保留。 | [KR1g0003_SBCK_007-12b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 大雅・蕩之什・蕩 | 喪 · 186 | 朱注同時標息浪反與呼平聲，不能只取首列去聲；保留常音及平聲提示的關係待查。 | [KR1c0009_SBCK_018-3a](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_018.txt) |
| 大雅・蕩之什・蕩 | 揭 · 250 | 朱注明列紀竭、去例二反，依本輪範圍保留。 | [KR1c0009_SBCK_018-3b](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_018.txt) |
| 大雅・蕩之什・雲漢 | 假 · 297 | 《釋文》昭假音格毛至鄭升並列沈云鄭古雅反，本輪不處理此種明列分歧。 | [KR1c0009_SBCK_018-21a](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_018.txt)；[KR1g0003_SBCK_007-17b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 周頌・閔予小子之什・絲衣 | 吳 · 29 | 《釋文》本篇記舊如字與㕦音話，另有字誤說，屬明載版本／讀法分歧，保留。 | [KR1c0009_SBCK_019-24b](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_019.txt)；[KR1g0003_SBCK_007-28b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 魯頌・駉 | 伾 · 54 | 《釋文》本篇有敷悲反與字林父之反音丕，朱注符丕又不同；保留明列材料的分歧。 | [KR1c0009_SBCK_020-2b](https://raw.githubusercontent.com/kanripo/KR1c0009/efc202d5265c368b0ea6e54850872ff4b5aef667/KR1c0009_020.txt)；[KR1g0003_SBCK_007-29b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 商頌・長發 | 芒 · 10 | 本篇原注明列另一讀法，依本輪要求保留。 | [KR1g0003_SBCK_007-34b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |
| 商頌・長發 | 芒 · 11 | 本篇原注明列另一讀法，依本輪要求保留。 | [KR1g0003_SBCK_007-34b](https://raw.githubusercontent.com/kanripo/KR1g0003/31270f868a66396f7dc16d02e19518effe14cb90/KR1g0003_007.txt) |

</details>

<details>
<summary>《論語》14 段原對齊問題（已修復；缺音與另讀仍保留）</summary>

| 篇段 | 字數 | 已定位的問題 |
| --- | --- | --- |
| 學而第一 · 15（poly-analects-15） | 64 | 「告諸往而知來者」末句原音作 kauh cjo yangx nji lai cjax，缺「知」對應音節。 |
| 里仁第四 · 18（poly-analects-84） | 14 | 正文「而內省也」，原音 nji nuaih ziih siengx jax，多出 ziih（自）；需核對「內自省」本。 |
| 述而第七 · 13（poly-analects-167） | 21 | 正文「爲樂之至於斯也」，原音 ye ngruk cji cjiih sie jax，缺「於」音節。 |
| 泰伯第八 · 3（poly-analects-195） | 39 | 原音「如履薄冰」前缺正文「如臨深淵」四字。 |
| 子罕第九 · 9（poly-analects-222） | 22 | 原音連續重複 kua cji（過之）兩次，而正文只有一次。 |
| 子罕第九 · 10（poly-analects-223） | 60 | 正文「循循然善誘人」，原音 zsyn zsyn zjenx jux njin，缺「然」。 |
| 先進第十一 · 21（poly-analects-282） | 84 | 原音「由也問聞斯行諸」對應 ju jax myonh myon myon sie ghrang cjo，重複 myon。 |
| 憲問第十四 · 38（poly-analects-403） | 36 | 正文「何爲其莫知子也」，原音 gha yeh mak trie cix jax，缺「其」。 |
| 衞靈公第十五 · 42（poly-analects-455） | 49 | 正文「子曰然故相師之道也」，原音 cix yat koh siangh srii cji daux jax，缺「然」。 |
| 陽貨第十七 · 21（poly-analects-489） | 137 | 正文末尾「於其父母乎」，原音 qio byox mux gho，缺「其」。 |
| 微子第十八 · 6（poly-analects-500） | 143 | 正文「且而與其從…」，原音 chiax jox gi zyung…，缺「而」。 |
| 子張第十九 · 8（poly-analects-513） | 10 | 末字「文」原音 myon (myonh) 是平／去括注兩讀，現解析器算成兩音節而令全段未配對。 |
| 子張第十九 · 12（poly-analects-517） | 78 | 正文「子夏聞之曰噫言游過矣」，原音 cix ghrax myon cji yat ngian ju kuah ix，缺「噫」。 |
| 子張第十九 · 24（poly-analects-529） | 62 | 正文「無可得而踰焉」，原音 myo tok nji jyo ien，缺「可」。 |

</details>
