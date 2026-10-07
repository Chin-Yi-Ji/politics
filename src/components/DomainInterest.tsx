"use client";

import { useEffect, useState } from "react";

type Stats =
  | { open: false }
  | { open: true; enough: false; total: number }
  | { open: true; enough: true; total: number; rows: { domainId: string; name: string; share: number }[] };

/** 各領域關注度。封關後（11/18 起）或後台關閉時，整個區塊不顯示。 */
export function DomainInterest({ countyId, countyName }: { countyId: string; countyName: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/stats?county=${encodeURIComponent(countyId)}`)
      .then((r) => r.json())
      .then((s) => alive && setStats(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [countyId]);

  if (!stats || !stats.open || !stats.enough) return null;

  return (
    <section aria-labelledby="interest" className="mt-12">
      <h2 id="interest" className="text-2xl">
        {countyName}的使用者最在意什麼
      </h2>
      <p className="mt-1 text-sm text-muted">
        來自 {stats.total} 份作答裡選的領域。這是自願作答的結果，不是民意調查，不代表{countyName}全體選民。
      </p>
      <ul className="mt-4 max-w-2xl space-y-2">
        {stats.rows.map((row) => (
          <li key={row.domainId} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3">
            <span>{row.name}</span>
            <span className="h-3 rounded-full bg-line">
              <span className="block h-3 rounded-full bg-ink" style={{ width: `${Math.round(row.share * 100)}%` }} />
            </span>
            <span className="text-right text-sm tabular-nums">{Math.round(row.share * 100)}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
