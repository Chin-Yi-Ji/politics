import fs from "node:fs";
import path from "node:path";
import { orderPoints } from "./order";
import type { Candidate, CandidateSources, County, Domain, HeatFile, HeatView, Overrides, PolicyCard, PolicyFile } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")) as T;
}

/** 示範市只在開發環境或 SHOW_DEMO=1 時出現 */
export function showDemo(): boolean {
  return process.env.SHOW_DEMO === "1" || process.env.NODE_ENV !== "production";
}

export function getDomains(): Domain[] {
  return readJson<Domain[]>("domains.json");
}

/**
 * 來源模式。
 * strict：只用選舉公報、候選人官方來源、公辦政見會。
 * extended：候選人沒有可查證的官方文字時，另外採用新聞報導中他公開提出的政見（標示「新聞報導」）。
 */
export function sourceMode(): "strict" | "extended" {
  return process.env.SOURCE_MODE === "strict" ? "strict" : "extended";
}

type RawCounty = Omit<County, "status"> & { status: County["status"] | "ready-extended" };

export function getCounties(): County[] {
  const all = readJson<RawCounty[]>("counties.json").map((c): County => {
    // 「ready-extended」的縣市要靠新聞報導才完整，嚴格模式下視為整理中
    if (c.status === "ready-extended") return { ...c, status: sourceMode() === "extended" ? "ready" : "collecting" };
    return { ...c, status: c.status };
  });
  return showDemo() ? all : all.filter((c) => !c.demo);
}

export function getSources(candidateId: string): CandidateSources | null {
  const file = path.join(DATA_DIR, "sources.json");
  if (!fs.existsSync(file)) return null;
  return readJson<Record<string, CandidateSources>>("sources.json")[candidateId] ?? null;
}

export function getCounty(id: string): County | undefined {
  return getCounties().find((c) => c.id === id);
}

export function getCandidates(countyId: string): Candidate[] {
  const list = readJson<Candidate[]>("candidates.json").filter((c) => c.countyId === countyId);
  // 抽籤前沒有號次，先依姓名排序，避免排列順序暗示誰是主要候選人
  return list.sort((a, b) => {
    if (a.ballotNumber !== null && b.ballotNumber !== null) return a.ballotNumber - b.ballotNumber;
    return a.name.localeCompare(b.name, "zh-Hant-TW");
  });
}

export function getPolicyFile(countyId: string): PolicyFile | null {
  if (!/^[a-z0-9-]+$/.test(countyId)) return null;
  const file = path.join("policies", `${countyId}.json`);
  if (!fs.existsSync(path.join(DATA_DIR, file))) return null;
  return readJson<PolicyFile>(file);
}

/** 套用後台的下架與放行之後，實際會顯示的卡片 */
export function visibleCards(file: PolicyFile | null, overrides: Overrides): PolicyCard[] {
  if (!file) return [];
  const strict = sourceMode() === "strict";
  const shown = file.cards.filter((card) => {
    if (strict && card.originals.every((o) => o.sourceType === "media")) return false;
    const action = overrides[card.id];
    if (action === "hide") return false;
    if (action === "publish") return true;
    return card.status === "published";
  });
  // 每張卡裡的重點，寫得越完整的排越前面（規則見 order.ts，對所有候選人相同）
  const ordered = (card: PolicyCard): PolicyCard => ({ ...card, points: orderPoints(card.points) });
  if (!strict) return shown.map(ordered);
  // 嚴格模式：同時引用兩種來源的卡，只留第一手來源的原話與只靠它寫得出來的摘要
  return shown.map((card) => {
    if (!card.originals.some((o) => o.sourceType === "media")) return ordered(card);
    return ordered({
      ...card,
      points: card.strictPoints ?? card.points,
      originals: card.originals.filter((o) => o.sourceType !== "media"),
    });
  });
}

export type ChangelogEntry = {
  runAt: string;
  summary: string;
  added: number;
  changed: number;
  removed: number;
  held: number;
};

export function getChangelog(): ChangelogEntry[] {
  return readJson<ChangelogEntry[]>("changelog.json");
}

export function allPolicyFiles(): PolicyFile[] {
  return getCounties()
    .map((c) => getPolicyFile(c.id))
    .filter((f): f is PolicyFile => f !== null);
}

/** lift 到這個倍數以上，才標示「比其他縣市更常被提到」 */
export const HEAT_ABOVE = 1.3;

/** 把熱度檔整理成畫面要用的樣子；資料量不夠就回傳 null */
export function toHeatView(file: HeatFile | null, countyId: string, domains: Domain[]): HeatView | null {
  const county = file?.counties[countyId];
  if (!file || !county || !county.enough) return null;
  const names = new Map(domains.map((d) => [d.id, d.name]));
  const items = county.domains
    .filter((d) => names.has(d.id) && d.index > 0)
    .sort((a, b) => b.index - a.index)
    .map((d) => ({
      id: d.id,
      name: names.get(d.id)!,
      share: d.index,
      lift: d.lift,
      above: d.lift >= HEAT_ABOVE,
      terms: d.terms,
      news: d.news,
      ptt: d.ptt,
    }));
  if (items.length === 0) return null;
  return {
    from: file.from,
    to: file.to,
    newsTotal: county.newsTotal,
    pttPosts: county.usesPtt ? county.ptt.classified : 0,
    usesPtt: county.usesPtt,
    items,
  };
}

/** 這個縣市最近的討論熱度；還沒有資料檔或資料量不夠時回傳 null */
export function getHeat(countyId: string): HeatView | null {
  const file = path.join(DATA_DIR, "heat.json");
  if (!fs.existsSync(file)) return null;
  return toHeatView(readJson<HeatFile>("heat.json"), countyId, getDomains());
}
