# 撲接起身：使用者提供的江坤宇比賽影片

參考：https://www.youtube.com/watch?v=xCfqqtMcVxE

影片頁標題「值得十年鉅約的理由！中信兄弟江坤宇三十大美技精選」，2025-01-29 上傳，包含歷年比賽。2026-10-08 在瀏覽器實際播放、暂停、逐格查看下列區段；沒有宣稱完整看完 14:22 或取得動態捕捉資料。此影片是本次主要參考，沒有用其他影片取代。

## 實際觀察

| 時間 | 畫面觀察 | 適用動作 |
| --- | --- | --- |
| 0:16–0:18.16 | 橫向撲接，胸腹接近地面，膝蓋彎曲、腳在身後；身體仍低時向二壘短傳。 | 趴地短傳，不應強制先站直。 |
| 1:47.76 | 胸腹低、雙腿延伸在後方。 | 撲接落地。 |
| 1:48.16 | 空手撐地，膝蓋向身體下收回。 | 支撐與收腿。 |
| 1:48.56–1:48.96 | 踩穩後骨盆抬升、轉入傳球；護網遮住部分上半身。 | 支撐腳建立後才站起。 |
| 10:23.847 | 完整趴地，手套朝來球方向，腿在後方。 | 落地停滑。 |
| 10:24.247 | 空手撐地、膝蓋在身體下，胸腔仍前傾。 | 明確手掌／膝蓋支撐。 |
| 10:24.647 | 腳進到身體下、抬起骨盆與胸腔，手套往身體收。 | 起身與準備換手。 |
| 12:59.488–13:00.488 | 游擊手向球移動、低姿接球，轉身跳傳；二壘手移動協防。 | 移動接球與跳傳，並不是趴地起身。 |

逐格截圖保存在本機此資料夾中，作為對照紀錄。沒有下載或重新散布完整影片。

## v31.6r8 目前套用

- 撲接落地後先停滑。空手手掌移到固定地面點，膝蓋與腳掌分先後收回。
- 先維持低胸腔／低骨盆，使支撐手臂確實伸得到地面；前腳落地後才抬升骨盆、解除手掌支撐。
- 前腳在站起期間固定，後腳較晚抬起向內踏步；仍銜接既有轉向、跑回或傳球流程。
- 預覽增加起身側面，便於直接查看支撐與收腿。

## 推估與限制

比賽影像沒有三維關節座標，部分有護網遮擋。3D 手掌位置、足部間距、相位時長、胸腔角度是依可見次序推估，不是從影片精確重建；骨盆軌跡也不是物理重心求解。

現有人體骨架只有骨盆、胸腔與四肢十個主要骨頭，缺少獨立鎖骨、頭部、手腕與腳踝控制。此修改沒有宣稱已加入完整人體 IK/FK 或動態捕捉。趴地短傳、跳傳是後续動作分支參考，本次沒有宣稱已完成這兩種新分支。

## 檢查

- 左／右投手臂 × 四個朝向，支撐手掌相位 180–460ms 的地面高度與固定位置。
- 前腳在 460–1200ms 支撐相位的固定位置與地面接觸。
- 既有左右手、蒙皮關節、撲接手掌連續性、守備接傳與運鏡檢查。
- 自動檢查只能驗證位置與連續性，動作品質仍須用實際瀏覽器不同角度觀察。

## v31.6r9: transfer possession before every throw

Revisited user video xCfqqtMcVxE at 10:24.657-10:24.857 on 2026-10-08: both hands gather at the chest after rising, then the throwing hand separates and loads. Fingers are not resolvable in this wide shot; finger gripping is not claimed as observed.

- Shared fielding throws now gather the mitt, reach the actual mitt with the free palm, hold contact, take possession, separate, load, and release.
- Before contact completes, the ball belongs to the mitt; afterward it belongs to the actual throwing palm. Removed interpolation between disconnected hands.
- Used for diving recovery, ordinary fielding and relays. Catcher return has the same explicit contact and ownership order.
- Visible throw flight begins at the solved release palm, retaining the existing destination and flight time.
- Earlier base decision poses no longer override an active relay transfer.
- Left/right throwers and low/upright gathering contact, plus catcher return contact, are checked. This does not implement finger articulation, opening mitts or motion capture.

## v31.6r10：收球轉身、捕手回傳與原地面修正

參考：MLB 官方 [Throwing Fundamentals](https://www.mlb.com/video/throwing-fundamentals)，Frank Moore，2022-02-17。2026-10-08 實際在瀏覽器播放並定格查看：0:33.298 手掌握球示範；1:18.298 手套側向目標伸出、拿球手在胸側；1:33.298 上臂抬起、前臂立起、球在手肘上方。1:48.298 是雙臂放下的畫面，沒有把它當成跨身收臂證據。影片雖不是近期上傳，使用的是官方基本傳球教學。另沿用上述使用者提供的實際美技片段。

### 套用與推估

- 依使用者指出的問題，捕手收球加入胸腔與骨盆轉動；回傳準備有整體側轉，出手後再向目標轉回。
- 手套先在胸前保留空間讓右手取球；換手完成後移向左側，避免手套與跨身收臂的右手擠在胸前。球仍依實際手套／手掌位置交接。
- 共用接傳球姿勢增加接球方向到傳球目標方向的轉身，胸前收球點前移，供一般內野、雙殺及外野中繼共用。
- 右手向對側收臂是使用者指定的修正方向；角度、軌跡、時長為三維動畫推估，沒有宣稱由影片擷取關節座標。
- 本壘紅土原本是厚度 0.04m 的圓柱，另有草皮／內野重疊層。移除這些原有重疊物件，草皮、紅土改為同一個地面網格的不同材質區域，所有地面頂點 y=0；投手丘斜坡保留。
- 本壘區域形狀沿用使用者先前提供的新莊高處全場及本壘後方照片；本次不是宣稱由空拍影像重建精確高程。既有光照、陰影與表面材質保留。

### 本次確認範圍

- 瀏覽器實際查看捕手換手、拉臂、出手、收臂的正面與側面定格，以及一般內野、雙殺第二傳、外野第一傳與中繼第二傳的選定定格。這不是逐一確認所有球員所有動畫的宣稱。
- 自動檢查左右手換手接觸、捕手向前出手與向對側收臂、胸前手套間距；11 座球場抽樣地面點只有單一表面，本壘為同高度紅土。
- 24 個球路跨六座球場運鏡檢查通過。兩場長時間模擬：214 球、119 次擊球、3,268 個取樣畫面、零場景錯誤。此輪没有取樣到後續跑壘鏡頭機會，該分支另由運鏡檢查覆蓋。
- 現有骨架仍缺獨立手腕／鎖骨；目前修正位置與相位連續性，沒有宣稱已達真人動捕品質。
