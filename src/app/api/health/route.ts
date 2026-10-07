import { connection } from "next/server";
import { getStore } from "@/lib/store";
import { cardSecretReady } from "@/lib/token";

/**
 * 部署後自我檢查：打開 /api/health 就知道哪個設定沒到位。
 * 只回傳「有沒有設」與「連不連得上」，不回傳任何設定值。
 */
export async function GET() {
  await connection();
  const store = getStore();
  let storeOk = true;
  try {
    await store.getOverrides();
  } catch (err) {
    storeOk = false;
    console.error(`[health] ${err instanceof Error ? err.message : String(err)}`);
  }
  const cardSecret = cardSecretReady();
  const problems: string[] = [];
  if (!cardSecret) problems.push("缺少 CARD_SECRET：盲選無法開始");
  if (!storeOk) problems.push("資料庫連不上：檢查 SUPABASE_URL、SUPABASE_SERVICE_ROLE_KEY，以及資料表是否已建立");
  if (!process.env.ADMIN_PASSWORD) problems.push("缺少 ADMIN_PASSWORD：後台無法登入");

  return Response.json(
    {
      ok: cardSecret && storeOk,
      cardSecret,
      adminPassword: Boolean(process.env.ADMIN_PASSWORD),
      store: store.kind,
      storeOk,
      classify: process.env.GEMINI_API_KEY ? "gemini" : "keyword",
      sourceMode: process.env.SOURCE_MODE === "strict" ? "strict" : "extended",
      problems,
    },
    { status: cardSecret && storeOk ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
