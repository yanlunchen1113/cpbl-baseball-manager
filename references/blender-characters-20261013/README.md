# Blender 個別人物初版 · 2026-10-13

## 實際查看的參考

- 范國宸官方球員照片：https://www.fubonguardians.com/content/info/PlayersDetail.aspx?id=12nYuNmueOo%3d
- 曾峻岳官方球員照片：https://www.fubonguardians.com/content/info/PlayersDetail.aspx?id=OUiNRcpReV0%3d
- 官方身高體重：范國宸 185 cm / 99 kg；曾峻岳 176 cm / 88 kg。個別人物覆蓋舊名單的造型尺寸，不改比賽數據。
- 范國宸官方全壘打回顧：https://www.youtube.com/watch?v=RYhdTCVO2ys
  實際播放並逐格查看 0–3.4 秒（2025-04-22 第一段打席）；不是分析整支影片。
- 曾峻岳官方比賽片段：https://www.youtube.com/watch?v=6S478_i36Lc
  實際播放並逐格查看 17.0–18.2 秒；起始準備姿勢在切鏡前未完整顯示。

## 實際觀察

范國宸：右打、握棒在後耳附近，前左膝明顯抬起蓄力；約 2.4–2.6 秒前脚落地接腰部旋轉；2.6–2.8 秒延伸；3.0–3.4 秒仍雙手持棒，棒子在高處完成收棒。這個初版保留雙手收棒，不把別人的單手釋放套給他。

曾峻岳：右投，17.0 秒抬左膝、雙手位置較低；17.2 秒分手跨步；17.4 秒手套前伸，投球臂向下往後；17.6 秒骨盆打開、前臂抬起；17.8 秒投球臂往手套側收、後腿抬起；18.2 秒恢復平衡。

官方正面照片：范國宸臉形較長、頰部及下顎較寬柔；曾峻岳臉形較緊湊、眉較平厚、嘴唇較飽滿。帽下髮線和頭頂沒有完整證據。

## 推估與製作範圍

- 臉形為原有 CC0 MakeHuman 頭部的照片參考 shape key，非掃描或精準肖像重建。
- 頭部貼圖由影像工具以官方照片與只含頭部的 UV 版型產生；已做模型 UV 對位。不得把生成貼圖當實拍。
- 身體仍使用原有 MakeHuman 網格。Blender 工程含兩人的骨架、頭部 shape key、動作控制曲線、手腳 IK 編輯示意。
- Blender `AUTO_CLAMPED` 曲線按 20 ms 匯出，再交給現有遊戲 IK，維持握棒、出手點與地面接觸。時間、角度、關節距離是人工推估，並配合現有遊戲時序，非逐格動作捕捉。
- Blender 內 IK 動作是可編輯工作底稿；場上接觸與裝備適配由現有執行層完成。還未全面改成 glTF / AnimationMixer 動作管線。
- 投手接回傳球繼續採用獨立接球、手套口取球與走回投手板的流程。

## 檔案

- `assets/players/blender/fubon-individual-prototypes.blend`：本機可編輯工程，貼圖已打包。
- `scripts/build_blender_characters.py`：可重建工程和匯出資料。
- `data/character-authoring.json`：人工編輯控制點與形狀參數。
- `assets/players/characters/manifest.json`：實際 Blender 曲線採樣和頭部頂點差值。
- `character-preview.html`：正面／側面臉部、專屬動作、蓄力抬腿、時間滑桿。

逐格截圖保存在本目錄。`tseng-16.0.png` 是切鏡到跑者的畫面，未用作投手動作參考。

## 初版限制

個別人物功能目前只在 `character-preview.html` 啟用。臉部生成貼圖仍需手工雕修和精準 UV 清理，尤其眼周、唇部和帽下髮線；此版供造型與動作方向檢視，尚不視為最終肖像。
