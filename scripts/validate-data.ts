/**
 * 檢查 data/ 底下的資料是否合乎格式。
 *   npm run validate            只做離線檢查
 *   npm run validate -- --online 另外實際抓來源頁，確認網址打得開、原話逐字存在
 */
import fs from "node:fs";
import path from "node:path";
import { checkSource } from "../src/lib/gates";
import { policyFileSchema } from "../src/lib/schema";
import type { Candidate, County, Domain, HeatFile, PolicyFile } from "../src/lib/types";

const DATA = path.join(process.cwd(), "data");
const read = <T>(f: string) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8")) as T;
const online = process.argv.includes("--online");

const domains = new Set(read<Domain[]>("domains.json").map((d) => d.id));
const counties = read<County[]>("counties.json");
const candidates = read<Candidate[]>("candidates.json");
const errors: string[] = [];

for (const c of candidates) {
  if (!counties.some((x) => x.id === c.countyId)) errors.push(`候選人 ${c.id} 的縣市 ${c.countyId} 不存在`);
}

async function main() {
  for (const county of counties) {
    const p = path.join(DATA, "policies", `${county.id}.json`);
    const has = fs.existsSync(p);
    if (county.status !== "collecting" && !has) errors.push(`${county.name} 標為已上線，卻沒有政見檔`);
    if (!has) continue;

    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    const parsed = policyFileSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) errors.push(`${county.id}.json ${issue.path.join(".")}：${issue.message}`);
      continue;
    }
    const file = parsed.data as PolicyFile;
    const local = new Set(candidates.filter((c) => c.countyId === county.id).map((c) => c.id));
    const seenIds = new Set<string>();
    const seenSlot = new Set<string>();
    for (const card of file.cards) {
      if (seenIds.has(card.id)) errors.push(`${card.id} 重複`);
      seenIds.add(card.id);
      if (!local.has(card.candidateId)) errors.push(`${card.id}：候選人 ${card.candidateId} 不屬於 ${county.name}`);
      if (!domains.has(card.domainId)) errors.push(`${card.id}：領域 ${card.domainId} 不存在`);
      const slot = `${card.candidateId}|${card.domainId}`;
      if (card.status === "published") {
        if (seenSlot.has(slot)) errors.push(`${card.id}：同一位候選人在同一領域只能有一張已發布的卡`);
        seenSlot.add(slot);
      }
      if (online && !county.demo) {
        for (const o of card.originals) {
          const r = await checkSource(o.quote, o.sourceUrl);
          if (!r.ok) errors.push(`${card.id}：${r.reason}（${o.sourceUrl}）`);
        }
      }
    }
  }

  // 討論熱度檔是選用的：有的話檢查領域與縣市代碼、數字範圍
  const heatPath = path.join(DATA, "heat.json");
  if (fs.existsSync(heatPath)) {
    const heat = read<HeatFile>("heat.json");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(heat.from ?? "") || !/^\d{4}-\d{2}-\d{2}$/.test(heat.to ?? "")) errors.push("heat.json 的起訖日期格式不對");
    for (const [id, county] of Object.entries(heat.counties ?? {})) {
      if (!counties.some((c) => c.id === id)) errors.push(`heat.json：縣市 ${id} 不存在`);
      const sum = county.domains.reduce((n, d) => n + d.index, 0);
      if (county.enough && Math.abs(sum - 1) > 0.02) errors.push(`heat.json：${id} 各領域占比加起來是 ${sum.toFixed(3)}，應該接近 1`);
      for (const d of county.domains) {
        if (!domains.has(d.id)) errors.push(`heat.json：${id} 的領域 ${d.id} 不存在`);
        if (!(d.index >= 0 && d.index <= 1) || !(d.lift >= 0)) errors.push(`heat.json：${id}/${d.id} 的數字超出範圍`);
      }
    }
  }

  if (errors.length) {
    console.error(`資料檢查沒過，共 ${errors.length} 項：`);
    for (const e of errors) console.error(" - " + e);
    process.exit(1);
  }
  const site = read<{ authorName: string; disclosure: string }>("site.json");
  if (!site.authorName || !site.disclosure) {
    console.warn("提醒：data/site.json 的站長姓名或利害關係聲明還沒填，上線前要補上。");
  }
  const real = counties.filter((c) => !c.demo);
  console.log(`資料檢查通過：${real.length} 縣市、${candidates.filter((c) => c.countyId !== "demo").length} 位候選人，` +
    `第一手來源已齊的縣市 ${real.filter((c) => c.status === "ready").length} 個，` +
    `加上新聞報導才齊的縣市 ${real.filter((c) => (c.status as string) === "ready-extended").length} 個。`);
}

main();
