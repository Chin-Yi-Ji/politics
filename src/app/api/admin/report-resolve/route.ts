import { isAdmin } from "@/lib/admin-auth";
import { getStore } from "@/lib/store";

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "請先登入。" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { id?: unknown; resolution?: unknown } | null;
  if (typeof body?.id !== "string" || typeof body.resolution !== "string" || !body.resolution.trim()) {
    return Response.json({ error: "請填寫處理結果。" }, { status: 400 });
  }
  await getStore().resolveReport(body.id, body.resolution.trim().slice(0, 500));
  return Response.json({ ok: true });
}
