"use client";

import { useCallback, useEffect, useState } from "react";

type CardRow = {
  id: string;
  county: string;
  candidate: string;
  domain: string;
  points: string[];
  status: "published" | "held";
  heldReason: string | null;
  override: "hide" | "publish" | null;
  sourceUrl: string | null;
};
type ReportRow = {
  id: string;
  createdAt: string;
  countyId: string;
  candidateName: string | null;
  domainId: string | null;
  message: string;
  sourceUrl: string | null;
  status: "open" | "resolved";
  resolution: string | null;
};
type Overview = {
  storeKind: "supabase" | "memory";
  geminiConfigured: boolean;
  phase: { name: string; blindOpen: boolean; recommendOpen: boolean; statsOpen: boolean };
  settings: { recommendEnabled: boolean; statsEnabled: boolean };
  usage: { calls: number; cap: number };
  reports: ReportRow[];
  cards: CardRow[];
  changelog: { runAt: string; summary: string; added: number; changed: number; removed: number; held: number }[];
};

async function post(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "操作失敗");
  return data;
}

function isLive(card: CardRow): boolean {
  if (card.override === "hide") return false;
  if (card.override === "publish") return true;
  return card.status === "published";
}

export function AdminPanel() {
  const [data, setData] = useState<Overview | null>(null);
  const [needLogin, setNeedLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/overview");
    if (res.status === 401) {
      setNeedLogin(true);
      setData(null);
      return;
    }
    setNeedLogin(false);
    setData(await res.json());
  }, []);

  useEffect(() => {
    // 進入後台時載入一次
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function act(fn: () => Promise<unknown>) {
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失敗");
    }
  }

  if (needLogin) {
    return (
      <form
        className="mx-auto max-w-sm px-4 pt-16"
        onSubmit={(e) => {
          e.preventDefault();
          act(() => post("/api/admin/login", { password }));
        }}
      >
        <h1 className="text-3xl">後台登入</h1>
        {error && (
          <p role="alert" className="mt-4 font-bold text-stamp">
            {error}
          </p>
        )}
        <label className="mt-6 block font-bold">
          密碼
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border-2 border-ink bg-card px-3 py-2"
          />
        </label>
        <button className="btn mt-6">登入</button>
      </form>
    );
  }

  if (!data) return <p className="mx-auto max-w-5xl px-4 pt-10">載入中…</p>;

  const held = data.cards.filter((c) => c.status === "held" && c.override === null);
  const openReports = data.reports.filter((r) => r.status === "open");
  const shown = data.cards.filter((c) =>
    filter ? `${c.county}${c.candidate}${c.domain}${c.points.join("")}`.includes(filter) : true,
  );

  const toggle = (key: "recommendEnabled" | "statsEnabled", label: string, effective: boolean) => (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-card px-4 py-3">
      <div>
        <p className="font-bold">{label}</p>
        <p className="text-sm text-muted">
          開關：{data.settings[key] ? "開" : "關"}　實際狀態：{effective ? "顯示中" : "未顯示"}
          {data.settings[key] && !effective ? "（已過時間限制）" : ""}
        </p>
      </div>
      <button
        className="btn btn-quiet"
        onClick={() => act(() => post("/api/admin/setting", { key, value: !data.settings[key] }))}
      >
        {data.settings[key] ? "關閉" : "開啟"}
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">後台</h1>
        <button className="btn btn-quiet" onClick={() => act(() => post("/api/admin/logout"))}>
          登出
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-4 font-bold text-stamp">
          {error}
        </p>
      )}
      {data.storeKind === "memory" && (
        <p className="mt-4 rounded-lg border-2 border-stamp bg-stamp-soft px-4 py-3 font-bold">
          尚未連上 Supabase，目前的作答、回報與開關只存在記憶體，重啟就會消失。
        </p>
      )}

      <section className="mt-8">
        <h2 className="text-xl">緊急開關</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {toggle("recommendEnabled", "「推薦你投誰」這句話", data.phase.recommendOpen)}
          {toggle("statsEnabled", "統計數字", data.phase.statsOpen)}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl">用量</h2>
        <p className="mt-2">
          本月 Gemini 分類 {data.usage.calls.toLocaleString()} 次，上限 {data.usage.cap.toLocaleString()} 次。
          {data.geminiConfigured ? "" : "尚未設定 GEMINI_API_KEY，目前用關鍵字比對。"}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-xl">被關卡扣住的政見（{held.length}）</h2>
        {held.length === 0 ? (
          <p className="mt-2 text-muted">沒有待確認的項目。</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {held.map((c) => (
              <li key={c.id} className="rounded-lg border-2 border-ink bg-card p-4">
                <p className="font-bold">
                  {c.county}　{c.candidate}　{c.domain}
                </p>
                <p className="text-sm text-stamp">{c.heldReason}</p>
                <ul className="mt-1 list-disc pl-5">
                  {c.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="btn" onClick={() => act(() => post("/api/admin/override", { policyId: c.id, action: "publish" }))}>
                    放行
                  </button>
                  <button className="btn btn-quiet" onClick={() => act(() => post("/api/admin/override", { policyId: c.id, action: "hide" }))}>
                    退回
                  </button>
                  {c.sourceUrl && (
                    <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="link self-center">
                      看來源
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl">回報收件匣（未處理 {openReports.length}）</h2>
        {data.reports.length === 0 ? (
          <p className="mt-2 text-muted">還沒有人回報。</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {data.reports.map((r) => (
              <li key={r.id} className="rounded-lg border border-line bg-card p-4">
                <p className="text-sm text-muted">
                  {new Date(r.createdAt).toLocaleString("zh-TW")}　{r.countyId}
                  {r.candidateName ? `　${r.candidateName}` : ""}
                  {r.domainId ? `　${r.domainId}` : ""}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{r.message}</p>
                {r.sourceUrl && (
                  <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="link text-sm">
                    {r.sourceUrl}
                  </a>
                )}
                {r.status === "resolved" ? (
                  <p className="mt-2 text-sm text-muted">已處理：{r.resolution}</p>
                ) : (
                  <form
                    className="mt-3 flex flex-wrap gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const resolution = new FormData(e.currentTarget).get("resolution");
                      act(() => post("/api/admin/report-resolve", { id: r.id, resolution }));
                    }}
                  >
                    <input
                      name="resolution"
                      required
                      placeholder="處理結果"
                      aria-label="處理結果"
                      className="min-w-0 flex-1 rounded-lg border-2 border-ink bg-card px-3 py-2"
                    />
                    <button className="btn">標為已處理</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl">更新紀錄</h2>
        <ul className="mt-3 space-y-2">
          {data.changelog.map((c) => (
            <li key={c.runAt} className="rounded-lg border border-line bg-card px-4 py-3">
              <p className="font-bold">{new Date(c.runAt).toLocaleString("zh-TW")}</p>
              <p>{c.summary}</p>
              <p className="text-sm text-muted">
                新增 {c.added}　修改 {c.changed}　移除 {c.removed}　扣住 {c.held}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-xl">所有政見卡（{data.cards.length}）</h2>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="用縣市、候選人、領域或內容篩選"
          aria-label="篩選政見卡"
          className="mt-3 w-full rounded-lg border-2 border-ink bg-card px-3 py-2"
        />
        <ul className="mt-3 space-y-2">
          {shown.slice(0, 200).map((c) => (
            <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-line bg-card px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {c.county}　{c.candidate}　{c.domain}
                  <span className={`ml-2 text-sm font-normal ${isLive(c) ? "text-muted" : "text-stamp"}`}>
                    {isLive(c) ? "顯示中" : "未顯示"}
                  </span>
                </p>
                <p className="text-sm">{c.points.join("；")}</p>
              </div>
              {isLive(c) ? (
                <button className="btn btn-quiet" onClick={() => act(() => post("/api/admin/override", { policyId: c.id, action: "hide" }))}>
                  下架
                </button>
              ) : (
                <button
                  className="btn btn-quiet"
                  onClick={() =>
                    act(() => post("/api/admin/override", { policyId: c.id, action: c.status === "published" ? null : "publish" }))
                  }
                >
                  恢復顯示
                </button>
              )}
            </li>
          ))}
        </ul>
        {shown.length > 200 && <p className="mt-2 text-sm text-muted">只顯示前 200 筆，請用篩選縮小範圍。</p>}
      </section>
    </div>
  );
}
