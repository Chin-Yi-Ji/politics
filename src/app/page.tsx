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
        className="flex h-full flex-col rounded-lg border-2 border-ink bg-card px-4 py-3 hover:bg-stamp-soft"
      >
        <span className="font-serif text-xl font-black">{county.name}</span>
        <span className="text-sm text-muted">
          {count} 位候選人{ready ? "" : "，政見整理中"}
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
    <div className="mx-auto max-w-5xl px-4">
      <MayorDuties />

      <section className="relative pb-10 pt-14 sm:pt-20">
        <Stamp size={132} className="absolute right-0 top-8 -rotate-12 opacity-90 sm:right-10 sm:top-12 sm:h-48 sm:w-48" />
        <h1 className="relative max-w-[11em] text-5xl sm:text-7xl">
          先看政見，
          <br />
          再看是誰。
        </h1>
        <p className="mt-6 max-w-xl text-lg">
          我們把候選人的名字先蓋起來。你只看每個人打算做什麼，挑出你喜歡的，選完才揭曉那些政見是誰提的。
        </p>
        <ol className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
          {[
            ["寫下期待", "你希望這個縣市改善什麼，寫得越具體越好。"],
            ["盲選政見", "相關的領域排在前面，每張卡都不知道是誰的。"],
            ["揭曉", "看看你挑的政見來自誰，再對照所有候選人。"],
          ].map(([title, body], i) => (
            <li key={title} className="border-t-2 border-ink pt-2">
              <span className="font-serif text-lg font-black">
                {i + 1}. {title}
              </span>
              <p className="text-sm text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="pick-county" className="pb-6">
        <h2 id="pick-county" className="text-3xl">
          你住在哪個縣市？
        </h2>
        {groups.map((group) => (
          <div key={group.title} className="mt-6">
            <h3 className="text-base text-muted">{group.title}</h3>
            <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {group.items.map((c) => (
                <CountyLink key={c.id} county={c} />
              ))}
            </ul>
          </div>
        ))}
        <p className="mt-6 text-sm text-muted">
          候選人名冊依公視與 TVBS 整理的登記名單建立，正式名單以中選會 11 月 12 日（直轄市長）與 11 月 17
          日（縣市長）的公告為準。
        </p>
      </section>
    </div>
  );
}
