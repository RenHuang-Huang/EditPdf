# 純前端 PDF 編輯器 (Client-side PDF Editor)

這是一款專注於隱私、速度與體驗的網頁版 PDF 編輯工具。所有檔案處理皆在瀏覽器端 (Client-side) 完成，**您的檔案永遠不會上傳至伺服器**，確保絕對的資料安全。

![App Screenshot](public/screenshot.png) <!-- 請自行替換為實際截圖 -->

## ✨ 主要功能 (Features)

- **🔒 隱私優先 (Privacy First)**
  - 採用 `pdf-lib` 與 `PDF.js` 技術，實現 100% 本地端編輯。
  - 無需網路連線即可使用（PWA Ready）。

- **🖍️ 強大的註釋工具**
  - **文字**: 支援自訂字型大小、顏色。內建 **Noto Sans TC (思源黑體)**，完美支援繁體中文匯出，解決常見的亂碼問題。
  - **繪圖**: 提供 **畫筆 (Pen)** 與 **螢光筆 (Highlighter)**。
    - *獨家技術*: 使用 Low-Level PDF Operators (`moveTo`/`lineTo`) 與 Extended Graphics State (`ExtGState`) 技術，確保匯出的筆跡 **平滑、無圓點 (No dots)** 且擁有 **完美的透明度疊加**。
  - **幾何圖形**: 矩形 (Rect)、直線 (Line)，支援填滿與邊框樣式。
  - **圖片**: 支援拖曳 (Drag & Drop) 插入 JPG/PNG 圖片。

- **⚡ 極致效能**
  - 使用 React + Vite 構建，啟動速度快。
  - 虛擬化 PDF 渲染，支援大型文件流暢瀏覽。

- **🖱️ 優化體驗**
  - 直覺的工具列與屬性面板。
  - 支援鍵盤快捷鍵 (S=選取, P=畫筆, H=螢光筆, Ctrl+Z=復原)。
  - 智能選取與自動切換工具模式。

## 🛠️ 技術棧 (Tech Stack)

- **Frontend**: [React](https://reactjs.org/) (TypeScript), [Vite](https://vitejs.dev/)
- **PDF Core**: 
  - [react-pdf](https://github.com/wojtekmaj/react-pdf) (檢視/渲染)
  - [pdf-lib](https://github.com/Hopding/pdf-lib) (編輯/匯出 - Native Ops Implementation)
- **UI/Styling**: CSS Modules, Lucide Icons

## 🚀 快速開始 (Getting Started)

### 安裝依賴
```bash
npm install
```

### 啟動開發伺服器
```bash
npm run dev
```
瀏覽器打開 `http://localhost:5173` 即可使用。

### 建置專案 (Build)
```bash
npm run build
```
產出的靜態檔案將位於 `dist/` 目錄中。

## 🌐 部署至 GitHub Pages

本專案已準備好部署至 GitHub Pages。

1. 修改 `vite.config.ts`:
   如果您是部署到 User Page (`username.github.io`)，請設定 `base: '/'`。
   如果您是部署到 Project Page (`username.github.io/repo-name`)，請設定 `base: '/repo-name/'`。

2. 手動部署 (簡易版):
   ```bash
   npm run build
   cd dist
   git init
   git checkout -b main
   git add -A
   git commit -m 'deploy'
   git push -f git@github.com:<USERNAME>/<REPO>.git main:gh-pages
   ```

## 📝 版本紀錄

- **v1.0.0**: 
  - 初始發布。
  - 實作 Native PDF Export 技術，解決螢光筆匯出問題。
  - 整合思源黑體。

## 📄 License

MIT License
