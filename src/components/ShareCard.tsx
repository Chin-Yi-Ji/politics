"use client";

import { useEffect, useState } from "react";
import { canvasToBlob, CARD_H, CARD_W, drawShareCard, type ShareCardData } from "@/lib/sharecard";

const FILE_NAME = "先看政見-盲選結果.png";

/** 揭曉後的分享圖：先在瀏覽器裡畫好，再讓使用者分享或下載 */
export function ShareCard({ data, shareText }: { data: ShareCardData; shareText: string }) {
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [canShareFile, setCanShareFile] = useState(false);
  const [failed, setFailed] = useState(false);
  const key = JSON.stringify(data);

  useEffect(() => {
    let alive = true;
    let objectUrl = "";
    (async () => {
      try {
        const canvas = document.createElement("canvas");
        await drawShareCard(canvas, JSON.parse(key) as ShareCardData);
        const blob = await canvasToBlob(canvas);
        if (!alive) return;
        const f = new File([blob], FILE_NAME, { type: "image/png" });
        objectUrl = URL.createObjectURL(blob);
        setFile(f);
        setUrl(objectUrl);
        setCanShareFile(typeof navigator.canShare === "function" && navigator.canShare({ files: [f] }));
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [key]);

  async function share() {
    if (!file) return;
    try {
      await navigator.share({ files: [file], text: shareText });
    } catch {
      // 使用者取消分享
    }
  }

  if (failed) return <p className="mt-4 text-sm text-muted">這個瀏覽器沒辦法產生分享圖。</p>;

  return (
    <div className="mt-6">
      <h2 className="text-2xl">把結果做成一張圖</h2>
      <div className="mt-3 grid items-start gap-5 sm:grid-cols-[minmax(0,20rem)_1fr]">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- 瀏覽器當場產生的圖，沒有網址可以最佳化
          <img
            src={url}
            width={CARD_W}
            height={CARD_H}
            alt={`分享圖：依照政見，${data.countyName}我會投 ${data.winners.map((w) => w.name).join("、")}`}
            className="h-auto w-full rounded-lg border border-line"
          />
        ) : (
          <div
            className="grid w-full place-items-center rounded-lg border border-line bg-card text-muted"
            style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}
          >
            圖片產生中…
          </div>
        )}
        <div>
          <div className="flex flex-wrap gap-3">
            {canShareFile && (
              <button className="btn" onClick={share} disabled={!file}>
                分享這張圖
              </button>
            )}
            {url && (
              <a className={`btn ${canShareFile ? "btn-quiet" : ""}`} href={url} download={FILE_NAME}>
                下載圖片
              </a>
            )}
          </div>
          <p className="mt-3 text-sm text-muted">
            可以貼到 FB、Threads、IG。手機上也能長按圖片儲存。圖是在你的裝置上產生的，網站不會知道你的結果。
          </p>
        </div>
      </div>
    </div>
  );
}
