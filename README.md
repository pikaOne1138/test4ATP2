# QA43 學員站端對端測試：clinician

本 Repo 是專用 QA 測試，全部內容為測試文案。沒有正式發布同意，不得 Merge 或觸發 Production。

網站程式只取自工作坊網站下載 ZIP，來源 SHA-256：743965eef455790300ce9b47685bc4dc4f2dbe35d83276f803fb0fdffdbf3343。Site Brief 是本輪從規劃器實際下載的 site-brief.json。首頁由 clinician 原始 DOM/CSS 適配，沒有使用研究 Repo 補缺失。QA 自製 SVG 不代表人物或服務場所。

AI 維護流程：讀 AGENTS.md 與 .ai Skills，在本 Repo 的 Feature Branch 編輯內容；npm ci、npm run build；核對真正遠端 Preview SHA；學員確認後才能發布。CI screenshot Artifact 是本次 Build 的 Chromium 畫面，不是遠端網站。

公開文章位於 src/content/articles/*.md，draft:true 必須排除。noindex meta、robots Disallow 與 Cloudflare _headers 永久標記測試站；這些不提供存取控制，不可放秘密或真實健康資料。

Cloudflare Pages 專案尚未建立，首次公開 Preview 待本人批准。使用 Git integration、Preview-only 分支、npm run build、dist；Production 必須停用。GitHub Pages deploy.yml 僅 main 人工觸發，本次不使用。
