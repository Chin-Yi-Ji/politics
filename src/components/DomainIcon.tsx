import type { ReactNode } from "react";

/**
 * 12 個領域的小圖示。線條畫法和圈選章一致：只描邊、圓頭、不填色。
 * 圖示只是輔助辨識，旁邊一定有文字名稱。
 */
const PATHS: Record<string, ReactNode> = {
  // 公車正面
  transport: (
    <>
      <rect x="10" y="7" width="28" height="29" rx="5" />
      <rect x="14" y="12" width="20" height="11" rx="2" />
      <path d="M15 30h3M30 30h3M15 36v4M33 36v4" />
    </>
  ),
  // 房子
  housing: (
    <>
      <path d="M7 23 24 8l17 15" />
      <path d="M12 20v20h24V20" />
      <path d="M20 40V29h8v11" />
    </>
  ),
  // 攤開的書
  education: (
    <>
      <path d="M24 14c-4-3-9-4-15-4v26c6 0 11 1 15 4 4-3 9-4 15-4V10c-6 0-11 1-15 4z" />
      <path d="M24 14v26" />
    </>
  ),
  // 愛心和心跳線
  health: (
    <>
      <path d="M24 40C12 31 6 24 6 17a9 9 0 0 1 18-3 9 9 0 0 1 18 3c0 7-6 14-18 23z" />
      <path d="M13 23h6l3-6 4 11 3-5h6" />
    </>
  ),
  // 公事包
  economy: (
    <>
      <rect x="6" y="15" width="36" height="24" rx="4" />
      <path d="M18 15v-3a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v3" />
      <path d="M6 26h36M24 24v5" />
    </>
  ),
  // 樹
  environment: (
    <>
      <circle cx="24" cy="19" r="12" />
      <path d="M24 19v23M24 29l6-6M24 25l-5-5M15 42h18" />
    </>
  ),
  // 盾牌打勾
  safety: (
    <>
      <path d="M24 6l15 5v11c0 9-6 16-15 20-9-4-15-11-15-20V11z" />
      <path d="M17 23l5 5 9-10" />
    </>
  ),
  // 燈籠
  culture: (
    <>
      <path d="M24 3v4M24 37v8M19 37v4M29 37v4" />
      <rect x="18" y="7" width="12" height="4" rx="1" />
      <rect x="18" y="33" width="12" height="4" rx="1" />
      <rect x="8" y="11" width="32" height="22" rx="11" />
      <path d="M19 11c-3 7-3 15 0 22M29 11c3 7 3 15 0 22" />
    </>
  ),
  // 手托著愛心
  welfare: (
    <>
      <path d="M25 22c-6-4-9-8-9-11a4.8 4.8 0 0 1 9-2 4.8 4.8 0 0 1 9 2c0 3-3 7-9 11z" />
      <path d="M4 33c4-3 8-4 12-2l5 2h7a2.5 2.5 0 0 1 0 5h-8" />
      <path d="M30.5 36l9-5a2.6 2.6 0 0 1 2.8 4.3L31 43c-2 1.2-4 1.5-6 1.5H4" />
    </>
  ),
  // 有柱子的公家建築
  governance: (
    <>
      <path d="M6 18 24 7l18 11z" />
      <path d="M12 23v12M20 23v12M28 23v12M36 23v12M7 40h34" />
    </>
  ),
  // 紙飛機
  youth: (
    <>
      <path d="M43 6 5 21l14 6 6 14z" />
      <path d="M19 27 43 6" />
    </>
  ),
  // 剛冒出來的苗
  agriculture: (
    <>
      <path d="M24 42V22M12 42h24" />
      <path d="M24 30c-9 1-14-4-15-13 9-1 14 4 15 13z" />
      <path d="M24 22c0-9 5-14 15-14 0 9-5 14-15 14z" />
    </>
  ),
};

export function DomainIcon({ id, size = 40 }: { id: string; size?: number }) {
  const body = PATHS[id];
  if (!body) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {body}
    </svg>
  );
}
