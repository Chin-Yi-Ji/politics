import { getCounty, getDomains } from "@/lib/data";
import { currentTime, effectivePhase } from "@/lib/phase";
import { getStore } from "@/lib/store";

/** 作答數低於這個數字不顯示，避免幾個人的選擇被當成趨勢 */
const MIN_SAMPLE = 30;

export async function GET(req: Request) {
  const store = getStore();
  const phase = effectivePhase(currentTime(), await store.getSettings());
  if (!phase.statsOpen) return Response.json({ open: false });

  const countyId = new URL(req.url).searchParams.get("county") ?? "";
  if (!getCounty(countyId)) return Response.json({ error: "找不到這個縣市。" }, { status: 400 });

  const { total, rows } = await store.domainInterest(countyId);
  if (total < MIN_SAMPLE) return Response.json({ open: true, enough: false, total });

  const names = new Map(getDomains().map((d) => [d.id, d.name]));
  return Response.json({
    open: true,
    enough: true,
    total,
    rows: rows
      .filter((r) => names.has(r.domainId))
      .map((r) => ({ domainId: r.domainId, name: names.get(r.domainId), share: r.count / total }))
      .sort((a, b) => b.share - a.share),
  });
}
