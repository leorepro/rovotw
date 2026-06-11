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
src/styles/main.css   版面與設計 token（配色、字級取自原站 computed styles）
src/styles/fonts.css  自架 Google Fonts（Cabin / Work Sans / Noto Sans，SIL OFL）
src/fonts/            woff2 字型檔
src/assets/           CSS 引用的圖（logo 牆背景）
public/images/        頁面圖片
reference/            原站快照與抽取腳本（original.html、spec.json 等，重建依據）
```

## 注意事項

- **聯絡表單只有外觀**：送出按鈕目前不做任何事（`src/main.ts` 中 preventDefault），之後再串接後端。
- **Getty 授權圖**：`public/images/getty-170152463.jpg`（免費課程區的會議照片）原為 GoDaddy
  平台內建的 Getty 圖庫授權，授權通常綁定 GoDaddy 平台，搬離後建議更換為自有圖片。
- 影片皆為 Vimeo / YouTube 原始 embed URL，不需自行代管。
- 地圖改用標準 Google Maps embed（原站為 GoDaddy 內嵌的 Google Maps JS）。
