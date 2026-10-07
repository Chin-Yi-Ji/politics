import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * 盲選用的不透明代碼。
 * 瀏覽器只拿得到加密後的字串，看不出卡片是誰的；每次加密都用新的隨機 IV，
 * 所以同一張卡每次出現的代碼都不同，無法靠比對代碼認人。
 */

const globalForSecret = globalThis as unknown as { __devCardSecret?: string };

function key(): Buffer {
  let secret = process.env.CARD_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("正式環境必須設定 CARD_SECRET");
    }
    globalForSecret.__devCardSecret ??= randomBytes(32).toString("hex");
    secret = globalForSecret.__devCardSecret;
  }
  return createHash("sha256").update(secret).digest();
}

/** 正式環境沒設 CARD_SECRET 時回傳 false；開發環境會自動產生暫時金鑰，所以永遠是 true。 */
export function cardSecretReady(): boolean {
  return Boolean(process.env.CARD_SECRET) || process.env.NODE_ENV !== "production";
}

export function seal(payload: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

export function open<T>(token: string): T | null {
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length < 29) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const body = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]);
    return JSON.parse(body.toString("utf8")) as T;
  } catch {
    return null;
  }
}
