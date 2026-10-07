import { randomInt } from "node:crypto";
import { getCandidates, getDomains, getPolicyFile, visibleCards } from "./data";
import { open, seal } from "./token";
import type { Overrides, PolicyCard } from "./types";

/** 卡片代碼解開後的內容 */
export type CardPayload = { c: string; d: string; k: string };
/** 一次盲選的憑證：縣市、命中的領域、作答紀錄編號、開始時間 */
export type SessionPayload = { c: string; m: string[]; r: string | null; t: number };

export const SESSION_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export type DeckCard =
  | { empty: false; token: string; points: string[] }
  /** 這位候選人在這個領域未提出政見。空卡不可選。 */
  | { empty: true };

export type DeckDomain = {
  id: string;
  name: string;
  /** 是否命中使用者寫的期待 */
  matched: boolean;
  cards: DeckCard[];
};

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 產生一副盲選用的牌：
 * - 命中的領域排前面
 * - 每個領域每位候選人一張，沒政見的給空卡
 * - 每個領域各自洗牌，每次呼叫都重洗
 * - 沒有任何候選人提出政見的領域不出題
 */
export function buildDeck(countyId: string, matched: string[], overrides: Overrides): DeckDomain[] {
  const candidates = getCandidates(countyId);
  const cards = visibleCards(getPolicyFile(countyId), overrides);
  const byKey = new Map<string, PolicyCard>(cards.map((c) => [`${c.domainId}|${c.candidateId}`, c]));
  const domains = getDomains();

  const ordered = [
    ...matched.map((id) => domains.find((d) => d.id === id)).filter((d) => d !== undefined),
    ...domains.filter((d) => !matched.includes(d.id)),
  ];

  const deck: DeckDomain[] = [];
  for (const domain of ordered) {
    const row: DeckCard[] = candidates.map((cand) => {
      const card = byKey.get(`${domain.id}|${cand.id}`);
      if (!card) return { empty: true };
      const payload: CardPayload = { c: countyId, d: domain.id, k: cand.id };
      return { empty: false, token: seal(payload), points: card.points };
    });
    if (row.every((c) => c.empty)) continue;
    deck.push({ id: domain.id, name: domain.name, matched: matched.includes(domain.id), cards: shuffle(row) });
  }
  return deck;
}

export function sealSession(p: SessionPayload): string {
  return seal(p);
}

export function openSession(token: string): SessionPayload | null {
  const p = open<SessionPayload>(token);
  if (!p || typeof p.c !== "string" || !Array.isArray(p.m) || typeof p.t !== "number") return null;
  if (Date.now() - p.t > SESSION_MAX_AGE_MS) return null;
  return p;
}

export function openCard(token: string): CardPayload | null {
  const p = open<CardPayload>(token);
  if (!p || typeof p.c !== "string" || typeof p.d !== "string" || typeof p.k !== "string") return null;
  return p;
}
