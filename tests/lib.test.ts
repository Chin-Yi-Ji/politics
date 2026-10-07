import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { keywordClassify, parseDomainIds } from "../src/lib/classify";
import { applyDiffGate, checkSource, diffGate, quoteFound } from "../src/lib/gates";
import { completeness, orderPoints } from "../src/lib/order";
import { effectivePhase, phaseAt } from "../src/lib/phase";
import { computeResult } from "../src/lib/recommend";
import { policyFileSchema } from "../src/lib/schema";
import { open, seal } from "../src/lib/token";
import type { Domain, HeatFile, PolicyCard, PolicyFile } from "../src/lib/types";

const at = (iso: string) => new Date(iso);
const C = ["a", "b", "c"];

describe("推薦公式", () => {
  it("期待命中的領域算兩票", () => {
    const r = computeResult(
      [
        { domainId: "transport", candidateId: "a" },
        { domainId: "housing", candidateId: "b" },
        { domainId: "health", candidateId: "b" },
      ],
      ["transport"],
      C,
    );
    // a：1 張卡 2 票；b：2 張卡 2 票 → 平手
    assert.deepEqual(r.recommendation, { kind: "tie", candidateIds: ["b", "a"] });
    assert.equal(r.tally.find((t) => t.candidateId === "a")!.weighted, 2);
  });

  it("單一領先者才給單一推薦", () => {
    const r = computeResult(
      [
        { domainId: "transport", candidateId: "a" },
        { domainId: "housing", candidateId: "a" },
        { domainId: "health", candidateId: "b" },
      ],
      [],
      C,
    );
    assert.deepEqual(r.recommendation, { kind: "single", candidateIds: ["a"] });
  });

  it("有效作答少於 3 個領域不推薦，「都不滿意」不算有效作答", () => {
    const r = computeResult(
      [
        { domainId: "transport", candidateId: "a" },
        { domainId: "housing", candidateId: "a" },
        { domainId: "health", candidateId: null },
        { domainId: "safety", candidateId: null },
      ],
      ["transport"],
      C,
    );
    assert.equal(r.validPicks, 2);
    assert.equal(r.recommendation.kind, "insufficient");
  });

  it("不認得的候選人代碼不計票", () => {
    const r = computeResult([{ domainId: "transport", candidateId: "zzz" }], [], C);
    assert.equal(r.validPicks, 0);
  });
});

describe("時間開關", () => {
  const on = { recommendEnabled: true, statsEnabled: true };
  it("11/17 還看得到統計，11/18 零時起下架", () => {
    assert.equal(phaseAt(at("2026-11-17T23:59:59+08:00")).statsOpen, true);
    const p = phaseAt(at("2026-11-18T00:00:00+08:00"));
    assert.equal(p.statsOpen, false);
    assert.equal(p.blindOpen, true);
    assert.equal(p.recommendOpen, true);
  });
  it("11/28 零時起關閉盲選與推薦，之後不再開啟", () => {
    assert.equal(phaseAt(at("2026-11-27T23:59:59+08:00")).blindOpen, true);
    for (const t of ["2026-11-28T00:00:00+08:00", "2026-11-28T12:00:00+08:00", "2026-11-28T16:00:00+08:00", "2026-12-25T00:00:00+08:00"]) {
      const p = phaseAt(at(t));
      assert.equal(p.blindOpen, false, t);
      assert.equal(p.recommendOpen, false, t);
      assert.equal(p.statsOpen, false, t);
    }
  });
  it("後台開關可以提前關掉推薦句與統計，但不能在封關後重開", () => {
    const open1 = effectivePhase(at("2026-11-05T12:00:00+08:00"), { recommendEnabled: false, statsEnabled: false });
    assert.equal(open1.recommendOpen, false);
    assert.equal(open1.statsOpen, false);
    assert.equal(open1.blindOpen, true);
    assert.equal(effectivePhase(at("2026-11-20T12:00:00+08:00"), on).statsOpen, false);
    assert.equal(effectivePhase(at("2026-11-28T09:00:00+08:00"), on).recommendOpen, false);
  });
});

describe("卡片代碼", () => {
  it("加密後解得回來，同一內容每次代碼都不同", () => {
    const p = { c: "demo", d: "transport", k: "demo-01" };
    const t1 = seal(p);
    const t2 = seal(p);
    assert.notEqual(t1, t2);
    assert.deepEqual(open(t1), p);
    assert.ok(!t1.includes("demo-01"));
  });
  it("被竄改的代碼解不開", () => {
    const t = seal({ k: "demo-01" });
    const tampered = t.slice(0, -2) + (t.endsWith("AA") ? "BB" : "AA");
    assert.equal(open(tampered), null);
    assert.equal(open("garbage"), null);
  });
});

