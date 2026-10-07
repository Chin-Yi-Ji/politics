import type { Settings } from "./types";

/** 臺灣時間，全年 UTC+8 */
export const LAUNCH_AT = new Date("2026-11-01T00:00:00+08:00");
/** 投票日前 10 日起不得發布民調資料（選罷法第 53 條），統計頁從這一刻起下架 */
export const STATS_OFF_AT = new Date("2026-11-18T00:00:00+08:00");
/** 資料最後一次更新，之後凍結 */
export const DATA_FREEZE_AT = new Date("2026-11-26T23:59:59+08:00");
/** 投票日零時起關閉盲選與推薦，之後不再開啟 */
export const ELECTION_DAY_AT = new Date("2026-11-28T00:00:00+08:00");
export const POLLS_CLOSE_AT = new Date("2026-11-28T16:00:00+08:00");

export type PhaseName = "open" | "blackout" | "election-day" | "after";

export type Phase = {
  name: PhaseName;
  /** 盲選流程是否開放 */
  blindOpen: boolean;
  /** 是否顯示「推薦你投誰」 */
  recommendOpen: boolean;
  /** 是否顯示統計 */
  statsOpen: boolean;
};

export function phaseAt(now: Date): Phase {
  const t = now.getTime();
  if (t >= POLLS_CLOSE_AT.getTime()) {
    return { name: "after", blindOpen: false, recommendOpen: false, statsOpen: false };
  }
  if (t >= ELECTION_DAY_AT.getTime()) {
    return { name: "election-day", blindOpen: false, recommendOpen: false, statsOpen: false };
  }
  if (t >= STATS_OFF_AT.getTime()) {
    return { name: "blackout", blindOpen: true, recommendOpen: true, statsOpen: false };
  }
  return { name: "open", blindOpen: true, recommendOpen: true, statsOpen: true };
}

/** 時間規則與後台開關取交集：任何一邊關掉就是關 */
export function effectivePhase(now: Date, settings: Settings): Phase {
  const p = phaseAt(now);
  return {
    ...p,
    recommendOpen: p.recommendOpen && settings.recommendEnabled,
    statsOpen: p.statsOpen && settings.statsEnabled,
  };
}

/** 測試用：設定 PHASE_NOW（ISO 時間）可以預覽之後的模式 */
export function currentTime(): Date {
  const override = process.env.PHASE_NOW;
  if (override) {
    const d = new Date(override);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}
