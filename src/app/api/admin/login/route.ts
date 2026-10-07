import { adminConfigured, checkPassword, startAdminSession } from "@/lib/admin-auth";
import { allow, clientKey } from "@/lib/ratelimit";

export async function POST(req: Request) {
  if (!adminConfigured()) {
    return Response.json({ error: "尚未設定 ADMIN_PASSWORD，後台無法登入。" }, { status: 503 });
  }
  if (!allow(`login:${clientKey(req)}`, 5, 10 * 60_000)) {
    return Response.json({ error: "嘗試太多次，請十分鐘後再試。" }, { status: 429 });
  }
  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  if (typeof body?.password !== "string" || !checkPassword(body.password)) {
    return Response.json({ error: "密碼不正確。" }, { status: 401 });
  }
  await startAdminSession();
  return Response.json({ ok: true });
}
