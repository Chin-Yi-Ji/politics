import { classify, MAX_TEXT_LENGTH } from "@/lib/classify";
import { getCounty, getDomains } from "@/lib/data";
import { currentTime, phaseAt } from "@/lib/phase";
import { allow, clientKey } from "@/lib/ratelimit";
import { getStore } from "@/lib/store";

export async function POST(req: Request) {
  if (!phaseAt(currentTime()).blindOpen) {
    return Response.json({ error: "盲選已經關閉。" }, { status: 403 });
  }
  if (!allow(`classify:${clientKey(req)}`, 8, 60_000)) {
    return Response.json({ error: "操作太頻繁，請一分鐘後再試。" }, { status: 429 });
  }
  const body = (await req.json().catch(() => null)) as { countyId?: unknown; text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const countyId = typeof body?.countyId === "string" ? body.countyId : "";
  if (!getCounty(countyId)) return Response.json({ error: "找不到這個縣市。" }, { status: 400 });
  if (!text) return Response.json({ domainIds: [], mode: "keyword" });
  if (text.length > MAX_TEXT_LENGTH) {
    return Response.json({ error: `請把內容縮短到 ${MAX_TEXT_LENGTH} 字以內。` }, { status: 400 });
  }
  const result = await classify(text, getDomains(), getStore());
  return Response.json(result);
}
