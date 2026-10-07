import { getCounty, getDomains } from "@/lib/data";
import { allow, clientKey } from "@/lib/ratelimit";
import { getStore } from "@/lib/store";

type Body = { countyId?: unknown; candidateName?: unknown; domainId?: unknown; message?: unknown; sourceUrl?: unknown };

function text(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  if (!allow(`report:${clientKey(req)}`, 5, 10 * 60_000)) {
    return Response.json({ error: "回報太頻繁，請十分鐘後再試。" }, { status: 429 });
  }
  const body = (await req.json().catch(() => null)) as Body | null;
  const countyId = text(body?.countyId, 40);
  if (!getCounty(countyId)) return Response.json({ error: "請選擇縣市。" }, { status: 400 });
  const message = text(body?.message, 1000);
  if (message.length < 5) return Response.json({ error: "請說明哪裡有遺漏或錯誤。" }, { status: 400 });

  const sourceUrl = text(body?.sourceUrl, 500);
  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
    return Response.json({ error: "來源網址要以 http 或 https 開頭。" }, { status: 400 });
  }
  const domainId = text(body?.domainId, 40);

  await getStore().addReport({
    countyId,
    candidateName: text(body?.candidateName, 60) || null,
    domainId: getDomains().some((d) => d.id === domainId) ? domainId : null,
    message,
    sourceUrl: sourceUrl || null,
  });
  return Response.json({ ok: true });
}
