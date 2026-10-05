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
