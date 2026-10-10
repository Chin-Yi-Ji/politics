import Link from "next/link";
import { Stamp } from "./Stamp";

export const SITE_NAME = "先看政見";

export function SiteHeader() {
  return (
    <header>
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-5">
        <Link href="/" className="flex items-center gap-2 font-serif text-lg font-semibold tracking-[0.2em]">
          <Stamp size={24} className="-rotate-12" />
          {SITE_NAME}
        </Link>
        <nav aria-label="主要選單" className="flex flex-wrap gap-x-5 gap-y-1 text-sm tracking-[0.05em] text-muted">
          <Link href="/method" className="hover:text-ink">計分方法</Link>
          <Link href="/report" className="hover:text-ink">回報</Link>
          <Link href="/about" className="hover:text-ink">關於</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto max-w-4xl px-6 py-10 text-xs leading-relaxed text-muted">
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
