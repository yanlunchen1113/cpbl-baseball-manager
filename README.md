# CPBL Baseball Manager

HTML, CSS and JavaScript baseball game with a Three.js stadium and touch controls.

## Data and music

- Daily roster snapshot: CPBL official player directory. The scheduled workflow runs at 04:17 Asia/Taipei.
- Throwing and batting hands: 502 official player profiles at the time of this update. `data/player-traits.json` retains player identifiers and factual attributes.
- Pitch repertoires: Taiwan Baseball Wiki descriptive profiles. 173 pitchers have documented repertoires; other pitchers use explicitly generic fastball/breaking-ball game settings. These descriptions are not live pitch tracking or a guarantee of a current repertoire.
- Cheer arrangements: 153 public downloadable 2020 MIDI arrangements by Toshihiko Hayashi, from https://drive.google.com/drive/folders/1joT1RlpZJ3fUD3UbN-nUP7FCi2BK51oE . The game synthesizes a single lead melody from the downloaded note data; no separate background track is mixed in. These are not recordings of current stadium vocals. Details are in `data/cheer-sources.json`. Hawks audio uses the existing team-hosted MP3 catalog.

## Regression checks

Run `node scripts/check_physics.cjs` for 13 pitch types, both throwing hands, and 20,000 batted-ball plays. Run `node scripts/check_long_games.cjs` for 24 complete games using the actual game state and Three.js scene transforms. The latter mocks the WebGL renderer and does not substitute for device/GPU testing.

WebGL errors pause the scene and context recovery keeps the 3D renderer. Devices that cannot initialize WebGL still use the 2D fallback. Stadium figures and uniforms are procedural illustrations.

## Situational fielding

