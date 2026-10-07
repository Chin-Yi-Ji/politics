# 先看政見

2026 縣市長候選人政見盲選與對照平台。完整規格見 [docs/SPEC.md](docs/SPEC.md)。

## 在本機跑起來

需要 Node.js 22。

```bash
npm install
npm run dev
```

打開 http://localhost:3000 。22 縣市中有 21 個可以盲選與看對照表（連江縣還在整理）。開發模式下首頁最下方另有一個虛構的「示範市」。

不設定任何環境變數也能走完盲選流程。要登入後台（http://localhost:3000/admin ），先把 `.env.example` 複製成 `.env.local`，填入 `ADMIN_PASSWORD` 再重啟。

## 常用指令

| 指令 | 用途 |
|---|---|
| `npm run dev` | 開發伺服器 |
| `npm test` | 推薦公式、時間開關、卡片加密、自動關卡的測試 |
| `npm run validate` | 檢查 `data/` 的資料格式 |
| `npm run validate -- --online` | 另外實際抓來源頁，確認網址打得開、原話逐字存在 |
| `python3 scripts/verify-quotes.py [縣市代碼]` | 同樣的逐字比對，不需要先安裝套件 |
| `python3 scripts/data-status.py` | 由資料檔重新產生 `docs/DATA-STATUS.md` |
| `npm run build` | 正式建置 |

預覽之後的模式：在 `.env.local` 加一行 `PHASE_NOW=2026-11-28T09:00:00+08:00` 再重啟，就能看到投票日當天的樣子。

## 資料放在哪裡

| 檔案 | 內容 |
|---|---|
| `data/domains.json` | 12 個領域與關鍵字 |
| `data/counties.json` | 22 縣市。`status` 為 `collecting` 時只顯示名冊；`ready` 開放盲選與對照表；`ready-extended` 代表要靠新聞報導才齊，嚴格模式下不開放 |
| `data/candidates.json` | 候選人名冊，由 `scripts/build-roster.py` 產生 |
| `data/policies/<縣市>.json` | 各縣市的政見卡 |
| `data/sources.json` | 每位候選人的官方來源連結與來源備註，顯示在縣市頁 |
| `data/changelog.json` | 每次更新的紀錄，顯示在後台 |
| `data/site.json` | 關於頁的站長姓名、利害關係聲明、聯絡信箱，上線前要填 |

使用者作答、回報、後台開關與下架紀錄放在 Supabase。沒設定 Supabase 時這些資料只存在記憶體，重啟就清空。

## 來源模式

預設是 `SOURCE_MODE=extended`：候選人沒有可查證的官方政見時，採用新聞報導並標示「新聞報導」。想只用第一手來源，在 `.env.local` 設 `SOURCE_MODE=strict` 後重新啟動（正式環境要重新建置）。各縣市目前的資料狀況見 [docs/DATA-STATUS.md](docs/DATA-STATUS.md)。

## 部署到 Zeabur

專案根目錄有 `Dockerfile`，Zeabur 會自動偵測並照它建置（Node 22、`npm ci`、`npm run build`、`next start`，對外埠號 8080）。

1. 把這個資料夾推到 GitHub（之後每次推送，Zeabur 會自動重新部署）
2. Zeabur：建立專案 → Deploy New Service → GitHub → 選這個版本庫
3. 在服務的 Variables 分頁設定環境變數（見下表），存檔後重新部署
4. 在 Domains 分頁按 Generate Domain，取得 `xxx.zeabur.app` 網址

| 變數 | 必填 | 說明 |
|---|---|---|
| `CARD_SECRET` | 是 | 盲選卡片代碼的加密金鑰。沒設定時盲選會直接失敗。用 `openssl rand -hex 32` 產生 |
| `ADMIN_PASSWORD` | 建議 | 後台 `/admin` 的登入密碼。沒設定就無法登入後台 |
| `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY` | 正式上線前 | 沒設定時作答、回報、後台開關只存在記憶體，服務重啟就清空 |
| `GEMINI_API_KEY` | 選填 | 沒設定時期待分類改用關鍵字比對 |
| `SOURCE_MODE` | 選填 | 預設 `extended`。這個值在建置時決定，改了要重新部署 |

## 上線前要準備的

1. Supabase 專案：在 SQL Editor 執行 `supabase/schema.sql`
2. 環境變數：照上表設定，`CARD_SECRET` 與 `ADMIN_PASSWORD` 務必換成自己的
3. 填寫 `data/site.json`（關於頁的站長姓名、利害關係聲明、聯絡信箱）
