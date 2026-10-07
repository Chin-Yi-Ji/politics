import { isAdmin } from "@/lib/admin-auth";
import { getStore } from "@/lib/store";

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "請先登入。" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { key?: unknown; value?: unknown } | null;
  if ((body?.key !== "recommendEnabled" && body?.key !== "statsEnabled") || typeof body.value !== "boolean") {
    return Response.json({ error: "參數不正確。" }, { status: 400 });
  }
  await getStore().setSetting(body.key, body.value);
  return Response.json({ ok: true });
}
