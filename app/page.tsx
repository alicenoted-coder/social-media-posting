export default function Home() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
      <h1>Social Media Posting / Data Module</h1>
      <p>
        這是一個純 API 服務，沒有操作介面。用 YouTube Data API v3 與 Meta
        Graph API（Facebook / Instagram / Threads）抓取你自己有權限的帳號資料。
      </p>
      <p>完整說明請看 repo 的 README.md。</p>
      <h2>端點</h2>
      <ul>
        <li>
          <code>GET /api/social</code> — 依 platform / action / id 查詢資料
        </li>
        <li>
          <code>GET /api/social/refresh-tokens</code> — 查看各平台 token 狀態
        </li>
        <li>
          <code>POST /api/social/refresh-tokens</code> — 觸發 token 刷新（給
          cron 用）
        </li>
      </ul>
    </main>
  );
}
