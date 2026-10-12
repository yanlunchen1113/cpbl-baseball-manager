# 主審朝向與界外切鏡（31.7r5.2）

修改前重新搜尋 MLB 官方界外影像及裁判指引：
https://www.mlb.com/video/home-plate-umpire-gets-hit-with-ball
https://content.mlb.com/documents/6/9/4/303607694/USA1803_Umpire_Supplement_FINAL2HIREZ.pdf
此次僅取得搜尋結果，未宣稱播放上述新增影片。

實際重新查看使用者先前提供的 `/private/tmp/cpbl-swing-review.jpg` 逐格圖，以及已保存的 `/private/tmp/cpbl-broadcast-frames/frame-0081.jpg`。前者可見投球時主審在捕手後方，面朝投手方向；後者是投手近景與本壘背景。另一張 frame-0057.jpg 是守位圖卡，不當作界外切鏡證據。本次沒有宣稱重新播放全部舊錄影。

實際查到的程式問題：主審追球後的 group rotation 會保留，但 umpirePose 只重設本壘位置與四肢；下一球可能沿用舊朝向。現在進入本壘準備姿勢時明確恢復朝向投手的角度，追球時仍依跑位及判決位置轉向。

界外球移除 foul-reaction 的打者特寫，追球／接球段後直接使用原本投球視角。這是依使用者要求的鏡頭編輯選擇，不宣稱所有真實轉播都如此。靠邊線界外球的重播資格維持原有設定。

檢查項目：主審由多個追球朝向回到左右打的本壘準備位置；普通高飛／滾地界外等待期間不能切到打者特寫。
