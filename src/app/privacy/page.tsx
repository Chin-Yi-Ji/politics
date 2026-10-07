import type { Metadata } from "next";

export const metadata: Metadata = { title: "隱私說明" };

export default function PrivacyPage() {
  return (
    <div className="prose-page mx-auto max-w-2xl px-4 pt-10">
      <h1 className="text-4xl">隱私說明</h1>

      <h2>我們存什麼</h2>
      <ul>
        <li>你選的縣市</li>
        <li>你寫下的期待原文</li>
        <li>這段文字被歸到哪些領域</li>
        <li>你在盲選裡選了哪些卡</li>
        <li>作答時間</li>
      </ul>

      <h2>我們不存什麼</h2>
      <ul>
        <li>不需要登入，不蒐集姓名、電子郵件或電話。</li>
        <li>不把 IP 位址或裝置識別碼寫進資料庫。IP 只在伺服器記憶體裡短暫用來限制流量，幾分鐘後就丟棄。</li>
        <li>不使用廣告追蹤工具。</li>
      </ul>
      <p>
        兩件事我們控制不了，也一併說明：網站的字型由 Google Fonts 提供，瀏覽器載入字型時會連到 Google
        的伺服器；主機服務商的連線紀錄可能包含 IP，我們不會拿它和作答內容對應。
      </p>
      <p>因為作答是匿名的，寫下的期待請不要包含姓名、電話、地址等能認出你或其他人的資訊。</p>

      <h2>資料怎麼用</h2>
      <ul>
        <li>你寫的期待會送到 Google 的 Gemini 模型，判斷它屬於哪些領域。模型只回傳領域名稱。</li>
        <li>11 月 18 日以前，網站會顯示各縣市「最多人提到哪些領域」的彙總比例。這不是民意調查，之後不再顯示。</li>
        <li>不會把個別作答提供給任何候選人、政黨或第三方。</li>
      </ul>

      <h2>保存多久</h2>
      <p>你寫的期待原文會在投票日後 30 天內刪除，只保留無法回推個人的彙總數字。</p>

      <h2>回報遺漏的表單</h2>
      <p>回報內容會存下來供站長處理。表單不要求留聯絡方式，也請不要在內容裡填寫個人資料。</p>
    </div>
  );
}
