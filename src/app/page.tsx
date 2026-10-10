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
        className="group relative flex h-full flex-col rounded-2xl bg-card px-4 py-3.5 shadow-[0_1px_0_rgb(42_41_38/0.1),0_6px_16px_rgb(42_41_38/0.05)] hover:shadow-[0_0_0_2px_var(--ink)]"
      >
        <span className="font-serif text-2xl font-black">{county.name}</span>
        <span className="text-sm text-muted">{ready ? `${count} 位候選人` : "政見整理中"}</span>
        {ready && (
          <span aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 -rotate-12 opacity-0 transition-opacity group-hover:opacity-100">
            <Stamp size={34} />
          </span>
        )}
      </Link>
    </li>
  );
}

/** 首頁主視覺：三張疊起來的政見卡，名字被塗黑，最上面那張蓋了章 */
function TicketStack() {
  return (
    <div aria-hidden="true" className="relative mx-auto h-[15.5rem] w-full max-w-[22rem]">
      <div className="ticket-wrap absolute inset-x-6 top-6 rotate-[7deg]">
        <div className="ticket h-52" />
      </div>
      <div className="ticket-wrap absolute inset-x-3 top-3 -rotate-[5deg]">
        <div className="ticket h-52" />
      </div>
      <div className="ticket-wrap absolute inset-x-0 top-0 rotate-[1.5deg]">
        <div className="ticket relative">
          <div className="ticket-head flex items-center justify-between px-5">
            <span className="font-serif text-2xl font-black">甲</span>
            <span className="text-sm font-bold text-muted">政見卡</span>
          </div>
          <div className="perforation" />
          <div className="space-y-3 px-5 pb-5 pt-4">
            <p className="flex items-center gap-2 text-[0.95rem]">
              <span className="h-2 w-2 rotate-45 bg-ink" />
              公車班次<span className="num">加倍</span>
            </p>
            <p className="flex items-center gap-2 text-[0.95rem]">
              <span className="h-2 w-2 rotate-45 bg-ink" />
              公托名額<span className="num">翻倍</span>
            </p>
            <p className="flex items-center gap-2 text-[0.95rem]">
              <span className="h-2 w-2 rotate-45 bg-ink" />
              國中小午餐<span className="num">免費</span>
            </p>
            <p className="flex items-center gap-2 border-t border-line pt-3 text-sm text-muted">
              提出者
              <span className="h-4 w-24 rounded-sm bg-ink" />
            </p>
          </div>
          <span className="absolute right-4 top-12 -rotate-12">
            <Stamp size={72} />
          </span>
        </div>
      </div>
    </div>
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
    <div className="mx-auto max-w-4xl px-4">
      <section aria-labelledby="cover" className="grid items-center gap-10 pb-6 pt-8 sm:grid-cols-[1.1fr_1fr] sm:pt-14">
        <div>
          <h1 id="cover" className="text-5xl sm:text-6xl">
            政見盲選所
          </h1>
          <p className="mt-3 font-serif text-2xl font-black text-muted">先看政見，再看是誰。</p>
          <ol className="mt-7 space-y-2.5">
            {[
              ["蓋章", "選你最在意的事"],
              ["盲選", "名字蓋住，一關挑一張"],
              ["揭曉", "看你挑的是誰的政見"],
            ].map(([title, body], i) => (
              <li key={title} className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink font-serif text-sm font-black text-white">
                  {i + 1}
                </span>
                <span className="font-serif text-lg font-black">{title}</span>
                <span className="text-muted">{body}</span>
              </li>
            ))}
          </ol>
          <a href="#pick-county" className="btn mt-8">
            選縣市，開始
          </a>
        </div>
        <TicketStack />
      </section>

      <MayorDuties />

      <section aria-labelledby="pick-county" className="scroll-mt-6 pb-8">
        <h2 id="pick-county" className="text-4xl sm:text-5xl">
          你住哪裡？
        </h2>
        {groups.map((group) => (
          <div key={group.title} className="mt-8">
            <h3 className="font-sans text-sm font-bold text-muted">{group.title}</h3>
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {group.items.map((c) => (
                <CountyLink key={c.id} county={c} />
              ))}
            </ul>
          </div>
        ))}
        <p className="mt-8 text-xs leading-relaxed text-muted">
          候選人名冊依公視與 TVBS 整理的登記名單建立，正式名單以中選會 11 月 12 日（直轄市長）與 11 月 17
          日（縣市長）的公告為準。
        </p>
      </section>
    </div>
  );
}
