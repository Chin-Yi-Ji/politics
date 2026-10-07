import { revalidateTag } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import { allPolicyFiles } from "@/lib/data";
import { getStore } from "@/lib/store";

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "請先登入。" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { policyId?: unknown; action?: unknown } | null;
  const { policyId, action } = body ?? {};
  if (typeof policyId !== "string" || (action !== "hide" && action !== "publish" && action !== null)) {
    return Response.json({ error: "參數不正確。" }, { status: 400 });
  }
  if (!allPolicyFiles().some((f) => f.cards.some((c) => c.id === policyId))) {
    return Response.json({ error: "找不到這張政見卡。" }, { status: 404 });
  }
  await getStore().setOverride(policyId, action);
  // 對照表有快取，下架要立刻生效
  revalidateTag("overrides", { expire: 0 });
  return Response.json({ ok: true });
}
