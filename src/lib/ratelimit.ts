/**
 * 簡單的流量限制。IP 只留在這台伺服器的記憶體裡、過了時間窗就丟掉，
 * 不寫進資料庫，也不寫進紀錄檔。
 */
const g = globalThis as unknown as { __hits?: Map<string, number[]> };

export function allow(key: string, limit: number, windowMs: number): boolean {
  g.__hits ??= new Map();
  const now = Date.now();
  const recent = (g.__hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    g.__hits.set(key, recent);
    return false;
  }
  recent.push(now);
  g.__hits.set(key, recent);
  if (g.__hits.size > 20_000) {
    for (const [k, v] of g.__hits) {
      if (v.every((t) => now - t >= windowMs)) g.__hits.delete(k);
    }
  }
  return true;
}

export function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
