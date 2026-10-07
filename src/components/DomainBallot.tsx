"use client";

import { Fragment } from "react";
import { DomainIcon } from "./DomainIcon";
import { Stamp } from "./Stamp";

type DomainInfo = { id: string; name: string };

/** 「居住與都更」這類名稱只允許在「與」後面換行，窄螢幕才不會斷在奇怪的地方 */
function BreakableName({ name }: { name: string }) {
  const parts = name.split("與");
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={part}>
          {part}
          {i < parts.length - 1 && (
            <>
              與<wbr />
            </>
          )}
        </Fragment>
      ))}
    </>
  );
}

/**
 * 選領域用的「選票」：一格一個領域，點一下蓋一個章，再點一下收回。
 * 章有數量上限，蓋完之後其他格子暫時不能點。
 */
export function DomainBallot({
  domains,
  selected,
  max,
  onToggle,
}: {
  domains: DomainInfo[];
  selected: string[];
  max: number;
  onToggle: (id: string) => void;
}) {
  const left = max - selected.length;
  return (
    <div>
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg">
        <span>把章蓋在你最在意的地方。</span>
        <span className="flex items-center gap-1" aria-hidden="true">
          {Array.from({ length: max }, (_, i) => (
            <Stamp key={i} size={24} className={i < left ? "" : "opacity-20"} />
          ))}
        </span>
        <span className="text-sm text-muted" aria-live="polite">
          {left > 0 ? `還有 ${left} 個章` : "章蓋完了，想換就先點掉一個"}
        </span>
      </p>

      <ul className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-lg border-2 border-ink bg-line sm:grid-cols-4">
        {domains.map((d) => {
          const on = selected.includes(d.id);
          const locked = !on && left === 0;
          return (
            <li key={d.id} className="bg-card">
              <button
                type="button"
                aria-pressed={on}
                aria-disabled={locked}
                onClick={() => !locked && onToggle(d.id)}
                className={`relative flex h-full min-h-28 w-full flex-col focus-visible:-outline-offset-4 items-center justify-center gap-2 px-2 py-4 text-center sm:min-h-32 ${
                  locked ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-stamp-soft"
                }`}
              >
                <DomainIcon id={d.id} size={40} />
                <span className="break-keep text-[0.95rem] font-bold leading-snug sm:text-base">
                  <span className={on ? "marked" : ""}>
                    <BreakableName name={d.name} />
                  </span>
                </span>
                {on && (
                  <span className="stamp-on pointer-events-none absolute left-1/2 top-1.5 ml-2">
                    <Stamp size={44} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
