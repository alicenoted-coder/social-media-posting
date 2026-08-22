# Social Media Posting / Data Module

用**官方 API**（不是爬蟲）抓 YouTube、Facebook、Instagram、Threads 的資料。
從 `alicenoted-coder/claude` 這個 repo 的 PR #2 拆出來，變成獨立專案。

---

## 這個專案在做什麼（一句話）

給一個統一的 API endpoint，你丟 `platform`（平台）+ `action`（要抓 profile／貼文／留言）+ `id`（帳號或貼文 ID），它幫你呼叫對的官方 API，回傳統一格式的 JSON。

```
GET /api/social?platform=youtube&action=profile&id=@MrBeast
GET /api/social?platform=youtube&action=posts&id=UCX6OQ3DkcsbYNE6H8uQQuVA&maxResults=10
GET /api/social?platform=facebook&action=posts&id=<pageId>
GET /api/social?platform=instagram&action=comments&id=<mediaId>
GET /api/social?platform=threads&action=posts&id=<userId>
```

---

## ⚠️ 先搞懂這個最重要的限制

**這不是爬蟲，是走官方申請的 API。**

- 每個平台都要自己去申請 API Key / Access Token
- **只能抓到你自己有權限的帳號**（自己的 YouTube 頻道、自己的 FB 粉專、自己綁定的 IG Business 帳號）
- **抓不到「別人的」公開帳號**，除非對方也把 token 授權給你
- 好處是：**完全合法合規**，平台不會因為這個把你封鎖或警告

如果你要抓的是「別人的」公開頁面（例如競品的蝦皮賣場、別人的 IG），那不是這個工具的範圍，
要用 `alicenoted-coder/vedio-`（通用爬蟲）或 `PR #5` 那種瀏覽器爬蟲路線。**這兩條路線是互補，不是互相取代。**

---

## 支援平台與需要的權限

| 平台 | 用哪個 API | 要申請什麼 |
|---|---|---|
| YouTube | YouTube Data API v3 | Google Cloud Console 建立 API Key |
| Facebook | Meta Graph API | Meta Developers App，`pages_read_engagement` 等權限 |
| Instagram | Meta Graph API（IG Business） | 要先綁定 Facebook 粉專，拿到 IG Business Account ID |
| Threads | Threads API（跟 IG 共用 App） | `threads_basic`、`threads_manage_replies` 權限 |

---

## 安裝與設定

```bash
npm install
cp .env.local.example .env.local
```

編輯 `.env.local`，填入：

```
YOUTUBE_API_KEY=
FACEBOOK_ACCESS_TOKEN=
INSTAGRAM_ACCESS_TOKEN=
THREADS_ACCESS_TOKEN=
META_APP_ID=          # 自動刷新 token 必填
META_APP_SECRET=      # 自動刷新 token 必填
CRON_SECRET=          # 保護 refresh-tokens 端點用，自己設一個隨機字串
```

```bash
npm run dev
```

打開 http://localhost:3000 會看到端點說明頁。

---

## API 端點

### `GET /api/social`

主要查詢端點，四個 query 參數：

| 參數 | 說明 |
|---|---|
| `platform` | `youtube` / `facebook` / `instagram` / `threads` |
| `action` | `profile`（個人檔案）/ `posts`（貼文）/ `comments`（留言） |
| `id` | 頻道 ID、粉專 ID、IG User ID，或貼文 ID |
| `maxResults` | 選填，一次抓幾筆（預設 20） |
| `pageToken` | 選填，分頁用 |
| `since` | 選填，只抓某時間之後的資料 |

### `GET /api/social/refresh-tokens`

查看目前各平台 token 的狀態（還剩幾天過期）。

### `POST /api/social/refresh-tokens`

手動觸發刷新，或給 Vercel cron 排程呼叫（`vercel.json` 已經設定每天凌晨 3 點自動跑）。
需要在 header 帶 `Authorization: Bearer <CRON_SECRET>`。

---

## 為什麼會有「Token 自動刷新」這個機制

Meta（FB/IG/Threads）的 long-lived token 只有 60 天效期，過期就要重新申請，很麻煩。

這個專案自己做了一套機制：

1. Token 存在本地 `token-cache.json`（**這個檔案含敏感資料，已經加進 `.gitignore`，永遠不要 commit**）
2. 每次要用 token 時，先檢查還有沒有 7 天以上效期
3. 快過期就自動打 Meta 的 `fb_exchange_token`（或 Threads 的 `refresh_access_token`）換一個新的
4. 換到新 token 就更新回 `token-cache.json`，這樣你不用手動去後台重新產生

程式碼在 `lib/social/token-store.ts`（存取本地檔案）+ `lib/social/token-refresh.ts`（真正呼叫刷新 API 的邏輯）。

---

## 專案結構

```
app/
├── api/social/route.ts                  # 主要查詢端點
└── api/social/refresh-tokens/route.ts   # token 狀態查詢 + 手動/cron 刷新
lib/social/
├── types.ts           # 統一的資料型別（SocialProfile / SocialPost / SocialComment）
├── youtube.ts          # YouTube Data API 封裝
├── meta.ts             # Facebook / Instagram / Threads（Meta Graph API）封裝
├── token-store.ts      # token 讀寫本地快取檔
└── token-refresh.ts    # token 快過期自動換新的邏輯
vercel.json              # 排程 cron，每天凌晨 3 點刷新 token
```

---

## 部署到 Vercel

```bash
npm i -g vercel
vercel
vercel env add YOUTUBE_API_KEY
vercel env add FACEBOOK_ACCESS_TOKEN
vercel env add INSTAGRAM_ACCESS_TOKEN
vercel env add THREADS_ACCESS_TOKEN
vercel env add META_APP_ID
vercel env add META_APP_SECRET
vercel env add CRON_SECRET
vercel --prod
```

> ⚠️ `token-cache.json` 在 Vercel 這種 serverless 環境裡寫在 `/tmp`，**每次部署或冷啟動都會被清空**。
> 正式上線建議把 token 存放邏輯換成資料庫或 KV（例如 Vercel KV / Upstash Redis），目前先用本地檔案只是最小可行版本。

---

## 這個 repo 是怎麼來的

原本這段程式碼是加在 `alicenoted-coder/claude`（照片 AI 辨識 demo）這個 repo 的 PR #2 裡，
借用了那個 repo 的 Next.js 骨架。因為跟「照片辨識」業務完全無關，只是剛好共用了程式框架，
所以拆出來變成獨立 repo，方便獨立部署、獨立維護版本。
