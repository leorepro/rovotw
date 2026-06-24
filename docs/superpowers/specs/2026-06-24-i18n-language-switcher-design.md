# 多語系語言切換設計

日期：2026-06-24
狀態：已核可，待實作

## 目標

為 Rovo TW 單頁行銷網站（Vite + TypeScript 靜態站）加入多語系切換功能。預設繁體中文，另支援英文、韓文、日文、越南文，共 5 種語言。所有文字目前寫死於 `index.html`（約 353 個文字節點）。

## 範圍

- 建立前端 i18n 切換機制（不引入第三方框架）。
- 把全站文字抽成各語言 JSON 字典，並完成 5 種語言的實際翻譯（zh-TW 為來源，其餘由 AI 翻譯，使用者後續校稿）。
- 導覽列語言下拉選單。
- `?lang=` 網址參數、localStorage 記憶、瀏覽器語言自動偵測。
- 切換時更新 SEO 相關 meta 與送出 GA4 事件。

## 語言清單

| 代碼   | 自稱名      | 對應偵測 prefix |
|--------|-------------|-----------------|
| zh-TW  | 繁體中文    | zh（預設 / 回退） |
| en     | English     | en             |
| ko     | 한국어      | ko             |
| ja     | 日本語      | ja             |
| vi     | Tiếng Việt  | vi             |

## 架構

前端 JS 字典切換，單一 `index.html`。

```
src/
  i18n/
    index.ts          ← i18n 引擎（偵測、套用、記憶、切換）
    locales/
      zh-TW.json
      en.json
      ko.json
      ja.json
      vi.json
```

### 標記方式

- 文字內容：元素加 `data-i18n="key"`。
- 屬性翻譯：`data-i18n-attr="alt:key;aria-label:key"`（分號分隔多個屬性）。
- 字典值為作者可信內容，含 `<strong>`/`<br>` 時以 `innerHTML` 套用；其餘以 `textContent`。為簡化，統一以 `innerHTML` 套用（內容皆由我們維護，無使用者輸入）。
- key 採語意化命名：`nav.features`、`hero.tagline`、`faq.q1.question` 等。

### 語言決定優先序

1. 網址 `?lang=xx`（合法值才採用，並寫入 localStorage）
2. localStorage（`rovo_lang`）
3. `navigator.language` / `navigator.languages` 比對 prefix
4. 回退 `zh-TW`

### 套用流程（applyLocale）

切換或啟動時：
1. 載入對應 JSON 字典。
2. 遍歷 `[data-i18n]` 與 `[data-i18n-attr]` 套用文字／屬性。
3. 更新 `document.documentElement.lang`、`document.title`、`meta[name=description]`、`meta[property=og:locale]`。
4. 更新 `<html dir>`（5 種皆 LTR，保留欄位）。
5. 寫入 localStorage、更新切換器 UI 的當前語言與勾選狀態。
6. 不重整頁面。

字典以動態 `import()` 載入，僅當前語言的 JSON 進 bundle 時分塊，降低首屏成本（Vite 支援）。

## 切換 UI（導覽列下拉選單）

- 位置：`#siteNav .nav-inner` 內，`預約Demo` CTA 旁。
- 觸發鈕顯示地球圖示 + 當前語言自稱名，點開展開清單，當前語言打勾。
- 清單顯示各語言自稱名。
- 桌機為下拉選單；手機併入漢堡選單，共用同一份清單來源。
- 互動：點外部收合、Esc 收合、`aria-expanded`／`aria-haspopup`／鍵盤可操作。
- 純 CSS + 少量 JS，無第三方套件。

## 翻譯流程

1. 掃 `index.html`，將文字抽成語意化 key，產出 `zh-TW.json`，並把 HTML 改為 `data-i18n` 標記。
2. 以 AI 將 `zh-TW.json` 翻成 en / ko / ja / vi，產出 4 份 JSON，鍵集合與 zh-TW 完全一致。
3. 不翻譯項目：數字、Email、電話、品牌名（Atlassian、Rovo、Jira、Confluence、Titansoft 等）。
4. 使用者後續僅需校稿 JSON，不必動 HTML。

## GA4 事件

沿用現有 `analytics.ts`。切換語言時送 `language_switch` 事件，參數 `from`、`to`（語言代碼）。

## SEO

- 切換時動態更新 `<html lang>`、`<title>`、`meta description`、`og:locale`。
- `<head>` 加入各語言 `hreflang` 連結（指向 `?lang=xx`）與 `x-default`。
- 註：純前端切換 SEO 弱於獨立頁面，符合所選架構；日後可升級為預渲染／獨立頁面。

## 測試策略

i18n 引擎核心邏輯以單元測試覆蓋（語言決定優先序、合法值驗證、回退）。DOM 套用與 UI 互動以實際在瀏覽器／build 後手動驗證。

## 非目標（YAGNI）

- 不做獨立語言頁面 / 伺服器端渲染。
- 不做後台翻譯管理介面。
- 不支援 RTL 語言（目前 5 種皆 LTR）。
