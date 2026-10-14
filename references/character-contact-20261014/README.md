# 握球、外野持球、布料法線與頸部（2026-10-14）

## 參考與實際觀察

- 重新實際查看使用者 `images-15.jpeg` 投手實拍：握球是手指接觸球，不能把球定位在腕部；照片解析度不足以考證完整縫線指法。
- 實際查看已保存的 CPBLTV 范國宸打擊準備影格 `references/blender-characters-20261013/fan-2.4.png`，原影片 https://www.youtube.com/watch?v=RYhdTCVO2ys 。頭轉向來球，頸部保持與肩部連續。此輪查看保存影格，未宣稱重播整支影片。
- 閱讀 [Rawlings Tigers 四縫線握球教學](https://www.rawlingstigers.com/uploads/vip/704-4-seam-fastball-grip-and-overview.pdf) 的文字內容：食指、中指負責主要握持，拇指支撐，掌心保留空間；網頁工具未能顯示 PDF 圖片，不宣稱實際看過其中照片。
- [MLB 四縫線說明](https://www.mlb.com/glossary/pitch-types/four-seam-fastball) 僅作文字交叉核對。
- 原網格與手指權重：[MakeHuman CC0 base.obj](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/3dobjs/base.obj)、[default_weights.mhw](https://github.com/makehumancommunity/makehuman/blob/master/makehuman/data/rigs/default_weights.mhw)。`scripts/build_hand_rig.py` 以原 UV 對應現有頂點，並用腕、食指、小指關節校準手指位置。

## 修改

1. 手指新增獨立三節骨、保留原權重過渡。握球使用有角度限制的指尖定位與指節避球修正，避免通用握拳形變擠縮手指；球位依指根、腕姿及人物比例定位。持球姿態快取，出手後160ms逐漸鬆開。這是通用握球姿態，非每種球路或球員的實測指法。
2. 外野接殺或接球後持球歸屬持續到實際換手、出手；接殺無後續傳球也維持手套依附，不回到固定落點座標。接傳與接殺兩種情境分別人工查看。
3. 球衣與內搭在 UV／三角形分界共用平均法線，保留貼圖座標與蒙皮，移除逐面明暗造成的分格；個人臉型與握棒形變重算法線時採同樣處理。
4. 下頸、上頸、頭部三段分攤轉角，調整蒙皮過渡並限制轉頭幅度，避免短頸部集中扭轉。新增「轉頭近景」與「握球近景」供兩側人工檢視。

模型尺寸、角度限制、指腹間隙與160ms鬆手時間是動畫設計推估，並非人體量測。人工檢視不等於所有球員、所有球路及所有動作的碰撞保證。


## 球種、縫線與鏡頭（32.0-preview16）

### 實際查看的裝備與握法

- [Rawlings ROMLB 官方實拍](https://www.rawlings.com/product/ROMLB.html)：實際開啟官方產品照片，觀察兩片皮革的彎曲交界、成對紅線與針孔；近景的縫針沿皮片邊緣，不是球面上繞一圈紅色鐵絲。模型皮片邊界仍為曲線近似，沒有宣稱工廠裁片的精確展開尺寸。
- [Driveline 四縫線](https://drivelinebaseball.com/blogs/blog/how-to-throw-a-four-seam-fastball)：實際查看其手部旋轉 GIF；兩指跨寬縫，拇指在另一側，出手產生後旋。
- [Driveline 二縫線／伸卡](https://drivelinebaseball.com/blogs/blog/how-to-throw-a-sinker-or-two-seam-fastball)：實際查看握球 GIF；兩指順窄縫，兩球種握法有重疊，不能硬做成完全不同手型。出手旋轉分量造成不同表現。
- [Driveline 曲球](https://drivelinebaseball.com/blogs/blog/how-to-throw-a-curveball)：實際查看握球 GIF；中指靠縫、拇指對側支撐，持球較深。教學文字說明前旋。
- [Driveline 滑球](https://drivelinebaseball.com/blogs/blog/how-to-throw-a-slider)：實際查看 SL 1 的握球 GIF 及出手慢速 GIF；雙指偏置，側旋與陀螺旋混合。頁面另一個影片元件顯示無法播放，不宣稱看過。

### 文字交叉核對，未當作已播放影像

- [Driveline 卡特](https://drivelinebaseball.com/blogs/blog/how-to-throw-a-cutter)：兩指相鄰偏置、拇指支撐，保留較多後旋，混合側旋及陀螺旋。
- [Driveline 變速](https://drivelinebaseball.com/blogs/blog/how-to-throw-a-changeup)：本次採 CH 2 類型，以中指、無名指主控；變速球並非只有圈指握法。
- [Driveline 指叉](https://help.drivelinebaseball.com/portal/en/kb/articles/pitch-grips-splitters)：兩指分開、減少轉速；從兩指內側離手，不能當成普通快速球指尖滾出。
- [MLB 橫掃球](https://www.mlb.com/glossary/pitch-types/sweeper)：有多種握法；採二縫滑球家族的代表姿態，增加側旋分量。
- [MLB 蝴蝶球](https://www.mlb.com/glossary/pitch-types/knuckleball)：屈指抵球、接近無旋轉。未取得這個遊戲球員的手部近拍。
- [MLB forkball](https://www.mlb.com/glossary/pitch-types/forkball)：深叉握與 splitter 不同。遊戲「指叉球」目前採 splitter 代表，沒有把所有球員都認定為同一個深叉握法。
- [St Paul RBI 教練教材](https://www.stpaul.gov/sites/default/files/Media%20Root/Parks%20%26%20Recreation/St%20Paul%20RBI%20BB%20and%20SB%20fundamentals%202018.pdf)：提供掌心變速球參考入口；掌心球採深持球、多指包覆的示意，尚無個別投手握法測量。

### 實作與推估的界線

| 遊戲名稱 | 代表握法 | 顯示旋轉 |
| --- | --- | --- |
| 快速球、四縫線 | 兩指跨縫、拇指支撐 | 後旋 |
| 二縫線 | 兩指沿窄縫 | 傾斜後旋 |
| 伸卡球 | 二縫家族，手指輕微偏置 | 增加側旋分量 |
| 卡特球 | 雙指靠攏偏置 | 後旋、少量側旋與陀螺旋 |
| 滑球 | 中指靠縫，食指相鄰 | 側旋與較多陀螺旋 |
| 橫掃球 | 二縫滑球家族 | 側旋較多 |
| 曲球 | 持球較深、中指靠縫 | 前旋與側旋 |
| 變速球 | 中指、無名指主控 | 傾斜後旋、側旋 |
| 指叉球 | 食中指分開 | 較低轉速 |
| 掌心球 | 深持球，多指包覆 | 減速後旋示意 |
| 蝴蝶球 | 屈指抵球 | 極低旋轉 |

- `pitch-mechanics.js` 的 RPM、軸向、指距、指關節限制及持球深度為球種家族的動畫調校值，**不是曾峻岳或其他中職球員的實測資料**；不同球員仍可能有自己的版本。
- 同一顆實際半徑 0.037m 的球，使用一條閉合皮片交界與108組成對縫針。球不因離鏡頭遠而變大，也沒有發光材質或光暈。
- 握持時球的朝向隨腕部；投球離手姿態在1100ms計算，旋轉角使用「出手到本壘距離 ÷ 真實球速」乘以飛行進度，因此慢播不會多轉數圈。左右投旋轉軸依軸向量的鏡射規則處理，後旋不會因換手變成前旋。
- 球種選單可看握球與「縫線旋轉近景」。近景移動的是相機，模型尺寸相同。
- 一般轉播以固定機位轉向與平滑 FOV 變化追球，球接近守備員時才逐漸帶入接球構圖。鏡頭不保證所有寬景同時看清逐針縫線；縫針辨識使用近景與慢播。
- 原有球路仍是遊戲的曲線模型，沒有宣稱縫線空氣動力 CFD、SSW 或逐球實測軌跡已完成。


### 最後人工檢視與補正

- 全部11個球種家族（「快速球」是四縫線別名）已切換握球近景查看。重點另外查看四縫線／指叉的指距、中指無名指變速、掌心與屈指握法；左右手查看握球及縫線近景。
- 舊的單一手掌定位會使球坐在不正確位置，迫使手指過度握拳。改為同時求解球在手掌中的位置與關節彎曲，接觸半徑包含指腹厚度；沿各指節取樣避球，保留張指角度與屈伸限制。這是局部幾何約束，不是全身軟組織碰撞模擬。
- `build_hand_rig.py` 額外用各關節附近48個原始頂點／實際網格對應做局部線性校準，避免用腕部三點的單一轉換外推所有指尖。
- 頸部再次補正：頭部蒙皮在下顎高度以前完成過渡，避免把下顎混進頸部的扭轉；以兩側近景查看。球衣與藍色內搭的三角片明暗分格已改為平滑法線。
- 外野接傳人工停在取球階段，持球歸屬為 throwing-hand；接殺持球為 glove。接球後不再顯示固定在原落點的自由球。
- 外野飛行人工停格，FOV約5.52°、半徑0.037m，白球約5個CSS像素。窄景由鏡頭達成，模型沒有放大。
- 未新增或執行自動測試；使用語法診斷與瀏覽器人工檢視。這些視角不構成所有球員、所有動作的全域碰撞保證。

- 縫線軸校準：四縫線以模型縫線的四交點軸、二縫線以二交點軸對齊出手旋轉軸。修正值固定在該手腕座標中，蓄力到離手共用，避免出手時突然換縫線方向。不同球種的出手前前臂旋轉採有限幅度、連續淡入淡出，幅度是參考教學後的動畫推估，非球員實測關節角。
