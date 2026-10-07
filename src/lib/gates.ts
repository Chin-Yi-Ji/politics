import type { PolicyCard, PolicyFile } from "./types";

/**
 * 自動發布前的關卡。不經人工審核，所以這裡沒過的一律扣在後台。
 *
 * 1. 來源網址打不開            → checkSource
 * 2. 原話在來源頁找不到        → checkSource
 * 3. 「有政見」要變成「未提出」 → diffGate（removals）
 * 4. 單次變動超過兩成          → diffGate（holdAll）
 */

export const MAX_CHANGE_RATIO = 0.2;

/** 比對前先把空白與常見的全形半形差異抹平，避免排版不同造成誤判 */
export function normalize(text: string): string {
  return decodeEntities(text)
    .normalize("NFKC")
    .replace(/<[^>]*>/g, "")
    .replace(/[\s​﻿]+/g, "")
    .replace(/[「」『』“”"']/g, "");
}

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** 把 HTML 實體還原成文字，例如 &amp; 與 &#12300; */
function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return NAMED[body.toLowerCase()] ?? whole;
  });
}

export function quoteFound(quote: string, pageText: string): boolean {
  const q = normalize(quote);
  return q.length > 0 && normalize(pageText).includes(q);
}

export type SourceCheck = { ok: true } | { ok: false; reason: string };

/** 關卡 1、2：實際抓一次來源頁，確認打得開，而且原話逐字存在 */
export async function checkSource(
  quote: string,
  sourceUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<SourceCheck> {
  let res: Response;
  try {
    res = await fetcher(sourceUrl, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
  } catch {
    return { ok: false, reason: "來源網址打不開" };
  }
  if (!res.ok) return { ok: false, reason: `來源網址回應 ${res.status}` };
  const body = await res.text();
  if (!quoteFound(quote, body)) return { ok: false, reason: "原話在來源頁面上找不到" };
  return { ok: true };
}

export type DiffDecision = {
  added: PolicyCard[];
  changed: PolicyCard[];
  /** 舊資料有、新資料沒有的卡。不會自動移除，等後台確認。 */
  removals: PolicyCard[];
  changeRatio: number;
  /** 變動比例過高，整批扣住 */
  holdAll: boolean;
};

function sameCard(a: PolicyCard, b: PolicyCard): boolean {
  return JSON.stringify([a.points, a.originals]) === JSON.stringify([b.points, b.originals]);
}

/** 關卡 3、4：比較這次整理結果和線上版本 */
export function diffGate(previous: PolicyFile | null, next: PolicyFile): DiffDecision {
  const before = new Map((previous?.cards ?? []).map((c) => [c.id, c]));
  const after = new Map(next.cards.map((c) => [c.id, c]));

  const added = next.cards.filter((c) => !before.has(c.id));
  const changed = next.cards.filter((c) => before.has(c.id) && !sameCard(before.get(c.id)!, c));
  const removals = [...before.values()].filter((c) => !after.has(c.id));

  // 第一次建立資料沒有可比較的基準，不套用兩成門檻
  const changeRatio = before.size === 0 ? 0 : (added.length + changed.length + removals.length) / before.size;
  return { added, changed, removals, changeRatio, holdAll: changeRatio > MAX_CHANGE_RATIO };
}

/**
 * 套用關卡 3、4 的結果，產出實際要發布的檔案：
 * - 整批扣住時，線上維持舊版，新卡全部標成 held
 * - 被移除的卡保留舊內容，另外回報給後台，確認後才真的拿掉
 */
export function applyDiffGate(previous: PolicyFile | null, next: PolicyFile): { file: PolicyFile; decision: DiffDecision } {
  const decision = diffGate(previous, next);
  if (!previous) return { file: next, decision };

  if (decision.holdAll) {
    const held = [...decision.added, ...decision.changed].map((c) => ({
      ...c,
      id: decision.changed.includes(c) ? `${c.id}@pending` : c.id,
      status: "held" as const,
      heldReason: `單次變動 ${Math.round(decision.changeRatio * 100)}%，超過 ${MAX_CHANGE_RATIO * 100}% 門檻`,
    }));
    return { file: { ...previous, cards: [...previous.cards, ...held] }, decision };
  }

  const kept = decision.removals.map((c) => ({ ...c }));
  return { file: { ...next, cards: [...next.cards, ...kept] }, decision };
}