`baseball-rules.js` plans force outs, double plays, fielders choices and tag-ups using ball/runner arrival times. A third force out cancels scoring; a sacrifice fly requires a caught fly, fewer than two outs and a runner scoring after tagging up. Rule reference: [CPBL rules and umpire manual](https://cpbl.com.tw/theme/client/download/2021CPBL%E8%A3%81%E5%88%A4%E5%9F%B7%E6%B3%95%E6%89%8B%E5%86%8A%E8%A6%8F%E5%89%87%E8%A3%9C%E8%BF%B0_0608%E7%89%88.pdf). The current implementation is a simplified simulation, not an exhaustive rules engine.

`audio/cheer-*.wav` contains short pre-rendered instrumental chance arrangements from the same credited MIDI collection, for reliable native playback on phones. No vocal recording was found at a verified downloadable source during this update. These fan arrangements are not asserted to be public domain.

### v21 投打動作

- 模型使用骨盆 → 軀幹 → 肩肘的階層；腳部以雙關節反向運動學維持支撐與跨步。
- 投球包含抬腿、重心移動、髖肩分離、出手、前傾及回復；左右投共用鏡像姿勢，出手手掌仍與球路起點同步。
- 揮棒包含蓄力、轉髖、延伸、完整收棒；第一人稱顯示球棒、握棒手套及前臂，擊球後保留收棒動畫。
- 動作參考：[Driveline 揮棒動作分析與動作捕捉示例](https://drivelinebaseball.com/blogs/blog/introduction-to-hitting-biomechanics)、[USA Baseball 投球教學影片](https://www.usabaseball.com/video/diamond-doc-the-throwing-motion)、[Washington State University 投球教學手冊](https://cdn2.sportngin.com/attachments/document/802c-3330691/Pitching_Manual_-_Final.pdf)。以程序動畫重建動作原則，並非影片動作捕捉或球員專屬動作。

### v22 動作、空間與速度校準

- 修正轉肩方向：右投右肩先向後蓄力，再向本壘帶出手臂；左投鏡像。完整比賽檢查量測投球肩相對手套肩的前後位置。
- 捕手採雙腳支撐的蹲姿，依來球調整手套及重心；主審在打者側的 slot，與捕手分開。面罩使用弧形護條，好球帶改為透明細框。
- 官方資料：2026 中職進階數據 174 位打者 PR 表的擊球初速平均值、最高值。快照見 `data/motion-calibration.json`，2026-10-06 擷取。無個人資料者採聯盟基準平均 135.75 km/h、最高 195.86 km/h。遊戲初速另受擊球品質與強振影響，個人最高值為上限；非逐打席實測重播。
- 球運動：每 25 ms 積分，初速由 km/h 轉 m/s；重力 9.81 m/s²、二次阻力及簡化後旋升力。落地後彈跳損耗，土面及草面摩擦減速；撞牆與越牆分開。接球依守備者能否及時到達截球點決定。
- 動作：跑步步頻以移動距離驅動，加入屈膝、屈肘、軀幹反向擺動及轉壘。接球、換手、轉肩、傳球、接應分階段；傳球依距離及 30 m/s 計時，拋物線高度隨飛行時間變化，接應手套位於身體前方。
- **模型估計參數**：反應 0.22 秒、加速 5 m/s²、守備上限 7.7 m/s、跑者上限 8.1 m/s；土面 2.8 m/s²、草面 1.7 m/s² 減速。這些與落地恢復係數、升力、換手時間均非中職逐人逐場實測。投球仍保留手機觸控的放慢播放；程序模型無動作捕捉或完整人體碰撞解算。
- 參考：[中職官方進階數據](https://stats.cpbl.com.tw/players/0000007239)、[MLB Sprint Speed](https://www.mlb.com/glossary/statcast/sprint-speed)、[Illinois 棒球空氣力學](https://baseball.physics.illinois.edu/aero.html)、[Baseball Canada 捕手姿勢](https://baseball.ca/?alias=playing-catcher-part-1&lang=english)、[WSU 投球教學](https://cdn2.sportngin.com/attachments/document/802c-3330691/Pitching_Manual_-_Final.pdf)。
- 重建：`python3 scripts/build_motion_calibration.py <官方球員頁HTML>`。檢查：`node scripts/check_motion.cjs`、`node scripts/check_physics.cjs`、`node scripts/check_rules.cjs`、`node scripts/check_long_games.cjs`。完整比賽檢查包含狀態與 Three.js CPU 場景，未模擬手機 GPU。
# v23：打擊方向、鏡頭切換與球場參考

- 左打、右打的透明接觸球棒鏡像顯示；方向在 v24 再次校正。擊球後以當次打者資料維持用手，避免打序更新使方向跳動。
- 全螢幕先追蹤飛行、落地、滾動與拾球；野手取得球後切至內野跑壘／傳球鏡頭。兩個鏡頭使用同一組公尺座標與球員身高，沒有分割畫面。
- `stadium-data.js` / `data/stadiums.json` 包含 2026 一軍例行賽的 11 座球場。單場可選球場；賽季使用主隊預設球場，尚未逐場重現官方實際場地安排。
- 外野牆距離、標示、碰牆與全壘打判定共用場地資料。兩翼與中外野之間的牆線為插值模型，未取得完整實測輪廓；建築為簡化模型，包含大巨蛋封閉屋頂、天母公園外野、洲際縫線屋頂、花蓮草坡、臺東山景等特色。
- `wallHeight:null` 表示沒有確認的實測牆高；`modelWallHeight` 為暫用遊戲參數，不能當作官方數值。大巨蛋、亞太主場、嘉義市的距離另標記為待第一手文件確認，沒有假裝已取得官方完整建築圖。
- 名單內所有投手都保有速球選項。已查到四縫線、二縫線、伸卡或卡特的投手沿用資料；缺乏明確速球種類時使用「快速球」，不捏造四縫線資料。移除可選球種「變化球」；未知其他球種時只提供速球。
- 球種資料擷取腳本加入同一個速球保底，名單畫面與實際投球共用整理後的球種。

### 球場資料範圍與參考

2026 使用場地範圍參考[中職賽季公告](https://cpbl.com.tw/xmdoc/cont?sid=0Q055689330649348741)。距離與建築細節來源逐場保存於資料檔，沒有放在比賽 HUD。

| 球場 | 左／中／右（英呎） | 尺寸狀態 |
| --- | --- | --- |
| 大巨蛋 | 335／400／335 | 暫用，待第一手文件確認 |
| 天母 | 325／400／325 | 中職場館介紹 |
| 新莊 | 325／400／325 | 體育署場地調查 |
| 樂天桃園 | 330／400／330 | 桃園市體育局平面圖說明 |
| 洲際 | 325／400／325 | 臺中市政府球場介紹 |
| 斗六 | 330／400／330 | 中職場館介紹 |
| 亞太成棒主場 | 330／400／330 | 暫用，待第一手文件確認 |
| 澄清湖 | 328／400／328 | iPlay／中職場館介紹 |
| 嘉義市 | 350／400／350 | 暫用，待第一手文件確認 |
| 花蓮 | 320／400／320 | 花蓮縣場館介紹 |
| 臺東 | 320／400／320 | 中職場館介紹 |

## v24：球場建築、接傳球與自動轉播鏡頭

- 11 座球場重建弧形內野看台與實體看台底板。依球場配置不同層數、遮棚輪廓、洲際縫線棚架、大巨蛋放射屋架與室內照明、天母公園與都市背景、花蓮曲面草坡、臺東連續山景。新增進場全景，讓屋頂與看台在遊戲中實際可見。建築仍為照片參考的程序模型，並非建築圖精確復刻。
- 鏡頭按飛球、滾地追球、接球、傳球兩端與跑壘切換，維持單一全螢幕；切換有最短停留時間與位置、焦點、視角插值。
- 接滾地球後 850 ms、一般接球後 750 ms、轉傳 550 ms，動畫依同一時間表完成吸收來球、雙手取球、起身、跨步、肩膀轉動、出手與 650 ms 收尾。雙殺是否成立也重新使用轉傳時間判定，不靠瞬間切換姿勢。
- 跑步採用左右腳分開落地／抬腳的反向運動學，腳底依場地高度定位；投球跨步腳使用土丘坡面高度。
- 投手丘改成直徑 18 ft 的曲面土丘，投手板高 10 in，板前 6 in 起以 1 in/ft 下坡，含平頂、側坡與後坡。參考 [Official Baseball Rules 2.01 與附圖 3](https://img.mlbstatic.com/mlb-images/image/upload/mlb/ub08blsefk8wkkd2oemz.pdf)。
- 右打透明棒頭朝畫面右側，左打朝左側，對應第一人稱備棒方向。強振仍保留點狀準星。
- 一般接到投球後保持球在捕手手套，起身取球、回傳、投手接球收回，完成後才開放下一球。三出局換邊時，回傳仍沿用原守備隊投手。
- 新增三位壘審及主審判決動作，包含好球、出局、安全上壘、界外與全壘打；壞球不加手勢。動作參考 [Little League 裁判教學](https://www.littleleague.org/umpires/umpire-registry/training-materials/)。
- 長時間測試使用 CPU Three.js 場景與完整比賽狀態；不能代替真實手機 GPU 效能驗證。另用瀏覽器檢查左右打、起身傳球、捕手回傳與球場全景。

球場造型主要參考[臺中市政府洲際介紹](https://www.taichung.gov.tw/2266137/2266304/2266421/2280951)、[富邦新莊場館介紹](https://www.fubonguardians.com/content/stadium/Index)，其餘逐場來源保留於 `stadium-data.js`。

## v25：新莊實景參考與固定轉播機位

- 參考使用者提供的[緯來 10/04 統一對富邦精華](https://www.youtube.com/watch?v=F5FV0P0xgzI)，實際檢視 2:29 的中外野投球構圖、2:34 的高機位內野畫面、2:39 的傳球近景。Twitch 原連結無法播放，沒有將其當成已觀看的素材。
- 同時檢視[富邦官方新莊更新導覽](https://www.youtube.com/watch?v=qCXmY9vpFis)：4:42 夜間內野棚頂／藍色燈帶、6:35 藍色座椅與棚頂鋼架、7:32 中外野雙螢幕與中央深色打者視線背景。
- 新莊增加個別座椅與走道、中外野無座席背景、雙 LED 看板、分段膜棚／拱架、黃色牆頂與藍色外野牆、警戒區、旗幟及外野舞台。這些建築位置與尺度是從實景重建的模型估值，並非場館測繪數據。
- 投球使用固定中外野長焦機位。擊球後切到固定本壘高機位、內野側機位或跑壘機位；鏡頭只在機位內平移和變焦，避免以前的飛行追球視角。打者操作仍保留第一人稱。
- 進場可選日間／夜間。夜間使用四座燈塔投光、冷色環境光與單一陰影光源；大巨蛋維持室內光線。
- 人物改成腰胸有收放的軀幹、漸細四肢與基本面部形狀，隊名與背號分開，跑步增加支撐／擺腿階段。仍然是原創程序模型，尚不具有影片中的真人細節或動作捕捉品質，不能宣稱已達到實拍效果。

## v26：看台銜接、球場地表與個人應援

- 內野看台的兩翼改用與全壘打牆／外野座席一致的端點，並計算曲線切線，修正以前獨立橢圓與外野弧線造成的大缺口、錯誤座椅方向。外野增加連續斜面樓板，保留中外野打者視線背景與真實入口空間。
- 自然草皮球場的紅土外緣改為以投手丘附近為圓心的弧線；大巨蛋使用獨立紅色人工草皮壘線及壘包區。地面隊名與看板文字由原創 Canvas 紋理繪製，不是截取影片作為貼圖。品牌與排列是代表性配置，尚未逐片復刻各場 2026 贊助合約版面。
- 應援曲以前只有每隊一首 chance WAV 備用音檔，因此不同球員常聽到同曲。現在一般打席優先匹配球員，得點圈才切 chance；官方直接音檔優先，153 首 2020 MIDI 編曲次之，找不到個人曲時使用依姓名固定生成的原創替代旋律。歷史 MIDI 不是官方錄音，原創替代旋律也不是該球員的真實應援曲。台鋼官方下載專區目前公開的是第 1–9 棒音檔，不能冒稱每人都有獨立正版歌曲。
- 應援與其他背景音仍只保留一條音樂聲道；重複 render 不會再停止／重啟 WebAudio 應援。靜音與暫停同步控制官方檔案及合成編曲。
- 擊球、接球使用 CC0 實錄採樣，選取單次瞬態並加入輕微速度變化與場館反射；資料見 `data/sfx-sources.json`。解碼完成前使用既有合成音作備用。

逐場影片與實際查看片段記錄在 `data/stadium-visual-references.json`，部分為歷史影像。新增天母木質野餐席、斗六偏側記分板、澄清湖白色拱架、嘉義紫藍椅／黃色走道、花蓮曲線草坡、臺東後方建築；各球場警戒區沿全壘打牆輪廓繪製。

驗證：24 場完整模擬、3,292 球、225,588 影格，未捕捉到渲染錯誤；最後幾何修改另跑 11 場地 / 220 影格 smoke。瀏覽器實際切換 11 場地，確認個人選曲與 CC0 音檔解碼。CPU 模擬不等於手機長時間 GPU 測試，建模仍是風格化估算，並非實拍級重建。

## v27：各場輪廓與休息室

- 各球場分別指定座席排數、內野扇形寬度、上層席終點與棚頂覆蓋範圍，避免以前全場同一套雙層 U 型看台。天母與低層地方球場縮短棚頂，亞太保留寬闊綠色看台／包廂，洲際採寬扇形分瓣棚，澄清湖使用較深弧棚；這些仍是依既有影片作出的視覺估值。
- 移除休息室原本凸入場內的獨立白色大棚板。休息室改靠看台前緣，使用較低深色頂板、開放入口、座椅與欄杆。
- 捕手回傳維持原來的投球或打擊鏡頭，保留連續接傳球動作，取消專用回傳切鏡。

座椅另依內野下層、上層與外野分區配置獨立色票，見 `data/stadium-appearance.json`。擊球採樣只取最強瞬態，避免把錄音尾聲誤當另一種擊球；移除原有 45 ms 重複反射並縮短為 240 ms 衰減，界外與紮實擊球有音量差別。這是同一支合法錄音的重新處理，並未冒稱換成中職實況錄音。
