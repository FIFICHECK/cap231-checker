# HKTVmall QA Checker Extension v1.0

## Installation (安裝方法)
1. Open Chrome / Edge → 網址打 `chrome://extensions`
2. Enable 「Developer mode」(開發者模式) — 右上角開關
3. Click 「Load unpacked」(載入未封裝擴充功能)
4. Select this folder (`/tmp/hktv-qa-extension`)

## Usage (使用方法)
1. Go to any HKTVmall product page (e.g. `https://www.hktvmall.com/hktv/p/...`)
2. Click the extension icon (🔍 放大鏡圖示) 喺 browser 右上角
3. Popup 會自動抽取產品資料 + 圖片
4. Click 「📤 傳送去 Dashboard 檢查」
5. Dashboard 會自動打開並接收資料

## Communication Flow
Extension (popup) → background.js → content-dashboard.js → dashboard page (CustomEvent)

## Required Permissions
- `https://www.hktvmall.com/*` — 抽取產品頁面 DOM 資料
- `https://fificheck.github.io/*` — 傳送資料去 Dashboard
