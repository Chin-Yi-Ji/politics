import { randomUUID } from "node:crypto";
import type { OverrideAction, Overrides, Settings } from "./types";

/**
 * 會變動的資料（使用者作答、回報、後台開關與下架）放在 Supabase。
 * 沒有設定 SUPABASE_URL 時改用記憶體，方便本機開發；重啟就會清空。
 */

export type StoredPick = { domainId: string; candidateId: string | null };

export type Report = {
  id: string;
  createdAt: string;
  countyId: string;
  candidateName: string | null;
  domainId: string | null;
  message: string;
  sourceUrl: string | null;
  status: "open" | "resolved";
  resolution: string | null;
  resolvedAt: string | null;
};

export type DomainInterest = { total: number; rows: { domainId: string; count: number }[] };

export interface Store {
  readonly kind: "supabase" | "memory";
  createResponse(r: { countyId: string; text: string; matched: string[]; mode: string }): Promise<string | null>;
  completeResponse(id: string, r: { picks: StoredPick[]; recommended: string[] }): Promise<void>;
  addReport(r: Pick<Report, "countyId" | "candidateName" | "domainId" | "message" | "sourceUrl">): Promise<void>;
  listReports(): Promise<Report[]>;
  resolveReport(id: string, resolution: string): Promise<void>;
  getOverrides(): Promise<Overrides>;
  setOverride(policyId: string, action: OverrideAction | null): Promise<void>;
  getSettings(): Promise<Settings>;
  setSetting(key: keyof Settings, value: boolean): Promise<void>;
  /** 本月分類呼叫次數加一，回傳加完後的數字 */
  incUsage(): Promise<number>;
  getUsage(): Promise<number>;
  domainInterest(countyId: string): Promise<DomainInterest>;
}

export const DEFAULT_SETTINGS: Settings = { recommendEnabled: true, statsEnabled: true };

function monthKey(): string {
  // 以臺灣時間計月
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 7);
}

/* ---------- 記憶體版 ---------- */

type Mem = {
  responses: Map<string, { countyId: string; text: string; matched: string[]; mode: string; picks: StoredPick[] | null }>;
  reports: Report[];
  overrides: Overrides;
  settings: Settings;
  usage: Map<string, number>;
};

const g = globalThis as unknown as { __memStore?: Mem };

function mem(): Mem {
  g.__memStore ??= {
    responses: new Map(),
    reports: [],
    overrides: {},
    settings: { ...DEFAULT_SETTINGS },
    usage: new Map(),
  };
  return g.__memStore;
}

