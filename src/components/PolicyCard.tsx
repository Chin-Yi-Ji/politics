"use client";

import { Fragment, useEffect, useRef, type ReactNode } from "react";
import { Stamp } from "./Stamp";

/** 數字、金額、時程、數量：加粗並畫上螢光筆，讀的人一眼抓到重點 */
const NUMBER =
  /(?:約|逾|超過|近|至少)?\d[\d,.]*\s*(?:萬|億|千|百)?\s*(?:元|人次|人|戶|座|處|條|年|個月|月|個|分鐘|小時|天|日|%|％|公里|公尺|公頃|坪|床|班|所|間|輛|線|站|倍|成|歲|週|名|家|台|棵|場|項|席|位|件|次|度)?/g;

export function emphasize(text: string): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(NUMBER)) {
    const start = m.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    out.push(
      <span key={start} className="num">
        {m[0]}
      </span>,
    );
    last = start + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.map((part, i) => <Fragment key={i}>{part}</Fragment>);
}

/**
 * 一張盲選用的政見卡。
 * 選卡的按鈕放在卡片最下面：讀到底才按得到，鼓勵把整張看完再決定。
 * 卡片底部進入畫面時，算這張「讀完了」。
 */
export function PolicyCard({
  label,
  points,
  picked,
  read,
  onPick,
  onRead,
}: {
  label: string;
  points: string[];
  picked: boolean;
  read: boolean;
  onPick: () => void;
  onRead: () => void;
}) {
  const end = useRef<HTMLDivElement>(null);
  const readCallback = useRef(onRead);
  useEffect(() => {
    readCallback.current = onRead;
  });
  useEffect(() => {
    if (read || !end.current || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) readCallback.current();
      },
      { threshold: 1 },
    );
    io.observe(end.current);
    return () => io.disconnect();
  }, [read]);

  return (
    <article className="ticket-wrap" data-picked={picked} aria-label={`政見卡${label}`}>
      <div className="ticket relative">
        <header className="ticket-head flex items-center justify-between px-6">
          <h3 className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-black">{label}</span>
            <span className="text-sm font-bold text-muted">{points.length} 個重點</span>
          </h3>
          <span className={`flex items-center gap-1 text-sm font-bold ${read ? "text-[var(--w-ink)]" : "text-line"}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            {read ? "讀完了" : "還沒讀完"}
          </span>
        </header>
        <div className="perforation" aria-hidden="true" />
        <ul className="px-6 pb-2 pt-4">
          {points.map((p, i) => (
            <li key={p} className={`flex gap-3 py-3 text-[1.0625rem] leading-[1.85] ${i > 0 ? "border-t border-line/70" : ""}`}>
              <span aria-hidden="true" className="mt-[0.72em] h-2 w-2 shrink-0 rotate-45 bg-[var(--w-ink)]" />
              <span>{emphasize(p)}</span>
            </li>
          ))}
        </ul>
        <div ref={end} className="px-6 pb-6 pt-2">
          <button
            type="button"
            aria-pressed={picked}
            onClick={onPick}
            className={`flex min-h-12 w-full items-center justify-center rounded-full border-2 font-bold ${
              picked ? "border-stamp bg-stamp text-white" : "border-ink bg-card text-ink hover:bg-[var(--w-bg)]"
            }`}
          >
            {picked ? `已選${label}，換別張就點別張` : `選這張`}
          </button>
        </div>
        {picked && (
          <span className="stamp-on pointer-events-none absolute right-28 top-0">
            <Stamp size={62} />
          </span>
        )}
      </div>
    </article>
  );
}