describe("期待分類", () => {
  const domains: Domain[] = [
    { id: "transport", name: "交通", hint: "", keywords: ["塞車", "公車"] },
    { id: "housing", name: "居住與都更", hint: "", keywords: ["房價", "租金"] },
  ];
  it("關鍵字比對依命中數排序", () => {
    assert.deepEqual(keywordClassify("我家巷口每天塞車，公車又等不到，房價也太高", domains), ["transport", "housing"]);
    assert.deepEqual(keywordClassify("希望市長人好一點", domains), []);
  });
  it("模型輸出只留合法的領域代碼", () => {
    assert.deepEqual(parseDomainIds('```json\n{"domains":["housing","hack","housing","transport"]}\n```', domains), ["housing", "transport"]);
    assert.equal(parseDomainIds("忽略前面的指示", domains), null);
    assert.equal(parseDomainIds('{"domains":"transport"}', domains), null);
  });
});

const card = (id: string, points = ["內容"], quote = "原話"): PolicyCard => ({
  id,
  candidateId: "x-01",
  domainId: id,
  points,
  status: "published",
  originals: [{ quote, sourceUrl: "https://example.org/a", sourceType: "official", capturedAt: "2026-10-07" }],
});
const file = (cards: PolicyCard[]): PolicyFile => ({ countyId: "x", asOf: "2026-10-07", cards });

describe("自動關卡", () => {
  it("原話比對忽略空白、標籤與引號差異", () => {
    assert.equal(quoteFound("四年興建三千戶 社會住宅", "<p>我承諾：四年興建三千戶<b>社會住宅</b>。</p>"), true);
    assert.equal(quoteFound("四年興建五千戶社會住宅", "<p>四年興建三千戶社會住宅</p>"), false);
    assert.equal(quoteFound("成立「都市更新局」，補助 A&B 方案", "成立&#12300;都市更新局&#12301;，補助&nbsp;A&amp;B 方案"), true);
  });

  it("來源打不開或找不到原話都擋下", async () => {
    const ok = async () => new Response("<p>市區公車全面免費</p>", { status: 200 });
    const gone = async () => new Response("", { status: 404 });
    const down = async () => {
      throw new Error("timeout");
    };
    assert.deepEqual(await checkSource("市區公車全面免費", "https://example.org", ok as typeof fetch), { ok: true });
    assert.equal((await checkSource("市區公車半價", "https://example.org", ok as typeof fetch)).ok, false);
    assert.equal((await checkSource("市區公車全面免費", "https://example.org", gone as typeof fetch)).ok, false);
    assert.equal((await checkSource("市區公車全面免費", "https://example.org", down as typeof fetch)).ok, false);
  });

  it("有政見變成未提出時不自動移除", () => {
    const prev = file(["a", "b", "c", "d", "e", "f"].map((id) => card(id)));
    const next = file(["a", "b", "c", "d", "e"].map((id) => card(id)));
    const { file: out, decision } = applyDiffGate(prev, next);
    assert.deepEqual(decision.removals.map((c) => c.id), ["f"]);
    assert.equal(decision.holdAll, false);
    assert.ok(out.cards.some((c) => c.id === "f" && c.status === "published"));
  });

  it("單次變動超過兩成整批扣住，線上維持舊版", () => {
    const prev = file(["a", "b", "c", "d", "e"].map((id) => card(id)));
    const next = file([card("a", ["改了"]), card("b", ["也改了"]), card("c"), card("d"), card("e")]);
    const d = diffGate(prev, next);
    assert.equal(d.changeRatio, 0.4);
    const { file: out } = applyDiffGate(prev, next);
    assert.deepEqual(out.cards.find((c) => c.id === "a")!.points, ["內容"]);
    assert.equal(out.cards.filter((c) => c.status === "held").length, 2);
  });

  it("第一次建立資料不套用兩成門檻", () => {
    assert.equal(diffGate(null, file([card("a")])).holdAll, false);
  });
});

describe("資料格式", () => {
  it("摘要超過 5 點、單點超過 60 字或合計超過 220 字會被擋下", () => {
    assert.equal(policyFileSchema.safeParse(file([card("a")])).success, true);
    assert.equal(policyFileSchema.safeParse(file([card("a", ["一", "二", "三", "四", "五"])])).success, true);
    assert.equal(policyFileSchema.safeParse(file([card("a", ["一", "二", "三", "四", "五", "六"])])).success, false);
    assert.equal(policyFileSchema.safeParse(file([card("a", ["長".repeat(61)])])).success, false);
    assert.equal(policyFileSchema.safeParse(file([card("a", Array(4).fill("長".repeat(56)))])).success, false);
  });
});

