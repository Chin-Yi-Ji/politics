"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ShareCardData } from "@/lib/sharecard";
import type { HeatView } from "@/lib/types";
import { DomainBallot } from "./DomainBallot";
import { HeatAbove, HeatList, HeatNote } from "./HeatList";
import { usePhase } from "./PhaseNotice";
import { ShareCard } from "./ShareCard";
import { Stamp } from "./Stamp";

const MAX_MATCHED = 4;
/** 選完領域後，討論度清單列出前幾名 */
const HEAT_TOP = 5;

type DomainInfo = { id: string; name: string };
type DeckCard = { empty: true } | { empty: false; token: string; points: string[] };
type DeckDomain = { id: string; name: string; matched: boolean; cards: DeckCard[] };
/** token：選了某張卡；null：都不滿意 */
type Picks = Record<string, string | null>;

type Original = { quote: string; sourceUrl: string; sourceType: string; capturedAt: string };
type Reveal = {
  asOf: string | null;
  validPicks: number;
  tally: { candidateId: string; name: string; party: string; count: number; weighted: number }[];
  recommendation:
    | { kind: "single" | "tie"; candidateIds: string[] }
    | { kind: "insufficient"; candidateIds: [] }
    | null;
  domains: {
    id: string;
    name: string;
    matched: boolean;
    pickedCandidateId: string | null;
    cards: { candidateId: string; name: string; party: string; points: string[] | null; originals: Original[] }[];
  }[];
};

const SOURCE_LABEL: Record<string, string> = {
  bulletin: "選舉公報",
  official: "候選人官網或官方社群",
  forum: "公辦政見發表會",
  media: "新聞報導",
};

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "連線失敗，請再試一次。");
  return data as T;
}

