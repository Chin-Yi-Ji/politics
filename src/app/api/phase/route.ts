import { connection } from "next/server";
import { currentTime, effectivePhase } from "@/lib/phase";
import { getStore } from "@/lib/store";

export async function GET() {
  await connection();
  const settings = await getStore().getSettings();
  return Response.json(effectivePhase(currentTime(), settings));
}
