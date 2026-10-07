import { isAdmin } from "@/lib/admin-auth";
import { allPolicyFiles, getCandidates, getChangelog, getCounties, getDomains } from "@/lib/data";
import { currentTime, effectivePhase } from "@/lib/phase";
import { getStore } from "@/lib/store";

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "請先登入。" }, { status: 401 });

  const store = getStore();
  const [settings, overrides, reports, usage] = await Promise.all([
    store.getSettings(),
    store.getOverrides(),
    store.listReports(),
    store.getUsage(),
  ]);

  const counties = new Map(getCounties().map((c) => [c.id, c.name]));
  const domains = new Map(getDomains().map((d) => [d.id, d.name]));
  const cards = allPolicyFiles().flatMap((file) => {
    const candidates = new Map(getCandidates(file.countyId).map((c) => [c.id, c.name]));
    return file.cards.map((card) => ({
      id: card.id,
      county: counties.get(file.countyId) ?? file.countyId,
      candidate: candidates.get(card.candidateId) ?? card.candidateId,
      domain: domains.get(card.domainId) ?? card.domainId,
      points: card.points,
      status: card.status,
      heldReason: card.heldReason ?? null,
      override: overrides[card.id] ?? null,
      sourceUrl: card.originals[0]?.sourceUrl ?? null,
    }));
  });

  const cap = Number(process.env.GEMINI_MONTHLY_CALL_CAP) || 150_000;
  return Response.json({
    storeKind: store.kind,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    phase: effectivePhase(currentTime(), settings),
    settings,
    usage: { calls: usage, cap },
    reports,
    cards,
    changelog: getChangelog(),
  });
}
