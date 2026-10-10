"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ShareCardData } from "@/lib/sharecard";
import type { HeatView } from "@/lib/types";
import { DomainBallot } from "./DomainBallot";
import { DomainIcon } from "./DomainIcon";
import { HeatAbove, HeatList, HeatNote } from "./HeatList";
import { usePhase } from "./PhaseNotice";
import { PolicyCard } from "./PolicyCard";
import { ShareCard } from "./ShareCard";
import { Stamp } from "./Stamp";
import { StampTrail, type TrailItem } from "./StampTrail";

const MAX_MATCHED = 4;
/** 選完領域後，討論度清單列出前幾名 */
const HEAT_TOP = 5;
/** 每一關的政見卡依序叫甲、乙、丙…；每關重新洗牌，所以不同關的「甲」不是同一個人 */
const STEMS = "甲乙丙丁戊己庚辛壬癸";

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
  /** 讀完的卡（以卡片代碼記） */
  const [read, setRead] = useState<Record<string, boolean>>({});
  /** 剛剛過關的那一關，集章卡上的章用蓋下去的動畫出現 */
  const [fresh, setFresh] = useState<string | null>(null);
  /** 揭曉頁只看某位候選人時，記下是誰 */
  const [focus, setFocus] = useState<string | null>(null);
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
      setRead({});
      setFresh(null);
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
      setFocus(null);
      setFresh(null);
      setStep("reveal");
    });

  const markRead = useCallback((token: string) => setRead((r) => (r[token] ? r : { ...r, [token]: true })), []);

  function goTo(next: number) {
    if (deck[index] && deck[index].id in picks && next > index) setFresh(deck[index].id);
    else setFresh(null);
    setIndex(next);
  }

  function focusCandidate(id: string | null) {
    setFocus(id);
    requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("my-picks")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  }

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
  const realCards = current
    ? current.cards
        .filter((c): c is Extract<DeckCard, { empty: false }> => !c.empty)
        .map((card, i) => ({ card, label: STEMS[i] ?? String(i + 1) }))
    : [];
  const emptyCount = current ? current.cards.length - realCards.length : 0;
  const readCount = realCards.filter(({ card }) => read[card.token]).length;
  const pickedLabel = !current
    ? ""
    : !(current.id in picks)
      ? "還沒選"
      : picks[current.id] === null
        ? "這關都不滿意"
        : `選了${realCards.find(({ card }) => card.token === picks[current.id])?.label ?? ""}`;
  const trail: TrailItem[] = deck.map((d, i) => ({
    id: d.id,
    name: d.name,
    state:
      step === "pick" && i === index
        ? "current"
        : !(d.id in picks)
          ? "todo"
          : picks[d.id] === null
            ? "pass"
            : "done",
  }));
  const focusName = focus ? reveal?.tally.find((t) => t.candidateId === focus)?.name ?? null : null;
  const focusDomains = reveal ? (focus ? reveal.domains.filter((d) => d.pickedCandidateId === focus) : reveal.domains) : [];
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
    <div ref={top} tabIndex={-1} className="mx-auto max-w-3xl scroll-mt-4 px-4 pt-6 outline-none sm:pt-10">

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
        <section className={`world world-${current.id}`}>
          <div className="mt-2">
            <StampTrail items={trail} fresh={fresh} onJump={(i) => goTo(i)} label={`${countyName}政見闖關進度`} />
          </div>

          <div
            key={current.id}
            className="level-in -mx-4 mt-5 bg-[var(--w-bg)] px-4 pb-6 pt-7 sm:mx-0 sm:rounded-[28px] sm:px-8"
          >
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-card text-[var(--w-ink)] shadow-[0_4px_12px_rgb(42_41_38/0.08)]">
                <DomainIcon id={current.id} size={40} />
              </span>
              <div>
                <p className="font-bold text-[var(--w-ink)]" aria-live="polite">
                  第 {index + 1} 關，共 {deck.length} 關
                </p>
                <h1 className="text-4xl">{current.name}</h1>
              </div>
            </div>
            <p className="mt-4">
              {realCards.length} 位候選人的政見，名字都蓋起來了。挑一張你最認同的。
              {current.matched && <strong className="mt-1 block">這關是你在意的，選中的卡算兩票。</strong>}
            </p>

            <div role="group" aria-label={`${current.name}的政見卡`} className="mt-6 grid gap-5">
              {realCards.map(({ card, label }) => (
                <PolicyCard
                  key={card.token}
                  label={label}
                  points={card.points}
                  picked={picks[current.id] === card.token}
                  read={Boolean(read[card.token])}
                  onRead={() => markRead(card.token)}
                  onPick={() => setPicks((p) => ({ ...p, [current.id]: card.token }))}
                />
              ))}
            </div>

            {emptyCount > 0 && (
              <p className="mt-5 text-sm text-muted">另外 {emptyCount} 位候選人這關沒有提出政見。</p>
            )}

            <button
              type="button"
              aria-pressed={picks[current.id] === null}
              onClick={() => setPicks((p) => ({ ...p, [current.id]: null }))}
              className={`mt-5 min-h-12 w-full rounded-full border-2 border-dashed px-5 font-bold ${
                picks[current.id] === null ? "border-ink bg-ink text-white" : "border-muted text-muted hover:border-ink hover:text-ink"
              }`}
            >
              {picks[current.id] === null ? "這關都不滿意（已選）" : "這關都不滿意"}
            </button>

            {index < deck.length - 1 && answered > 0 && current.id in picks && (
              <p className="mt-4 text-center">
                <button className="link text-sm" onClick={showResult} disabled={busy}>
                  剩下的關卡跳過，直接揭曉
                </button>
              </p>
            )}
          </div>

          <div className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-card/95 px-4 py-3 backdrop-blur sm:mx-0 sm:mt-4 sm:rounded-2xl sm:border">
            <div className="flex items-center gap-2">
              <p className="mr-auto min-w-0 text-sm leading-snug">
                <span className="block font-bold">{pickedLabel}</span>
                <span className="block text-muted tabular-nums">
                  {readCount === realCards.length && realCards.length > 0 ? "這關都讀完了" : `讀完 ${readCount} / ${realCards.length} 張`}
                </span>
              </p>
              {index > 0 && (
                <button className="btn btn-quiet" onClick={() => goTo(index - 1)}>
                  上一關
                </button>
              )}
              {index < deck.length - 1 ? (
                <button className="btn" onClick={() => goTo(index + 1)} disabled={!(current.id in picks)}>
                  下一關
                </button>
              ) : (
                <button className="btn" onClick={showResult} disabled={busy || !(current.id in picks)}>
                  {busy ? "揭曉中…" : "揭曉結果"}
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {step === "reveal" && reveal && (
        <section>
          <div className="mt-2 rounded-[28px] bg-ink px-5 pb-6 pt-7 text-white sm:px-8">
            <p className="font-bold text-mark">
              {answered === deck.length ? `${deck.length} 關全部過關` : `過了 ${answered} 關，提前揭曉`}
            </p>
            <h1 className="mt-1 text-4xl text-white">
              你選的政見，
              <br />
              來自誰？
            </h1>
            <div className="mt-6">
              <StampTrail items={trail} label="過關紀錄" variant="card" />
            </div>
          </div>

          <p className="mt-6 text-muted">點候選人，直接跳到你選的那幾張政見。</p>
          <ul className="mt-3 grid gap-2">
            {reveal.tally.map((row) => {
              const bar = Math.round((row.count / Math.max(1, ...reveal.tally.map((t) => t.count))) * 100);
              const inner = (
                <>
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0">
                      <span className="font-serif text-xl font-black">{row.name}</span>
                      <span className="ml-2 text-sm text-muted">{row.party}</span>
                    </span>
                    <span className="shrink-0 text-lg font-bold tabular-nums">{row.count} 張</span>
                  </span>
                  <span className="mt-2 block h-2.5 rounded-full bg-paper" aria-hidden="true">
                    {row.count > 0 && <span className="bar-grow block h-2.5 rounded-full bg-ink" style={{ width: `${bar}%` }} />}
                  </span>
                  {row.count > 0 && (
                    <span className="mt-2 block text-sm font-bold text-stamp">
                      {focus === row.candidateId ? "正在看這幾張" : `看我選的 ${row.count} 張`}
                    </span>
                  )}
                </>
              );
              return (
                <li key={row.candidateId}>
                  {row.count > 0 ? (
                    <button
                      type="button"
                      aria-pressed={focus === row.candidateId}
                      onClick={() => focusCandidate(row.candidateId)}
                      className={`block w-full rounded-2xl bg-card px-4 py-3 text-left shadow-[0_4px_14px_rgb(42_41_38/0.07)] hover:ring-2 hover:ring-ink ${
                        focus === row.candidateId ? "ring-2 ring-stamp" : ""
                      }`}
                    >
                      {inner}
                    </button>
                  ) : (
                    <div className="rounded-2xl border border-line px-4 py-3 text-muted">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>

          {reveal.recommendation === null ? (
            <p className="mt-6 text-muted">推薦功能目前關閉，這裡只揭曉你選的政見來自誰。</p>
          ) : (
            <div className="relative mt-6 overflow-hidden rounded-[28px] border-2 border-ink bg-card p-6">
              {reveal.recommendation.kind === "single" && (
                <>
                  <p className="font-serif text-2xl font-black leading-snug">
                    依照政見，{countyName}你會投：
                    <span className="mt-1 block text-5xl">
                      <span className="marked">
                        {reveal.tally.find((t) => t.candidateId === reveal.recommendation!.candidateIds[0])?.name}
                      </span>
                    </span>
                  </p>
                  <span className="stamp-on pointer-events-none absolute right-5 top-5">
                    <Stamp size={72} />
                  </span>
                </>
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
                <p className="font-bold">你選了不到 3 關的政見，資料太少，這次不做推薦。</p>
              )}
              <p className="mt-3 text-sm text-muted">
                這個結果只根據你剛才選的卡片計算：你一開始選的領域一張算兩票，其他一張算一票。完整算法在
                <Link href="/method" className="link">資料與計分方法</Link>
                。政見摘要由 AI 整理，請對照下面的原文。
              </p>
            </div>
          )}

          {shareData && <ShareCard data={shareData} shareText={shareLine} />}

          <h2 id="my-picks" className="mt-12 scroll-mt-4 text-2xl">
            {focusName ? `你選了${focusName}的這 ${focusDomains.length} 張` : "你在每一關選了什麼"}
          </h2>
          {focusName && (
            <button className="btn btn-quiet mt-3" onClick={() => setFocus(null)}>
              看全部關卡
            </button>
          )}
          <div className="mt-5 space-y-6">
            {focusDomains.map((d) => (
              <div key={d.id} className={`world world-${d.id} rounded-[24px] bg-[var(--w-bg)] p-4 sm:p-6`}>
                <h3 className="flex items-center gap-3 text-xl">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-card text-[var(--w-ink)]">
                    <DomainIcon id={d.id} size={26} />
                  </span>
                  <span className={d.matched ? "marked" : ""}>{d.name}</span>
                  {d.pickedCandidateId === null && (
                    <span className="font-sans text-sm font-normal text-muted">你選了「都不滿意」</span>
                  )}
                </h3>
                <ul className="mt-4 grid gap-3">
                  {[...d.cards]
                    .sort((x, y) => Number(y.candidateId === d.pickedCandidateId) - Number(x.candidateId === d.pickedCandidateId))
                    .map((c) => {
                      const picked = c.candidateId === d.pickedCandidateId;
                      return (
                        <li
                          key={c.candidateId}
                          className={`relative rounded-2xl bg-card p-4 ${picked ? "pr-16 ring-2 ring-stamp" : "opacity-90"}`}
                        >
                          <p className="font-bold">
                            {c.name}
                            <span className="ml-2 text-sm font-normal text-muted">{c.party}</span>
                            {picked && <span className="ml-2 text-sm text-stamp">你選的</span>}
                          </p>
                          {c.points ? (
                            <>
                              <ul className="mt-2 space-y-1.5 leading-relaxed">
                                {c.points.map((p) => (
                                  <li key={p} className="flex gap-2.5">
                                    <span aria-hidden="true" className="mt-[0.65em] h-1.5 w-1.5 shrink-0 rotate-45 bg-[var(--w-ink)]" />
                                    <span>{p}</span>
                                  </li>
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
                            <span className="absolute right-3 top-3 -rotate-12">
                              <Stamp size={44} />
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
              重新闖關
            </button>
          </div>
          {reveal.asOf && <p className="mt-4 text-sm text-muted">政見資料截止日 {reveal.asOf}。</p>}
        </section>
      )}
    </div>
  );
}
