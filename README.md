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
