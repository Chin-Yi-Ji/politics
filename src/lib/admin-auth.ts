import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { open, seal } from "./token";

const COOKIE = "admin_session";
const MAX_AGE_S = 12 * 60 * 60;

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function startAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, seal({ admin: true, exp: Date.now() + MAX_AGE_S * 1000 }), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const p = open<{ admin: boolean; exp: number }>(value);
  return Boolean(p?.admin && p.exp > Date.now());
}
