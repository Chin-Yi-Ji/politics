"use client";

import { useEffect, useState } from "react";

export type PhaseInfo = {
  name: "open" | "blackout" | "election-day" | "after";
  blindOpen: boolean;
  recommendOpen: boolean;
  statsOpen: boolean;
};

export function usePhase(): PhaseInfo | null {
  const [phase, setPhase] = useState<PhaseInfo | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/phase")
      .then((r) => r.json())
      .then((p) => alive && setPhase(p))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return phase;
}

/** 投票日與選後的全站提示 */
export function PhaseNotice() {
  const phase = usePhase();
  if (!phase || phase.blindOpen) return null;
  return (
    <div role="status" className="border-b-2 border-ink bg-mark">
      <p className="mx-auto max-w-5xl px-4 py-3 font-bold">
        {phase.name === "election-day"
          ? "今天是投票日，盲選與推薦已關閉。各縣市的政見對照表照常開放，記得去投票。"
          : "選舉已經結束，盲選與推薦已關閉。這裡保留各候選人選前提出的政見，供日後對照。"}
      </p>
    </div>
  );
}
