import type { Metadata } from "next";
import Link from "next/link";
import { getSiteInfo } from "@/lib/site";

export const metadata: Metadata = { title: "關於與利害關係聲明" };

export default function AboutPage() {
  const site = getSiteInfo();
  return (
    <div className="prose-page mx-auto max-w-2xl px-4 pt-10">
      <h1 className="text-4xl">關於</h1>
      <p>
        選舉時我們常常先認出人和顏色，才去看他說了什麼。這個網站把順序倒過來：先看政見，再看是誰。
      </p>

      <h2>誰做的</h2>
      <p>
        {site.authorName
          ? `這是${site.authorName}的個人專案，自費製作與營運。`
          : "（上線前請在 data/site.json 填入站長姓名）"}
      </p>

      <h2>利害關係聲明</h2>
      <p>{site.disclosure || "（上線前請在 data/site.json 填入：是否具政黨黨籍、是否曾為任何候選人或政黨工作、是否收受相關經費）"}</p>

      <h2>我們怎麼處理爭議</h2>
      <ul>
        <li>事實錯誤：48 小時內更正，並留下公開的更正紀錄。</li>
        <li>對摘要措辭有意見：以候選人原文為準重寫。</li>
        <li>要求下架：不因單方要求移除候選人已公開的政見。任何候選人團隊都可以透過回報表單補充資料，我們一視同仁。</li>
      </ul>

      <h2>聯絡</h2>
      <p>
        資料遺漏或錯誤請用
        <Link href="/report" className="link">回報表單</Link>
        。{site.contactEmail ? `其他事項請寄 ${site.contactEmail}。` : ""}
      </p>
    </div>
  );
}
