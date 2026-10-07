export type Domain = {
  id: string;
  name: string;
  hint: string;
  keywords: string[];
};

export type County = {
  id: string;
  name: string;
  type: string;
  /** collecting：只有名冊，政見還在整理；ready：政見已上線 */
  status: "collecting" | "ready";
  /** 嚴格模式下尚未開放的原因，顯示在縣市頁 */
  pendingNote?: string;
  demo?: boolean;
};

export type Candidate = {
  id: string;
  countyId: string;
  name: string;
  party: string;
  ballotNumber: number | null;
  rosterSources: string[];
  note?: string;
};

/** media：新聞報導中候選人公開提出的政見，只在候選人沒有可查證的官方文字時使用 */
export type SourceType = "bulletin" | "official" | "forum" | "media";

export type Original = {
  /** 候選人原話，必須能在來源頁面逐字找到 */
  quote: string;
  sourceUrl: string;
  sourceType: SourceType;
  capturedAt: string;
};

/** 一位候選人在一個領域的政見卡 */
export type PolicyCard = {
  id: string;
  candidateId: string;
  domainId: string;
  /** 去識別化的中性摘要，最多 5 點、每點 60 字內、合計 220 字內 */
  points: string[];
  /** 這張卡同時引用第一手來源與新聞報導時必填：只靠第一手來源寫得出來的摘要，嚴格模式顯示這一份 */
  strictPoints?: string[];
  /** held：被自動關卡扣住，後台放行後才顯示 */
  status: "published" | "held";
  heldReason?: string;
  originals: Original[];
};

export type PolicyFile = {
  countyId: string;
  asOf: string;
  note?: string;
  cards: PolicyCard[];
};

export type OverrideAction = "hide" | "publish";
export type Overrides = Record<string, OverrideAction>;

export type Settings = {
  recommendEnabled: boolean;
  statsEnabled: boolean;
};

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  bulletin: "選舉公報",
  official: "候選人官網或官方社群",
  forum: "公辦政見發表會",
  media: "新聞報導",
};

export type CandidateSources = {
  official: { label: string; url: string }[];
  note: string;
};

/** 討論熱度：scripts/build-heat.py 產生的 data/heat.json */
export type HeatDomain = {
  id: string;
  /** 新聞占比與 PTT 占比的平均，0–1 */
  index: number;
  /** 這個縣市的新聞占比 ÷ 各縣市同領域的平均；大於 1 表示比其他縣市更常被提到 */
  lift: number;
  news: number;
  ptt: number;
  pttPushes: number;
  terms: string[];
};
export type CountyHeat = {
  enough: boolean;
  usesPtt: boolean;
  newsTotal: number;
  ptt: { boards: string[]; posts: number; classified: number };
  domains: HeatDomain[];
};
export type HeatFile = {
  generatedAt: string;
  windowDays: number;
  from: string;
  to: string;
  sources: string[];
  counties: Record<string, CountyHeat>;
};

/** 給畫面用的熱度資料 */
export type HeatView = {
  from: string;
  to: string;
  newsTotal: number;
  pttPosts: number;
  usesPtt: boolean;
  items: { id: string; name: string; share: number; lift: number; above: boolean; terms: string[]; news: number; ptt: number }[];
};
