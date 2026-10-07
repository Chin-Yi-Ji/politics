import Link from "next/link";
import type { HeatView } from "@/lib/types";

/**
 * 討論熱度的橫條清單：一個領域一列，長度代表占比。
 * 名稱、百分比和關鍵字都是文字，不靠顏色辨識；「比其他縣市更常談」也用文字標示。
 */
export function HeatList({ heat, limit, compact = false }: { heat: HeatView; limit?: number; compact?: boolean }) {
  const items = limit ? heat.items.slice(0, limit) : heat.items;
  const max = Math.max(...items.map((i) => i.share));
  return (
    <ul className={compact ? "grid gap-3" : "grid gap-x-10 gap-y-3 sm:grid-cols-2"}>
      {items.map((item) => (
        <li key={item.id}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-bold">
              {item.name}
              {item.above && (
                <span className="ml-2 rounded-full border border-ink px-2 py-0.5 text-xs font-bold">比其他縣市常談</span>
              )}
            </span>
            <span className="shrink-0 text-sm tabular-nums text-muted">{Math.round(item.share * 100)}%</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-line" aria-hidden="true">
            <div className="h-2 rounded-full bg-ink" style={{ width: `${Math.max(4, (item.share / max) * 100)}%` }} />
          </div>
          {item.terms.length > 0 && <p className="mt-1 text-sm text-muted">常出現：{item.terms.join("、")}</p>}
        </li>
      ))}
    </ul>
  );
}

/** 清單只列前幾名時，補一句「跟其他縣市比特別常談」但沒排進前幾名的領域 */
export function HeatAbove({ heat, limit }: { heat: HeatView; limit: number }) {
  const rest = heat.items
    .slice(limit)
    .filter((i) => i.above)
    .sort((a, b) => b.lift - a.lift);
  if (rest.length === 0) return null;
  return (
    <p className="mt-4 border-t border-line pt-3 text-sm">
      <span className="font-bold">跟其他縣市比，這裡也特別常談：</span>
      {rest.map((i) => i.name).join("、")}
    </p>
  );
}

/** 資料範圍與提醒，放在清單下面 */
export function HeatNote({ heat }: { heat: HeatView }) {
  return (
    <p className="mt-3 text-sm text-muted">
      {heat.from} 到 {heat.to}，自由時報提到這個縣市的相關新聞 {heat.newsTotal.toLocaleString("zh-TW")} 則
      {heat.usesPtt ? `、PTT 地方板相關文章 ${heat.pttPosts} 篇` : ""}
      。不含臉書、Threads、Dcard 等要登入的平台，只能當參考。
      <Link href="/method#heat" className="link">
        怎麼算的
      </Link>
    </p>
  );
}
