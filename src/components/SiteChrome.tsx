import Link from "next/link";
import { Stamp } from "./Stamp";

export const SITE_NAME = "先看政見";

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl font-black">
          <Stamp size={28} />
          {SITE_NAME}
        </Link>
        <nav aria-label="主要選單" className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <Link href="/method" className="link">資料與計分方法</Link>
          <Link href="/report" className="link">回報遺漏</Link>
          <Link href="/about" className="link">關於</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted">
        <p>
          {SITE_NAME}是個人製作的公民專案，政見由 AI 自公開來源整理，未經逐條人工審核。發現遺漏或錯誤，請
          <Link href="/report" className="link">回報</Link>，48 小時內處理。
        </p>
        <p className="mt-2 flex flex-wrap gap-x-5">
          <Link href="/method" className="link">資料與計分方法</Link>
          <Link href="/privacy" className="link">隱私說明</Link>
          <Link href="/about" className="link">關於與利害關係聲明</Link>
        </p>
      </div>
    </footer>
  );
}
