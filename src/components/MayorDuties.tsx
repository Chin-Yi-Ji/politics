import type { ReactNode } from "react";
import { DomainIcon } from "./DomainIcon";
import { Stamp } from "./Stamp";

/**
 * 首頁：縣市長是做什麼的。
 * 內容依地方制度法第 19、40、55、56 條與憲法第 107、108 條整理，用國中生看得懂的話寫。
 * 字盡量少，以圖示說明；只用墨色與印章紅兩種顏色。
 */

const LAW_LOCAL = "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0040003";
const LAW_CONSTITUTION = "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0000001";

/** [領域圖示, 名稱, 一句話] */
const CAN: [string, string, string][] = [
  ["transport", "路和車", "馬路、人行道、公車路線、停車位"],
  ["education", "學校和小孩", "公立國中小、幼兒園、公托、營養午餐"],
  ["health", "長輩和看病", "長期照顧、衛生所、疫苗補助"],
  ["safety", "安全", "消防救災、防颱治水、地方治安"],
  ["environment", "環境", "收垃圾、公園綠地、管空氣與水污染"],
  ["housing", "住的地方", "社會住宅、都市更新、土地怎麼用"],
  ["welfare", "福利", "生育與敬老津貼、照顧弱勢與身障者"],
  ["economy", "工作和生意", "招商、市場商圈、觀光、農漁業"],
]

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg width="34" height="34" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const HOW: [ReactNode, string, string][] = [
  [
    <Glyph key="m">
      <path d="M19 8h10l-3 7h-4z" />
      <path d="M21 15c-7 4-12 11-12 17 0 6 5 9 15 9s15-3 15-9c0-6-5-13-12-17" />
      <path d="M24 23v12M20 27h8M20 31h8" />
    </Glyph>,
    "管錢",
    "每年提出總預算，縣市議會審查同意後才能花。政見要做到，得先編得出這筆錢。",
  ],
  [
    <Glyph key="t">
      <circle cx="16" cy="16" r="5" />
      <circle cx="32" cy="16" r="5" />
      <path d="M6 38c0-7 4-12 10-12s10 5 10 12M22 38c0-7 4-12 10-12s10 5 10 12" />
    </Glyph>,
    "找人",
    "教育、交通等局處首長大多由他任命。團隊強不強，決定政見能不能落實。",
  ],
  [
    <Glyph key="f">
      <path d="M12 42V6" />
      <path d="M12 8h24l-5 7 5 7H12" />
    </Glyph>,
    "帶頭做",
    "指揮縣市政府執行計畫，也要跟議會、中央溝通，把事情推過關。",
  ],
];

const CANNOT: [ReactNode, string, string][] = [
  [
    <Glyph key="d">
      <path d="M8 30a16 16 0 0 1 32 0z" />
      <path d="M5 30h38M24 14v-4" />
    </Glyph>,
    "國防外交",
    "國家層級的事",
  ],
  [
    <Glyph key="l">
      <path d="M14 22l10-10 8 8-10 10z" />
      <path d="M28 26l12 12M8 42h18" />
    </Glyph>,
    "法律審判",
    "立法院和法院",
  ],
  [
    <Glyph key="h">
      <rect x="6" y="12" width="36" height="26" rx="4" />
      <path d="M24 19v12M18 25h12" />
    </Glyph>,
    "健保年金制度",
    "保費能幫出，制度改不了",
  ],
  [
    <Glyph key="x">
      <path d="M12 6h24v36l-4-3-4 3-4-3-4 3-4-3-4 3z" />
      <path d="M18 16h12M18 23h12M18 30h7" />
    </Glyph>,
    "所得稅",
    "國稅歸財政部",
  ],
  [
    <Glyph key="r">
      <rect x="9" y="7" width="30" height="29" rx="6" />
      <path d="M13 15h22v8H13zM15 30h3M30 30h3M15 36l-4 6M33 36l4 6" />
    </Glyph>,
    "高鐵台鐵國道",
    "中央交通部門",
  ],
];

export function MayorDuties() {
  return (
    <section aria-labelledby="duties" className="scroll-mt-6 pb-14 pt-10 sm:py-20">
      <h2 id="duties" className="text-4xl sm:text-5xl">
        縣市長，
        <br className="sm:hidden" />
        到底在忙什麼？
      </h2>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed">
        他是整個縣市的<span className="marked">大管家</span>：任期四年，最多連任一次，決定哪些事先做、錢花在哪裡。你每天出門碰到的公車、學校、垃圾車，大多跟他有關。
      </p>

      <h3 className="mt-10 text-xl">這些歸他管</h3>
      <ul className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border-2 border-ink bg-line sm:grid-cols-4">
        {CAN.map(([icon, title, body]) => (
          <li key={title} className="flex flex-col items-start bg-card p-4 sm:p-5">
            <DomainIcon id={icon} size={34} />
            <span className="mt-3 block font-serif text-lg font-black">{title}</span>
            <span className="block text-sm text-muted">{body}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-12 text-xl">他的三個絕招</h3>
      <p className="text-sm text-muted">讀政見時可以想想：錢從哪來、誰來做、做得到嗎？</p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {HOW.map(([icon, title, body]) => (
          <li key={title} className="flex items-start gap-4 rounded-3xl bg-card p-4 shadow-[0_1px_0_rgb(42_41_38/0.08),0_8px_20px_rgb(42_41_38/0.05)]">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-ink text-white">{icon}</span>
            <span>
              <span className="block font-serif text-xl font-black">{title}</span>
              <span className="mt-0.5 block text-sm leading-relaxed text-muted">{body}</span>
            </span>
          </li>
        ))}
      </ol>

      <h3 className="mt-12 text-xl">這些不歸他管</h3>
      <p className="text-sm text-muted">這些由中央決定。候選人說要改這些，多半只能「爭取」。</p>
      <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
        {CANNOT.map(([icon, title, body]) => (
          <li key={title} className="relative grid place-items-center gap-2 rounded-3xl border-2 border-dashed border-line px-2 py-5 text-center text-muted">
            {icon}
            <span className="text-sm font-bold leading-tight">{title}</span>
            <span className="-mt-1 text-xs leading-snug">{body}</span>
            <span className="absolute right-2 top-2 rotate-12 rounded-md border-2 border-stamp px-1.5 text-xs font-black leading-5 text-stamp">中央</span>
          </li>
        ))}
      </ul>

      <div className="mt-12 flex items-start gap-4 rounded-3xl border-2 border-ink bg-card p-5">
        <Stamp size={40} className="mt-0.5 shrink-0 -rotate-12" />
        <p>
          <span className="font-serif text-lg font-black">看到「爭取」兩個字要小心</span>
          <span className="mt-1 block text-sm leading-relaxed text-muted">
            代表要中央點頭或出錢，縣市長只能去要。像捷運：地方提計畫，中央核定、補助一部分。
          </span>
        </p>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        依據：
        <a className="link" href={LAW_LOCAL} target="_blank" rel="noopener noreferrer">
          地方制度法
        </a>
        第 19、40、55、56 條（直轄市見第 18 條）；
        <a className="link" href={LAW_CONSTITUTION} target="_blank" rel="noopener noreferrer">
          憲法
        </a>
        第 107、108 條；捷運的核定程序見大眾捷運法。
      </p>
    </section>
  );
}
