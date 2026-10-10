"use client";

import { DomainIcon } from "./DomainIcon";
import { Stamp } from "./Stamp";

export type TrailItem = {
  id: string;
  name: string;
  /** done：選了一張卡；pass：選了都不滿意；current：正在這關；todo：還沒到 */
  state: "done" | "pass" | "current" | "todo";
};

const STATUS: Record<TrailItem["state"], string> = {
  done: "已過關",
  pass: "都不滿意",
  current: "目前這關",
  todo: "還沒到",
};

/**
 * 集章卡：一關一格，過關就在格子上蓋一個章。
 * compact：闖關時放在最上面的一排；card：揭曉時的完整集章卡，每格附關卡名稱。
 * 已經過的關可以點回去改；還沒到的關不能跳。
 */
export function StampTrail({
  items,
  fresh,
  onJump,
  label,
  variant = "compact",
}: {
  items: TrailItem[];
  /** 剛剛過關的那一格，章會用蓋下去的動畫出現 */
  fresh?: string | null;
  onJump?: (index: number) => void;
  label: string;
  variant?: "compact" | "card";
}) {
  const card = variant === "card";
  return (
    <ol
      aria-label={label}
      className={card ? "grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6" : "flex w-full items-center justify-between gap-1"}
    >
      {items.map((item, i) => {
        const stamped = item.state === "done" || item.state === "pass";
        const reachable = Boolean(onJump) && item.state !== "todo" && item.state !== "current";
        const dot = (
          <span
            className={`world world-${item.id} relative grid aspect-square place-items-center rounded-full ${
              card ? "w-14" : "w-full max-w-8"
            } ${
              item.state === "current"
                ? "bg-[var(--w-ink)] text-white shadow-[0_0_0_3px_var(--paper),0_0_0_5px_var(--w-ink)]"
                : stamped
                  ? "bg-card"
                  : "bg-card text-muted/50"
            }`}
          >
            {!stamped && <DomainIcon id={item.id} size={card ? 28 : 16} />}
            {stamped && (
              <span className={`grid place-items-center ${fresh === item.id ? "trail-new" : "-rotate-12"}`}>
                <Stamp size={card ? 50 : 26} color={item.state === "pass" ? "var(--muted)" : "var(--stamp)"} />
              </span>
            )}
          </span>
        );
        const body = card ? (
          <span className="flex flex-col items-center gap-1.5">
            {dot}
            <span className="text-center text-xs leading-tight opacity-80">{item.name}</span>
          </span>
        ) : (
          dot
        );
        return (
          <li key={item.id} className="flex flex-1 justify-center">
            {reachable ? (
              <button
                type="button"
                onClick={() => onJump?.(i)}
                className="grid w-full place-items-center rounded-full"
                aria-label={`第 ${i + 1} 關 ${item.name}，${STATUS[item.state]}，點一下回到這關`}
              >
                {body}
              </button>
            ) : (
              <span className="grid w-full place-items-center" aria-label={`第 ${i + 1} 關 ${item.name}，${STATUS[item.state]}`}>
                {body}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
