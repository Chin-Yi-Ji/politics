"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

type Option = { id: string; name: string };

export function ReportForm({ counties, domains }: { counties: Option[]; domains: Option[] }) {
  const preset = useSearchParams().get("county") ?? "";
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("sending");
    setError("");
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setError(data?.error || "送出失敗，請再試一次。");
      setState("idle");
      return;
    }
    setState("sent");
  }

  if (state === "sent") {
    return (
      <p role="status" className="mt-8 rounded-lg border-2 border-ink bg-card px-4 py-4 font-bold">
        已收到回報，48 小時內處理。謝謝你幫忙把資料補齊。
      </p>
    );
  }

  const field = "mt-1 w-full rounded-lg border-2 border-ink bg-card px-3 py-2";
  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      {error && (
        <p role="alert" className="rounded-lg border-2 border-stamp bg-stamp-soft px-4 py-3 font-bold">
          {error}
        </p>
      )}
      <label className="block font-bold">
        縣市
        <select name="countyId" required defaultValue={preset} className={field}>
          <option value="" disabled>
            請選擇
          </option>
          {counties.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block font-bold">
        候選人（可不填）
        <input name="candidateName" maxLength={60} className={field} />
      </label>
      <label className="block font-bold">
        領域（可不填）
        <select name="domainId" defaultValue="" className={field}>
          <option value="">不確定</option>
          {domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block font-bold">
        哪裡有遺漏或錯誤
        <textarea name="message" required minLength={5} maxLength={1000} rows={5} className={field} />
      </label>
      <label className="block font-bold">
        來源網址（可不填）
        <input name="sourceUrl" type="url" maxLength={500} placeholder="https://" className={field} />
      </label>
      <p className="text-sm text-muted">請不要在內容裡填寫個人資料。</p>
      <button className="btn" disabled={state === "sending"}>
        {state === "sending" ? "送出中…" : "送出回報"}
      </button>
    </form>
  );
}