const memoryStore: Store = {
  kind: "memory",
  async createResponse(r) {
    const id = randomUUID();
    mem().responses.set(id, { ...r, picks: null });
    return id;
  },
  async completeResponse(id, r) {
    const row = mem().responses.get(id);
    if (row) row.picks = r.picks;
  },
  async addReport(r) {
    mem().reports.unshift({
      ...r,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: "open",
      resolution: null,
      resolvedAt: null,
    });
  },
  async listReports() {
    return mem().reports;
  },
  async resolveReport(id, resolution) {
    const r = mem().reports.find((x) => x.id === id);
    if (r) {
      r.status = "resolved";
      r.resolution = resolution;
      r.resolvedAt = new Date().toISOString();
    }
  },
  async getOverrides() {
    return { ...mem().overrides };
  },
  async setOverride(policyId, action) {
    if (action === null) delete mem().overrides[policyId];
    else mem().overrides[policyId] = action;
  },
  async getSettings() {
    return { ...mem().settings };
  },
  async setSetting(key, value) {
    mem().settings[key] = value;
  },
  async incUsage() {
    const k = monthKey();
    const n = (mem().usage.get(k) ?? 0) + 1;
    mem().usage.set(k, n);
    return n;
  },
  async getUsage() {
    return mem().usage.get(monthKey()) ?? 0;
  },
  async domainInterest(countyId) {
    const counts = new Map<string, number>();
    let total = 0;
    for (const r of mem().responses.values()) {
      if (r.countyId !== countyId) continue;
      total += 1;
      for (const d of r.matched) counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return { total, rows: [...counts].map(([domainId, count]) => ({ domainId, count })) };
  },
};

/* ---------- Supabase 版（透過 PostgREST，只在伺服器端用 service role 金鑰） ---------- */

function supabaseStore(url: string, serviceKey: string): Store {
  async function rest(pathAndQuery: string, init: RequestInit & { prefer?: string } = {}) {
    const res = await fetch(`${url}/rest/v1/${pathAndQuery}`, {
      ...init,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        ...(init.prefer ? { Prefer: init.prefer } : {}),
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  return {
    kind: "supabase",
    async createResponse(r) {
      const rows = await rest("responses", {
        method: "POST",
        prefer: "return=representation",
        body: JSON.stringify({
          county_id: r.countyId,
          expectation_text: r.text,
          matched_domains: r.matched,
          classify_mode: r.mode,
        }),
      });
      return rows?.[0]?.id ?? null;
    },
    async completeResponse(id, r) {
      await rest(`responses?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          picks: r.picks,
          recommended: r.recommended,
          completed_at: new Date().toISOString(),
        }),
      });
    },
    async addReport(r) {
      await rest("reports", {
        method: "POST",
        body: JSON.stringify({
          county_id: r.countyId,
          candidate_name: r.candidateName,
          domain_id: r.domainId,
          message: r.message,
          source_url: r.sourceUrl,
        }),
      });
    },
    async listReports() {
      const rows = (await rest("reports?select=*&order=created_at.desc&limit=200")) as Record<string, string | null>[];
      return rows.map((x) => ({
        id: x.id as string,
        createdAt: x.created_at as string,
        countyId: x.county_id as string,
        candidateName: x.candidate_name,
        domainId: x.domain_id,
        message: x.message as string,
        sourceUrl: x.source_url,
        status: x.status as "open" | "resolved",
        resolution: x.resolution,
        resolvedAt: x.resolved_at,
      }));
    },
    async resolveReport(id, resolution) {
      await rest(`reports?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "resolved", resolution, resolved_at: new Date().toISOString() }),
      });
    },
    async getOverrides() {
      const rows = (await rest("policy_overrides?select=policy_id,action")) as { policy_id: string; action: OverrideAction }[];
      return Object.fromEntries(rows.map((x) => [x.policy_id, x.action]));
    },
    async setOverride(policyId, action) {
      if (action === null) {
        await rest(`policy_overrides?policy_id=eq.${encodeURIComponent(policyId)}`, { method: "DELETE" });
      } else {
        await rest("policy_overrides", {
          method: "POST",
          prefer: "resolution=merge-duplicates",
          body: JSON.stringify({ policy_id: policyId, action, updated_at: new Date().toISOString() }),
        });
      }
    },
    async getSettings() {
      const rows = (await rest("settings?select=key,value")) as { key: string; value: unknown }[];
      const s = { ...DEFAULT_SETTINGS };
      for (const row of rows) {
        if (row.key === "recommendEnabled" || row.key === "statsEnabled") s[row.key] = row.value === true;
      }
      return s;
    },
    async setSetting(key, value) {
      await rest("settings", {
        method: "POST",
        prefer: "resolution=merge-duplicates",
        body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
      });
    },
    async incUsage() {
      const n = await rest("rpc/inc_usage", { method: "POST", body: JSON.stringify({ p_month: monthKey() }) });
      return Number(n) || 0;
    },
    async getUsage() {
      const rows = (await rest(`usage?month=eq.${monthKey()}&select=classify_calls`)) as { classify_calls: number }[];
      return rows[0]?.classify_calls ?? 0;
    },
    async domainInterest(countyId) {
      const rows = (await rest("rpc/domain_interest", {
        method: "POST",
        body: JSON.stringify({ p_county: countyId }),
      })) as { domain_id: string; n: number; total: number }[];
      return {
        total: rows[0]?.total ?? 0,
        rows: rows.map((x) => ({ domainId: x.domain_id, count: Number(x.n) })),
      };
    },
  };
}

export function getStore(): Store {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return supabaseStore(url.replace(/\/$/, ""), key);
  return memoryStore;
}