export function BlindFlow({
  countyId,
  countyName,
  domains,
  heat,
}: {
  countyId: string;
  countyName: string;
  domains: DomainInfo[];
  heat: HeatView | null;
}) {
  const phase = usePhase();
  const [step, setStep] = useState<"choose" | "heat" | "pick" | "reveal">("choose");
  const [matched, setMatched] = useState<string[]>([]);
  const [session, setSession] = useState("");
  const [deck, setDeck] = useState<DeckDomain[]>([]);
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Picks>({});
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [shared, setShared] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    top.current?.scrollIntoView({ block: "start" });
    top.current?.focus({ preventScroll: true });
  }, [step, index]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "發生錯誤，請再試一次。");
    } finally {
      setBusy(false);
    }
  }

  const startBlind = () =>
    run(async () => {
      const r = await post<{ session: string; deck: DeckDomain[] }>("/api/blind/start", {
        countyId,
        text: "",
        domainIds: matched,
        mode: "manual",
      });
      setSession(r.session);
      setDeck(r.deck);
      setPicks({});
      setIndex(0);
      setStep("pick");
    });

  const showResult = () =>
    run(async () => {
      const r = await post<Reveal>("/api/blind/reveal", {
        session,
        picks: Object.entries(picks).map(([domainId, token]) => ({ domainId, token })),
      });
      setReveal(r);
      setStep("reveal");
    });

  /** 選完領域：有討論度資料就先給使用者看，沒有就直接發牌 */
  const afterChoose = () => (heat ? setStep("heat") : startBlind());

  function toggleDomain(id: string) {
    setMatched((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= MAX_MATCHED ? cur : [...cur, id],
    );
  }

  async function share() {
    const names = matched
      .slice(0, 3)
      .map((id) => domains.find((d) => d.id === id)?.name)
      .filter(Boolean);
    const line =
      (names.length ? `我對${countyName}最在意的是：${names.join("、")}。` : "") +
      "先看政見，再看是誰。來盲選你的縣市長政見：";
    const url = window.location.origin;
    try {
      if (navigator.share) await navigator.share({ text: line, url });
      else {
        await navigator.clipboard.writeText(`${line}${url}`);
        setShared(true);
      }
    } catch {
      // 使用者取消分享
    }
  }

  if (phase && !phase.blindOpen) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-12">
        <h1 className="text-4xl">盲選已經關閉</h1>
        <p className="mt-4">
          投票日零時起不再提供盲選與推薦。{countyName}所有候選人的政見對照表照常開放。
        </p>
        <Link href={`/county/${countyId}`} className="btn mt-6">
          看{countyName}的政見對照表
        </Link>
      </div>
    );
  }

  const current = deck[index];
  const answered = Object.keys(picks).length;
  const heatRanks = heat ? heat.items.map((item, i) => ({ id: item.id, name: item.name, rank: i + 1 })) : [];
  const pickedRanks = heatRanks.filter((x) => matched.includes(x.id));
  const pickedInTop = pickedRanks.filter((x) => x.rank <= HEAT_TOP).length;
  const pickedOutside = pickedRanks.filter((x) => x.rank > HEAT_TOP);

  // 有推薦對象（單一或平手）才做分享圖；推薦關閉或資料太少時不做
  const rec = reveal?.recommendation;
  const shareData: ShareCardData | null =
    reveal && rec && rec.kind !== "insufficient"
      ? {
          countyName,
          winners: rec.candidateIds
            .map((id) => reveal.tally.find((t) => t.candidateId === id))
            .filter((t) => t !== undefined)
            .map((t) => ({ name: t.name, party: t.party })),
          tally: [...reveal.tally]
            .sort((a, b) => b.weighted - a.weighted)
            .map((t) => ({ name: t.name, weighted: t.weighted })),
          domains: matched.map((id) => domains.find((d) => d.id === id)?.name ?? "").filter(Boolean),
          host: typeof window === "undefined" ? "" : window.location.host,
        }
      : null;
  const shareLine =
    "先看政見，再看是誰。來盲選你的縣市長政見：" + (typeof window === "undefined" ? "" : window.location.origin);

  return (
    <div ref={top} tabIndex={-1} className="mx-auto max-w-3xl scroll-mt-4 px-4 pt-10 outline-none">
      <p className="text-sm text-muted">{countyName}長政見盲選</p>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border-2 border-stamp bg-stamp-soft px-4 py-3 font-bold">
          {error}
        </p>
      )}

      {step === "choose" && (
        <section>
          <h1 className="mt-2 text-balance text-4xl">你希望{countyName}哪裡做出改變？</h1>
          <DomainBallot domains={domains} selected={matched} max={MAX_MATCHED} onToggle={toggleDomain} />
          <p className="mt-3 text-sm text-muted">你選的領域會先出現，最後計票時算兩票。</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="btn" onClick={afterChoose} disabled={busy || matched.length === 0}>
              {busy ? "發牌中…" : "選好了"}
            </button>
            {matched.length === 0 && (
              <button className="btn btn-quiet" onClick={afterChoose} disabled={busy}>
                沒有特別在意的，直接開始
              </button>
            )}
          </div>
        </section>
      )}

      {step === "heat" && heat && (
        <section>
          <h1 className="mt-2 text-balance text-4xl">{countyName}最近常被談到的事</h1>
          {matched.length > 0 && (
            <p className="mt-3 text-lg">
              你選的 {matched.length} 個領域裡，有 {pickedInTop} 個在討論度前 {HEAT_TOP} 名。
            </p>
          )}
          <div className="mt-6 rounded-lg border-2 border-ink bg-card px-4 py-4">
            <HeatList heat={heat} limit={HEAT_TOP} compact picked={matched} />
            {pickedOutside.length > 0 && (
              <p className="mt-4 border-t border-line pt-3 text-sm">
                <span className="font-bold">你選的其他領域：</span>
                {pickedOutside.map((x) => `${x.name}（第 ${x.rank} 名）`).join("、")}
              </p>
            )}
            <HeatAbove heat={heat} limit={HEAT_TOP} />
            <HeatNote heat={heat} />
          </div>
          <p className="mt-3 text-sm text-muted">討論度不會改變卡片順序，也不會影響推薦。</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="btn" onClick={startBlind} disabled={busy}>
              {busy ? "發牌中…" : "開始盲選"}
            </button>
            <button className="btn btn-quiet" onClick={() => setStep("choose")} disabled={busy}>
              回去重選
            </button>
          </div>
        </section>
      )}

      {step === "pick" && current && (
        <section>
          <p className="mt-2 font-bold tabular-nums" aria-live="polite">
            第 {index + 1} 個領域，共 {deck.length} 個
          </p>
          <h1 className="mt-1 text-4xl">
            <span className={current.matched ? "marked" : ""}>{current.name}</span>
          </h1>
          <p className="mt-3">
            {current.matched ? "這是你一開始選的領域。" : ""}
            每張卡來自一位候選人，順序是隨機的。選一張你最認同的。
          </p>

          <div role="radiogroup" aria-label={`${current.name}的政見`} className="mt-6 grid gap-4">
            {current.cards.map((card, i) =>
              card.empty ? (
                <div key={`empty-${i}`} className="rounded-lg border-2 border-dashed border-line px-5 py-4 text-muted">
                  有一位候選人在這個領域未提出政見。
                </div>
              ) : (
                <button
                  key={card.token}
                  type="button"
                  role="radio"
                  aria-checked={picks[current.id] === card.token}
                  onClick={() => setPicks((p) => ({ ...p, [current.id]: card.token }))}
                  className={`relative rounded-lg border-2 bg-card px-5 py-4 pr-20 text-left ${
                    picks[current.id] === card.token ? "border-stamp" : "border-ink hover:bg-stamp-soft"
                  }`}
                >
                  <ul className="list-disc space-y-1 pl-5 text-lg">
                    {card.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                  {picks[current.id] === card.token && (
                    <span className="stamp-on absolute right-4 top-1/2 -mt-7">
                      <Stamp size={56} />
                    </span>
                  )}
                </button>
              ),
            )}
            <button
              type="button"
              role="radio"
              aria-checked={picks[current.id] === null}
              onClick={() => setPicks((p) => ({ ...p, [current.id]: null }))}
              className={`rounded-lg border-2 px-5 py-3 text-left font-bold ${
                picks[current.id] === null ? "border-ink bg-ink text-white" : "border-line bg-transparent"
              }`}
            >
              都不滿意
            </button>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {index < deck.length - 1 ? (
              <button className="btn" onClick={() => setIndex(index + 1)} disabled={!(current.id in picks)}>
                下一個領域
              </button>
            ) : (
              <button className="btn" onClick={showResult} disabled={busy || !(current.id in picks)}>
                {busy ? "揭曉中…" : "揭曉結果"}
              </button>
            )}
            {index > 0 && (
              <button className="btn btn-quiet" onClick={() => setIndex(index - 1)}>
                上一個領域
              </button>
            )}
            {index < deck.length - 1 && answered > 0 && current.id in picks && (
              <button className="btn btn-quiet" onClick={showResult} disabled={busy}>
                剩下的跳過，直接揭曉
              </button>
            )}
          </div>
        </section>
      )}

      {step === "reveal" && reveal && (
        <section>
          <h1 className="mt-2 text-4xl">揭曉</h1>
          <p className="mt-3">你選了 {reveal.validPicks} 張政見卡，它們來自：</p>
          <ul className="mt-3 max-w-xl space-y-2">
            {reveal.tally.map((row) => (
              <li key={row.candidateId} className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
                <span>
                  <span className="text-lg font-bold">{row.name}</span>
                  <span className="ml-2 text-sm text-muted">{row.party}</span>
                </span>
                <span className="tabular-nums">{row.count} 張</span>
              </li>
            ))}
          </ul>

          {reveal.recommendation === null ? (
            <p className="mt-6 text-muted">推薦功能目前關閉，這裡只揭曉你選的政見來自誰。</p>
          ) : (
            <div className="mt-6 rounded-lg border-2 border-ink bg-card p-5">
              {reveal.recommendation.kind === "single" && (
                <p className="font-serif text-2xl font-black">
                  依照政見，{countyName}你會投：
                  <span className="marked">
                    {reveal.tally.find((t) => t.candidateId === reveal.recommendation!.candidateIds[0])?.name}
                  </span>
                </p>
              )}
              {reveal.recommendation.kind === "tie" && (
                <p className="font-serif text-2xl font-black">
                  依照政見，
                  {reveal.recommendation.candidateIds
                    .map((id) => reveal.tally.find((t) => t.candidateId === id)?.name)
                    .join("、")}
                  平手，沒有單一推薦。
                </p>
              )}
              {reveal.recommendation.kind === "insufficient" && (
                <p className="font-bold">你選了不到 3 個領域的政見，資料太少，這次不做推薦。</p>
              )}
              <p className="mt-2 text-sm text-muted">
                這個結果只根據你剛才選的卡片計算：你一開始選的領域一張算兩票，其他領域一張算一票。完整算法在
                <Link href="/method" className="link">資料與計分方法</Link>
                。政見摘要由 AI 整理，請對照下面的原文。
              </p>
            </div>
          )}

          {shareData && <ShareCard data={shareData} shareText={shareLine} />}

          <h2 className="mt-10 text-2xl">你在每個領域選了什麼</h2>
          <div className="mt-4 space-y-8">
            {reveal.domains.map((d) => (
              <div key={d.id}>
                <h3 className="border-b-2 border-ink pb-1 text-xl">
                  <span className={d.matched ? "marked" : ""}>{d.name}</span>
                  {d.pickedCandidateId === null && (
                    <span className="ml-3 font-sans text-sm font-normal text-muted">你選了「都不滿意」</span>
                  )}
                </h3>
                <ul className="mt-3 grid gap-3">
                  {d.cards.map((c) => {
                    const picked = c.candidateId === d.pickedCandidateId;
                    return (
                      <li
                        key={c.candidateId}
                        className={`relative rounded-lg border-2 bg-card p-4 ${picked ? "border-stamp pr-20" : "border-line"}`}
                      >
                        <p className="font-bold">
                          {c.name}
                          <span className="ml-2 text-sm font-normal text-muted">{c.party}</span>
                          {picked && <span className="ml-2 text-sm text-stamp">你選的</span>}
                        </p>
                        {c.points ? (
                          <>
                            <ul className="mt-2 list-disc space-y-1 pl-5">
                              {c.points.map((p) => (
                                <li key={p}>{p}</li>
                              ))}
                            </ul>
                            <details className="mt-3 text-sm">
                              <summary className="cursor-pointer text-muted">看原文與來源</summary>
                              {c.originals.map((o) => (
                                <blockquote key={o.sourceUrl + o.quote} className="mt-2 border-l-4 border-line pl-3">
                                  <p>「{o.quote}」</p>
                                  <p className="mt-1 text-muted">
                                    <a href={o.sourceUrl} className="link" rel="noopener noreferrer" target="_blank">
                                      {SOURCE_LABEL[o.sourceType] ?? "來源"}
                                    </a>
                                    ，{o.capturedAt} 擷取
                                  </p>
                                </blockquote>
                              ))}
                            </details>
                          </>
                        ) : (
                          <p className="mt-2 text-muted">未提出</p>
                        )}
                        {picked && (
                          <span className="absolute right-4 top-4 -rotate-12">
                            <Stamp size={48} />
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href={`/county/${countyId}`} className="btn">
              看{countyName}完整政見對照表
            </Link>
            {!shareData && (
              <button className="btn btn-quiet" onClick={share}>
                {shared ? "已複製分享文字" : "分享我在意的領域"}
              </button>
            )}
            <button className="btn btn-quiet" onClick={() => setStep("choose")}>
              重新盲選
            </button>
          </div>
          {reveal.asOf && <p className="mt-4 text-sm text-muted">政見資料截止日 {reveal.asOf}。</p>}
        </section>
      )}
    </div>
  );
}