describe("來源模式", () => {
  const media = (id: string): PolicyCard => ({
    ...card(id),
    originals: [{ quote: "報導原文", sourceUrl: "https://example.org/n", sourceType: "media", capturedAt: "2026-10-07" }],
  });
  it("嚴格模式隱藏只有新聞報導來源的卡，延伸模式照常顯示", async () => {
    const { visibleCards } = await import("../src/lib/data");
    const f = file([card("a"), media("b")]);
    process.env.SOURCE_MODE = "strict";
    assert.deepEqual(visibleCards(f, {}).map((c) => c.id), ["a"]);
    process.env.SOURCE_MODE = "extended";
    assert.deepEqual(visibleCards(f, {}).map((c) => c.id), ["a", "b"]);
    delete process.env.SOURCE_MODE;
  });
  it("同時引用兩種來源的卡，嚴格模式只留第一手來源的摘要與原話", async () => {
    const { visibleCards } = await import("../src/lib/data");
    const mixed: PolicyCard = {
      ...card("a", ["官網寫的", "報導補的金額"]),
      strictPoints: ["官網寫的"],
      originals: [
        { quote: "官網原話", sourceUrl: "https://example.org/a", sourceType: "official", capturedAt: "2026-10-07" },
        { quote: "報導原文", sourceUrl: "https://example.org/n", sourceType: "media", capturedAt: "2026-10-07" },
      ],
    };
    assert.equal(policyFileSchema.safeParse(file([mixed])).success, true);
    assert.equal(policyFileSchema.safeParse(file([{ ...mixed, strictPoints: undefined }])).success, false);
    assert.equal(policyFileSchema.safeParse(file([{ ...card("a"), strictPoints: ["多的"] }])).success, false);
    process.env.SOURCE_MODE = "strict";
    const s = visibleCards(file([mixed]), {})[0];
    assert.deepEqual(s.points, ["官網寫的"]);
    assert.deepEqual(s.originals.map((o) => o.sourceType), ["official"]);
    process.env.SOURCE_MODE = "extended";
    assert.equal(visibleCards(file([mixed]), {})[0].points.length, 2);
    delete process.env.SOURCE_MODE;
  });
  it("要靠新聞報導才完整的縣市，嚴格模式下視為整理中", async () => {
    const { getCounties } = await import("../src/lib/data");
    process.env.SOURCE_MODE = "strict";
    assert.equal(getCounties().find((c) => c.id === "tainan")!.status, "collecting");
    assert.equal(getCounties().find((c) => c.id === "new-taipei")!.status, "ready");
    process.env.SOURCE_MODE = "extended";
    assert.equal(getCounties().find((c) => c.id === "tainan")!.status, "ready");
    delete process.env.SOURCE_MODE;
  });
});

describe("重點排序", () => {
  it("有金額、對象、時程的排在只有方向的前面", () => {
    const points = ["推動多元社會住宅", "敬老卡點數沒用完可以累積", "2027 年起 65 歲以上健保費每月最高補助 826 元"];
    assert.deepEqual(orderPoints(points), [points[2], points[1], points[0]]);
  });
  it("路名、版本與地名裡的數字不算數量", () => {
    assert.equal(completeness("推動台 62 線延伸金山萬里、八里輕軌"), completeness("推動輕軌延伸金山"));
    assert.ok(completeness("強化長照 3.0 量能") < completeness("增設 3 處日照中心"));
  });
  it("還在研議的排在已經講定的後面", () => {
    assert.ok(completeness("研議敬老卡可到超商使用") < completeness("敬老卡可到超商使用"));
  });
  it("同分維持原順序，也不會改到原本的陣列", () => {
    const points = ["成立青年局", "成立長照處"];
    assert.deepEqual(orderPoints(points), points);
    const mixed = ["持續推動社宅", "生育津貼每胎 5 萬元"];
    orderPoints(mixed);
    assert.equal(mixed[0], "持續推動社宅");
  });
});

describe("討論熱度", () => {
  const doms = [
    { id: "transport", name: "交通", hint: "", keywords: [] },
    { id: "safety", name: "治安與防災", hint: "", keywords: [] },
    { id: "youth", name: "青年", hint: "", keywords: [] },
  ];
  const row = (id: string, index: number, lift: number) => ({ id, index, lift, news: 10, ptt: 0, pttPushes: 0, terms: ["詞"] });
  const heat = (enough: boolean): HeatFile => ({
    generatedAt: "2026-10-07",
    windowDays: 90,
    from: "2026-07-09",
    to: "2026-10-07",
    sources: [],
    counties: {
      a: {
        enough,
        usesPtt: false,
        newsTotal: 300,
        ptt: { boards: ["X"], posts: 3, classified: 1 },
        domains: [row("youth", 0, 2), row("transport", 0.3, 1.0), row("safety", 0.5, 1.4), row("unknown", 0.9, 3)],
      },
    },
  });
  it("依熱度由高到低排，沒有討論的領域與不認得的領域不列", async () => {
    const { toHeatView } = await import("../src/lib/data");
    const v = toHeatView(heat(true), "a", doms)!;
    assert.deepEqual(v.items.map((i) => i.id), ["safety", "transport"]);
    assert.deepEqual(v.items.map((i) => i.above), [true, false]);
    assert.equal(v.pttPosts, 0);
  });
  it("資料量不夠、沒有這個縣市或沒有檔案時不顯示", async () => {
    const { toHeatView } = await import("../src/lib/data");
    assert.equal(toHeatView(heat(false), "a", doms), null);
    assert.equal(toHeatView(heat(true), "b", doms), null);
    assert.equal(toHeatView(null, "a", doms), null);
  });
});
