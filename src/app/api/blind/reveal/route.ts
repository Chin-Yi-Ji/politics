import { openCard, openSession } from "@/lib/blind";
import { getCandidates, getDomains, getPolicyFile, visibleCards } from "@/lib/data";
import { currentTime, effectivePhase } from "@/lib/phase";
import { computeResult, type Pick } from "@/lib/recommend";
import { allow, clientKey } from "@/lib/ratelimit";
import { getStore } from "@/lib/store";
import { cardSecretReady } from "@/lib/token";
import { failure, notConfigured } from "@/lib/apierror";

type Body = { session?: unknown; picks?: unknown };

export async function POST(req: Request) {
  if (!cardSecretReady()) return notConfigured("blind/reveal");
  try {
    return await handle(req);
  } catch (err) {
    return failure("blind/reveal", err);
  }
}

async function handle(req: Request) {
  if (!allow(`reveal:${clientKey(req)}`, 20, 60_000)) {
    return Response.json({ error: "操作太頻繁，請一分鐘後再試。" }, { status: 429 });
  }
  const store = getStore();
  const phase = effectivePhase(currentTime(), await store.getSettings());
  if (!phase.blindOpen) return Response.json({ error: "盲選已經關閉。" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as Body | null;
  const session = typeof body?.session === "string" ? openSession(body.session) : null;
  if (!session) {
    return Response.json({ error: "這次作答已經過期，請重新開始。" }, { status: 400 });
  }

  const domains = getDomains();
  const candidates = getCandidates(session.c);
  const candidateIds = new Set(candidates.map((c) => c.id));

  // 每個領域只收一個選擇；卡片代碼必須屬於同一個縣市、同一個領域
  const picks: Pick[] = [];
  const seen = new Set<string>();
  for (const raw of Array.isArray(body?.picks) ? body.picks : []) {
    const p = raw as { domainId?: unknown; token?: unknown };
    if (typeof p.domainId !== "string" || seen.has(p.domainId)) continue;
    if (!domains.some((d) => d.id === p.domainId)) continue;
    seen.add(p.domainId);
    if (p.token === null) {
      picks.push({ domainId: p.domainId, candidateId: null });
      continue;
    }
    const card = typeof p.token === "string" ? openCard(p.token) : null;
    if (!card || card.c !== session.c || card.d !== p.domainId || !candidateIds.has(card.k)) {
      return Response.json({ error: "作答內容不完整，請重新開始。" }, { status: 400 });
    }
    picks.push({ domainId: p.domainId, candidateId: card.k });
  }

  const result = computeResult(picks, session.m, candidates.map((c) => c.id));
  const file = getPolicyFile(session.c);
  const cards = visibleCards(file, await store.getOverrides());
  const nameOf = new Map(candidates.map((c) => [c.id, c]));

  if (session.r) {
    try {
      await store.completeResponse(session.r, {
        picks,
        recommended: phase.recommendOpen ? result.recommendation.candidateIds : [],
      });
    } catch {
      // 存不進去不影響揭曉
    }
  }

  return Response.json({
    asOf: file?.asOf ?? null,
    validPicks: result.validPicks,
    tally: result.tally.map((row) => ({
      ...row,
      name: nameOf.get(row.candidateId)?.name ?? "",
      party: nameOf.get(row.candidateId)?.party ?? "",
    })),
    // 推薦句關閉時（投票日、或後台關掉）只揭曉事實
    recommendation: phase.recommendOpen ? result.recommendation : null,
    domains: picks.map((pick) => {
      const domain = domains.find((d) => d.id === pick.domainId)!;
      return {
        id: domain.id,
        name: domain.name,
        matched: session.m.includes(domain.id),
        pickedCandidateId: pick.candidateId,
        cards: candidates.map((cand) => {
          const card = cards.find((c) => c.domainId === domain.id && c.candidateId === cand.id);
          return {
            candidateId: cand.id,
            name: cand.name,
            party: cand.party,
            points: card?.points ?? null,
            originals: card?.originals ?? [],
          };
        }),
      };
    }),
  });
}
