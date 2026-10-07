import { endAdminSession } from "@/lib/admin-auth";

export async function POST() {
  await endAdminSession();
  return Response.json({ ok: true });
}
