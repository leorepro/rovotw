# GA4 事件追蹤 設計文件

日期：2026-06-23
範圍：`rovotw` 單頁 landing site（`index.html` + `src/main.ts`）

## 目標

讓 GA4 能看出使用者：
1. 看了頁面的哪些區塊（section 曝光）
2. 點/播放了哪些影片（每支可獨立辨識）
3. 在哪些區塊停留比較久（section 停留時間）

## 現況

- GA4 已透過 gtag 載入（評估 ID 與 Google 代碼 ID 寫在 `index.html`，屬可公開的前端識別碼）。
- Property：`rovotw`，串流網址 `https://rovo.titansoft.com.sg`。（帳戶 ID / 資源 ID 等內部編號不寫入程式碼或文件。）
- **加強型評估已開啟**，已自動追蹤：網頁瀏覽、捲動(90%)、外連點擊、YouTube 影片參與。
- 影片：7 支 Vimeo iframe（「Rovo 實際執行範例」影片帶）、2 支 YouTube iframe（「其他參考影片」）、1 個活動卡片外連到 YouTube 觀看頁。
- `src/main.ts` 已有 IntersectionObserver（進場動畫）可參考的模式。

## 分工原則（避免重複事件）

| 項目 | 負責 | 寫程式 |
|------|------|--------|
| YouTube 影片（2 支） | GA4 加強型評估「影片參與」 | 否 |
| 活動卡片外連點擊 | GA4「外連點擊」 | 否 |
| 全站 90% 捲動 | GA4「捲動」 | 否 |
| **Vimeo 影片（7 支）** | 自訂（加強型評估不追 Vimeo） | **是** |
| **section 曝光** | 自訂 | **是** |
| **section 停留時間** | 自訂 | **是** |

> 不另外寫 YouTube IFrame API，否則會與加強型評估產生重複的 `video_*` 事件。

## 架構

新增獨立模組 `src/analytics.ts`，匯出 `initAnalytics()`，由 `main.ts` 在最後呼叫。所有事件透過安全包裝送出：

```ts
function track(name: string, params: Record<string, unknown>): void {
  if (DEBUG) console.log(`[GA] ${name}`, params)
  if (typeof window.gtag !== 'function') return
  window.gtag('event', name, params)
}
```

- `DEBUG`：當 `location.hostname === 'localhost'` 或網址帶 `?ga_debug=1` 時為 true，事件會同時 `console.log`，方便本機測試。

## 事件規格

### 1. Vimeo 影片事件

載入 Vimeo Player SDK（`https://player.vimeo.com/api/player.js`），對每個 `.video-embed iframe[src*="vimeo"]` 建立 `Vimeo.Player`，監聽 play / timeupdate / ended。

| 事件 | 觸發 | 參數 |
|------|------|------|
| `video_start` | 首次 play | `video_title`、`video_provider:"vimeo"`、`video_url`、`video_section` |
| `video_progress` | 跨越 25/50/75% | 同上 + `video_percent` |
| `video_complete` | ended | 同上 + `video_percent:100` |

- **參數名稱刻意對齊 GA4 內建影片維度**（`video_title`、`video_provider`、`video_url`、`video_percent`），讓 Vimeo 與 YouTube 出現在同一張「影片標題」報表，免註冊自訂維度。
- `video_title` 取 iframe 的 `title` 屬性；`video_url` 取 iframe `src`；`video_section` 取所在 `<section>` 的名稱。
- 每支影片各事件去重（同一門檻只送一次）。

### 2. `section_view`

- IntersectionObserver 觀察所有 `<section>`，門檻 `0.5`。
- 首次達標送一次後 `unobserve`。
- 參數：`section_name`（見命名規則）、`section_index`（DOM 順序）。

### 3. `section_dwell`

- 同一組 observer 記錄每個 section 進入/離開畫面的時間，累計可見毫秒數。
- 在 `visibilitychange`（hidden）與 `pagehide` 時，對所有「停留 > 1 秒」的 section 送出。
- 參數：`section_name`、`section_index`、`dwell_seconds`（四捨五入整數）。
- 使用旗標避免 hidden 與 pagehide 重複送出。

### section 命名規則

`section_name` 取值優先序：
1. section 的 `id`（若有）
2. 否則取區塊內第一個 `.section-heading` / `h2` 的文字（截斷至 60 字）
3. 否則 `section-{index}`

## GA4 後台一次性設定（部署後）

1. 管理 → 自訂定義 → 建立**自訂維度**（事件範圍）：
   - `section_name` → 參數 `section_name`
   - `dwell_seconds`（建議改用「自訂指標」，事件範圍，單位：標準）→ 參數 `dwell_seconds`
2. 影片相關維度（`video_title` 等）為 GA4 內建，免註冊。
3. 自訂維度需 24–48 小時才會回填到報表；DebugView/即時報表則可立即看到。

## 測試方式

1. **本機**：`npm run dev` → 開 Console，捲動/點影片，看 `[GA]` log 確認觸發與參數。
2. **網路層**：DevTools → Network → 過濾 `collect`，確認事件送出。
3. **GA4 DebugView**：安裝「Google Analytics Debugger」Chrome 擴充並開啟 → 開正式站 → DebugView 出現事件流。
4. **看哪些影片被看**：探索（Explore）→ 自由格式 → 維度「影片標題/影片來源」、指標「事件計數」、篩選事件名稱 `video_start`。

## 驗收條件

- 捲動全頁，每個 section 觸發一次 `section_view`，`section_name` 可辨識。
- 關閉分頁時，停留過的 section 送出 `section_dwell`，`dwell_seconds` 合理。
- 播放任一 Vimeo 影片觸發 `video_start`，看到 25/50/75% 觸發 `video_progress`，看完觸發 `video_complete`，皆帶可辨識的 `video_title`。
- 不產生重複的 YouTube `video_*` 事件（YouTube 仍由加強型評估負責）。
- `gtag` 不存在時不報錯。

## 不做（YAGNI）

- 不自訂 YouTube 影片追蹤（加強型評估已涵蓋）。
- 不自訂外連點擊與捲動深度（加強型評估已涵蓋）。
- 不加 cookie consent 機制（沿用現況，GA 本即無條件載入）。
