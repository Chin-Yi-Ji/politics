import Link from "next/link";
import { MayorDuties } from "@/components/MayorDuties";
import { Stamp } from "@/components/Stamp";
import { getCandidates, getCounties } from "@/lib/data";
import type { County } from "@/lib/types";

function CountyLink({ county }: { county: County }) {
  const ready = county.status === "ready";
  const count = getCandidates(county.id).length;
  return (
    <li>
      <Link
        href={ready ? `/play/${county.id}` : `/county/${county.id}`}
        className="group flex items-baseline gap-3 border-b border-line py-4 hover:border-ink"
      >
        <span className="font-serif text-xl font-semibold tracking-[0.08em] group-hover:text-stamp">{county.name}</span>
        <span aria-hidden="true" className="leader" />
        <span className="shrink-0 text-sm text-muted">
          {ready ? `${count} 位候選人` : "政見整理中"}
        </span>
      </Link>
    </li>
  );
}

export default function Home() {
  const counties = getCounties();
  const groups = [
    { title: "直轄市", items: counties.filter((c) => c.type === "直轄市") },
    { title: "縣市", items: counties.filter((c) => c.type === "縣" || c.type === "市") },
    { title: "示範（虛構資料，正式站不顯示）", items: counties.filter((c) => c.demo) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-4xl px-6">
      <MayorDuties />

      <section aria-labelledby="cover" className="border-t border-ink py-16 sm:py-24">
        <div className="flex flex-row-reverse justify-end gap-7 sm:flex-row sm:gap-16">
          <div className="relative shrink-0 self-start">
            <h1
              id="cover"
              className="vertical h-[6.2em] w-[3em] font-serif text-[2.6rem] font-semibold leading-[1.5] tracking-[0.18em] sm:text-6xl"
            >
              先看政見，
              <br />
              再看是誰。
            </h1>
            <Stamp size={46} className="absolute -bottom-3 -left-5 -rotate-12 sm:-left-7" />
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <p className="text-sm tracking-[0.15em] text-muted">二〇二六 縣市長選舉</p>
            <p className="mt-6 text-[1.0625rem] leading-[2.1]">
              把候選人的名字先蓋起來。每個領域是一關，只讀政見，挑你最認同的那一張。全部讀完，才揭曉是誰寫的。
            </p>
            <ol className="mt-8 space-y-3 text-[0.95rem]">
              {[
                ["選你在意的", "最多四件事"],
                ["一關一關盲選", "名字蓋住，只看內容"],
                ["揭曉", "看你選的政見來自誰"],
              ].map(([title, body], i) => (
                <li key={title} className="grid grid-cols-[2em_1fr]">
                  <span className="font-serif text-muted">{"一二三"[i]}</span>
                  <span>
                    <span className="font-serif font-semibold tracking-[0.05em]">{title}</span>
                    <span className="block text-muted sm:ml-3 sm:inline">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
            <a
              href="#pick-county"
              className="mt-10 inline-block border-b-2 border-ink pb-1 font-serif text-lg font-semibold tracking-[0.1em] hover:border-stamp hover:text-stamp"
            >
              選你的縣市
            </a>
          </div>
        </div>
      </section>

      <section aria-labelledby="pick-county" className="scroll-mt-6 border-t border-ink pb-8 pt-14 sm:pt-20">
        <h2 id="pick-county" className="font-serif text-[1.75rem] font-semibold tracking-[0.08em] sm:text-4xl">
          你住在哪裡？
        </h2>
        {groups.map((group) => (
          <div key={group.title} className="mt-10">
            <h3 className="font-sans text-sm font-normal tracking-[0.15em] text-muted">{group.title}</h3>
            <ul className="mt-2 grid gap-x-14 sm:grid-cols-2">
              {group.items.map((c) => (
                <CountyLink key={c.id} county={c} />
              ))}
            </ul>
          </div>
        ))}
        <p className="mt-10 text-xs leading-relaxed text-muted">
          候選人名冊依公視與 TVBS 整理的登記名單建立，正式名單以中選會 11 月 12 日（直轄市長）與 11 月 17
          日（縣市長）的公告為準。
        </p>
      </section>
    </div>
  );
}
