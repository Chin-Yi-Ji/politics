import { buildDeck, sealSession } from "@/lib/blind";
import { FREE_TEXT_ENABLED, MAX_MATCHED, MAX_TEXT_LENGTH } from "@/lib/classify";
import { getCounty, getDomains } from "@/lib/data";
import { currentTime, phaseAt } from "@/lib/phase";
import { allow, clientKey } from "@/lib/ratelimit";
import { getStore } from "@/lib/store";
import { cardSecretReady } from "@/lib/token";
import { failure, notConfigured } from "@/lib/apierror";

type Body = { countyId?: unknown; text?: unknown; domainIds?: unknown; mode?: unknown };

export async function POST(req: Request) {
  if (!cardSecretReady()) return notConfigured("blind/start");
  try {
    return await handle(req);
  } catch (err) {
    return failure("blind/start", err);
  }
}

async function handle(req: Request) {
  if (!phaseAt(currentTime()).blindOpen) {
    return Response.json({ error: "盲選已經關閉。" }, { status: 403 });
  }
  if (!allow(`start:${clientKey(req)}`, 12, 60_000)) {
    return Response.json({ error: "操作太頻繁，請一分鐘後再試。" }, { status: 429 });
  }
  const body = (await req.json().catch(() => null)) as Body | null;
  const countyId = typeof body?.countyId === "string" ? body.countyId : "";
  const county = getCounty(countyId);
  if (!county) return Response.json({ error: "找不到這個縣市。" }, { status: 400 });
  if (county.status !== "ready") {
    return Response.json({ error: "這個縣市的政見還在整理中。" }, { status: 409 });
  }

  // 自由填寫關閉時，就算有人自己送文字過來也不收
  const text = FREE_TEXT_ENABLED
    ? (typeof body?.text === "string" ? body.text.trim() : "").slice(0, MAX_TEXT_LENGTH)
    : "";
  const valid = new Set(getDomains().map((d) => d.id));
  const matched = (Array.isArray(body?.domainIds) ? body.domainIds : [])
    .filter((id): id is string => typeof id === "string" && valid.has(id))
    .filter((id, i, arr) => arr.indexOf(id) === i)
    .slice(0, MAX_MATCHED);
  const mode = body?.mode === "ai" || body?.mode === "keyword" ? body.mode : "manual";

  const store = getStore();
  const deck = buildDeck(countyId, matched, await store.getOverrides());
  if (deck.length === 0) {
    return Response.json({ error: "這個縣市目前沒有可以比較的政見。" }, { status: 409 });
  }

  let responseId: string | null = null;
  try {
    responseId = await store.createResponse({ countyId, text, matched, mode });
  } catch {
    // 存不進去不影響使用者繼續作答
  }

  const session = sealSession({ c: countyId, m: matched, r: responseId, t: Date.now() });
  return Response.json({ session, deck });
}
