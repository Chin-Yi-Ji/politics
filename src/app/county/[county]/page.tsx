import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DomainIcon } from "@/components/DomainIcon";
import { DomainInterest } from "@/components/DomainInterest";
import { getOverridesCached } from "@/lib/cached";
import { HeatList, HeatNote } from "@/components/HeatList";
import { getCandidates, getCounties, getCounty, getDomains, getHeat, getPolicyFile, getSources, sourceMode, visibleCards } from "@/lib/data";
import { SOURCE_TYPE_LABEL } from "@/lib/types";

export function generateStaticParams() {
  return getCounties().map((c) => ({ county: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/county/[county]">): Promise<Metadata> {
  const county = getCounty((await params).county);
  if (!county) return {};
  return {
    title: `${county.name}長候選人政見對照`,
    description: `${county.name}所有縣市長候選人的政見，依領域並排對照，每一條都附原文與來源。`,
  };
}

export default function CountyPage({ params }: PageProps<"/county/[county]">) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-5xl px-4 pt-10 text-muted">載入中…</p>}>
      <CountyContent params={params} />
    </Suspense>
  );
}

async function CountyContent({ params }: { params: Promise<{ county: string }> }) {
  const county = getCounty((await params).county);
  if (!county) notFound();

  const candidates = getCandidates(county.id);
  const domains = getDomains();
  const file = getPolicyFile(county.id);
  const ready = county.status === "ready" && file !== null;
  const cards = ready ? visibleCards(file, await getOverridesCached()) : [];
  const heat = getHeat(county.id);

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10">
      <p className="text-sm text-muted">
        <Link href="/" className="link">所有縣市</Link>
      </p>
      <h1 className="mt-2 text-4xl sm:text-5xl">{county.name}長候選人政見對照</h1>

      {ready ? (
        <p className="mt-4 max-w-2xl">
          資料截止日 {file.asOf}。只收「當選後要做什麼」，來源以選舉公報、候選人官方網站與官方社群、公辦政見發表會為主
          {sourceMode() === "extended" ? "；候選人沒有可查證的官方文字時，改用新聞報導中他公開提出的政見，並標示「新聞報導」" : ""}
          。標示「未提出」代表截至這一天，我們在這些來源裡沒有找到這位候選人在該領域的政見。
        </p>
      ) : (
        <p className="mt-4 max-w-2xl rounded-lg border-2 border-ink bg-mark px-4 py-3 font-bold">
          這個縣市的政見還在整理中，預計 10 月 28 日前上線。目前只有候選人名冊。
          {county.pendingNote ? ` ${county.pendingNote}` : ""}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {ready && (
          <Link href={`/play/${county.id}`} className="btn">
            先不看名字，闖關盲選
          </Link>
        )}
        <Link href={`/report?county=${county.id}`} className="btn btn-quiet">
          回報遺漏或錯誤
        </Link>
      </div>

      <section aria-labelledby="roster" className="mt-10">
        <h2 id="roster" className="text-2xl">
          候選人
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {candidates.map((c) => {
            const src = getSources(c.id);
            return (
              <li key={c.id} className="rounded-2xl bg-card px-4 py-3 shadow-[0_1px_0_rgb(42_41_38/0.08)]">
                <span className="font-bold">{c.name}</span>
                <span className="ml-2 text-sm text-muted">{c.party}</span>
                {c.note && <p className="mt-1 text-sm text-muted">{c.note}</p>}
                {src?.official.map((o) => (
                  <p key={o.url} className="mt-1 text-sm">
                    <a href={o.url} className="link" rel="noopener noreferrer" target="_blank">
                      {o.label}
                    </a>
                  </p>
                ))}
                {src?.note && <p className="mt-1 text-sm text-muted">{src.note}</p>}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-sm text-muted">號次於 10 月 23 日抽籤，抽籤前依姓名排序。</p>
      </section>

      {heat && (
        <section aria-labelledby="heat" className="mt-12">
          <h2 id="heat" className="text-2xl">
            {county.name}最近常被談到的事
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            橫條越長，代表最近提到這個領域的新聞與討論越多。這是「大家在談什麼」，不是「哪位候選人比較好」。
          </p>
          <div className="mt-4">
            <HeatList heat={heat} />
          </div>
          <HeatNote heat={heat} />
        </section>
      )}

      {ready && (
        <section aria-labelledby="compare" className="mt-12">
          <h2 id="compare" className="text-2xl">
            各領域政見
          </h2>
          <div className="mt-4 space-y-5">
            {domains.map((domain) => (
              <div key={domain.id} className={`world world-${domain.id} -mx-4 bg-[var(--w-bg)] px-4 py-5 sm:mx-0 sm:rounded-[24px] sm:px-6`}>
                <h3 className="flex items-center gap-3 text-xl">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-card text-[var(--w-ink)]">
                    <DomainIcon id={domain.id} size={26} />
                  </span>
                  {domain.name}
                </h3>
                <div className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
                  <ul
                    className="mt-3 grid gap-3"
                    style={{ gridTemplateColumns: `repeat(${candidates.length}, minmax(15rem, 1fr))` }}
                  >
                    {candidates.map((cand) => {
                      const card = cards.find((c) => c.domainId === domain.id && c.candidateId === cand.id);
                      return (
                        <li key={cand.id} className="rounded-2xl bg-card p-4">
                          <p className="font-bold">
                            {cand.name}
                            <span className="ml-2 text-sm font-normal text-muted">{cand.party}</span>
                          </p>
                          {card ? (
                            <>
                              <ul className="mt-2 space-y-1.5 leading-relaxed">
                                {card.points.map((p) => (
                                  <li key={p} className="flex gap-2.5">
                                    <span aria-hidden="true" className="mt-[0.65em] h-1.5 w-1.5 shrink-0 rotate-45 bg-[var(--w-ink)]" />
                                    <span>{p}</span>
                                  </li>
                                ))}
                              </ul>
                              <details className="mt-3 text-sm">
                                <summary className="cursor-pointer text-muted">看原文與來源</summary>
                                {card.originals.map((o) => (
                                  <blockquote key={o.sourceUrl + o.quote} className="mt-2 border-l-4 border-line pl-3">
                                    <p>「{o.quote}」</p>
                                    <p className="mt-1 text-muted">
                                      <a href={o.sourceUrl} className="link" rel="noopener noreferrer" target="_blank">
                                        {SOURCE_TYPE_LABEL[o.sourceType]}
                                      </a>
                                      ，{o.capturedAt} 擷取
                                    </p>
                                  </blockquote>
                                ))}
                              </details>
                            </>
                          ) : (
                            <p className="mt-2 text-muted">未提出</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {ready && <DomainInterest countyId={county.id} countyName={county.name} />}
    </div>
  );
}
