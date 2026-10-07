/**
 * API 出錯時一律回傳看得懂的訊息，並把原因寫進伺服器紀錄。
 * 回給瀏覽器的只有分類後的說法，不含金鑰、連線字串或錯誤堆疊。
 */

/** 只列變數「名稱」協助排查打錯字或多了空白，絕不印出值。 */
function secretHint(): string {
  const exact = Object.prototype.hasOwnProperty.call(process.env, "CARD_SECRET");
  const similar = Object.keys(process.env).filter((k) => k !== "CARD_SECRET" && /card/i.test(k));
  const parts = [exact ? "CARD_SECRET 有傳進來，但值是空的" : "這個程序完全沒收到 CARD_SECRET"];
  if (similar.length > 0) parts.push(`名稱相近的變數：${JSON.stringify(similar)}（檢查大小寫與前後空白）`);
  return parts.join("；");
}

export function notConfigured(where: string): Response {
  console.error(`[${where}] 缺少環境變數 CARD_SECRET，盲選無法運作。${secretHint()}。設定後要重新部署或重新啟動服務才會生效。`);
  return Response.json(
    { error: "網站還沒設定完成（缺少 CARD_SECRET），請通知站長。", code: "missing_card_secret" },
    { status: 503 },
  );
}

export function failure(where: string, err: unknown): Response {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[${where}] ${message}`);
  if (/^Supabase \d+|fetch failed/.test(message)) {
    return Response.json(
      { error: "資料庫連不上，請稍後再試。如果一直這樣，請通知站長。", code: "store_unavailable" },
      { status: 503 },
    );
  }
  return Response.json({ error: "伺服器出了點問題，請再試一次。", code: "server_error" }, { status: 500 });
}
