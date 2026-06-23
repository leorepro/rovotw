# Atlassian Rovo — 新加坡商鈦坦科技

[rovo.titansoft.com.sg](https://rovo.titansoft.com.sg/) 的自架版本。
原站以 GoDaddy Website Builder 製作，本專案以 Vite + TypeScript 重建相同的 look and feel，
所有圖片與字型皆已下載到本機自行代管。

## 開發

```bash
npm install
npm run dev      # 本機開發（http://localhost:5173）
npm run build    # 產出 dist/
npm run preview  # 預覽 build 結果
```

## 部署（GitHub Pages）

push 到 `main` 即自動透過 `.github/workflows/deploy.yml` 部署。
GitHub repo → Settings → Pages → Source 選「GitHub Actions」。

- 部署在 `https://<user>.github.io/<repo>/`：workflow 已自動把 base 設為 `/<repo>/`
- 使用自訂網域（如 rovo.titansoft.com.sg）：移除 workflow 中的 `GHPAGES_BASE` 環境變數即可

## 專案結構

```
index.html            單頁網站全部內容（19 個 section）
src/main.ts           互動：FAQ 手風琴、Rovo Agent 輪播、活動卡捲動、表單外觀
src/analytics.ts      GA4 事件追蹤：section 曝光 / 停留時間 / Vimeo 影片播放
src/styles/main.css   版面與設計 token（配色、字級取自原站 computed styles）
src/styles/fonts.css  自架 Google Fonts（Cabin / Work Sans / Noto Sans，SIL OFL）
src/fonts/            woff2 字型檔
src/assets/           CSS 引用的圖（logo 牆背景）
public/images/        頁面圖片
reference/            原站快照與抽取腳本（original.html、spec.json 等，重建依據）
```

## GA4 事件追蹤

GA4 已透過 `index.html` 的 gtag 載入（評估 ID `G-417G3FE0Z1`），且「加強型評估」為開啟狀態，
已自動追蹤：網頁瀏覽、捲動(90%)、外連點擊、**YouTube 影片參與**。

`src/analytics.ts` 只補加強型評估「沒做」的三塊（避免重複事件）：

| 事件 | 觸發 | 主要參數 |
|------|------|----------|
| `section_view` | 每個 `<section>` 首次進畫面 ≥50% | `section_name`、`section_index` |
| `section_dwell` | 累計停留時間，於分頁隱藏/關閉時送出 | `section_name`、`dwell_seconds` |
| `video_start` / `video_progress` / `video_complete` | 7 支 **Vimeo** 影片播放（25/50/75%、完成） | `video_title`、`video_provider`、`video_url`、`video_percent` |

> Vimeo 事件的參數名稱刻意對齊 GA4 內建影片維度，因此 Vimeo 與 YouTube 會出現在同一張「影片標題」報表。
> YouTube 影片、外連點擊、捲動深度由加強型評估負責，`analytics.ts` 不重複追蹤。

### 本機測試

`analytics.ts` 在 `localhost` 或網址帶 `?ga_debug=1` 時會把事件同步輸出到 Console：

1. `npm run dev` → 開 `http://localhost:5173/` → F12 開 Console。
2. 捲動頁面 → 出現藍色 `[GA] section_view {...}`；播 Vimeo 影片 → `[GA] video_start` / `video_progress`；
   切到其他分頁再回來 → `[GA] section_dwell`。
3. 線上版要看 Console，網址加 `?ga_debug=1`。
4. 確認真的送到 GA：DevTools → Network → 過濾 `collect`。

### GA4 後台確認與設定

- **DebugView**（管理 → DebugView）：用 `?ga_debug=1` 開啟頁面即可（事件會帶 `debug_mode`，
  自訂事件會即時出現在 DebugView）。或安裝「Google Analytics Debugger」Chrome 擴充並開啟。
- **即時報表**（報表 → 即時）：不需 debug 模式，事件送出後即可看到，適合快速確認有沒有在送。
- **看哪支影片被看**：探索（Explore）→ 自由格式 → 維度「影片標題 / 影片來源」、指標「事件計數」、
  篩選事件名稱 `video_start`。
- **一次性設定**：管理 → 自訂定義 → 建立**自訂維度**（事件範圍）`section_name`（對應參數 `section_name`），
  停留秒數建議另建**自訂指標** `dwell_seconds`。影片相關維度為 GA4 內建，免註冊。
  自訂維度約需 24–48 小時才回填報表，DebugView / 即時報表則可立即看到。

設計細節見 `docs/superpowers/specs/2026-06-23-ga-event-tracking-design.md`。

## 注意事項

- **聯絡表單只有外觀**：送出按鈕目前不做任何事（`src/main.ts` 中 preventDefault），之後再串接後端。
- **Getty 授權圖**：`public/images/getty-170152463.jpg`（免費課程區的會議照片）原為 GoDaddy
  平台內建的 Getty 圖庫授權，授權通常綁定 GoDaddy 平台，搬離後建議更換為自有圖片。
- 影片皆為 Vimeo / YouTube 原始 embed URL，不需自行代管。
- 地圖改用標準 Google Maps embed（原站為 GoDaddy 內嵌的 Google Maps JS）。
