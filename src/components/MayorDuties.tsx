/**
 * 首頁最前面：縣市長是做什麼的。
 * 內容依地方制度法第 19、40、55、56 條與憲法第 107、108 條整理，用國中生看得懂的話寫。
 */

const LAW_LOCAL = "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0040003";
const LAW_CONSTITUTION = "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=A0000001";

const CAN: [string, string][] = [
  ["路和車", "馬路、人行道、公車、停車位"],
  ["學校和小孩", "公立國中小、幼兒園、公托、營養午餐"],
  ["長輩和看病", "長期照顧、衛生所、打疫苗"],
  ["安全", "地方警消、防颱、救災、治水"],
  ["環境", "收垃圾、公園、抓污染"],
  ["住的地方", "社會住宅、老屋重建、土地怎麼用"],
  ["福利", "津貼補助、照顧弱勢與身心障礙者"],
  ["工作和生意", "招商、市場商圈、觀光、農漁業"],
];

const CANNOT = ["國防、外交", "法律怎麼訂、犯罪怎麼判", "健保、勞保、年金的制度", "所得稅這類國稅", "高鐵、台鐵、國道"];

const HOW: [string, string][] = [
  ["提預算", "每年提出錢要怎麼花，議會同意後才能用。"],
  ["選團隊", "教育、交通等局處首長，大多由他挑選。"],
  ["帶著做", "指揮縣市政府的公務員，把計畫變成真的。"],
];

export function MayorDuties() {
  return (
    <section aria-labelledby="duties" className="py-14 sm:py-20">
      <h2 id="duties" className="font-serif text-[1.75rem] font-semibold tracking-[0.08em] sm:text-4xl">
        縣市長，是做什麼的？
      </h2>
      <p className="mt-5 max-w-[34em] text-[1.0625rem] leading-[2]">
        他像一個縣市的大管家。任期四年，最多連任一次，帶著縣市政府決定哪些事先做、錢花在哪裡。
      </p>
      <p className="mt-3 text-sm">
        <a href="#pick-county" className="link text-muted">
          已經知道了，直接選縣市
        </a>
      </p>

      <div className="mt-12 grid gap-12 md:grid-cols-[1.3fr_1fr] md:gap-16">
        <div>
          <h3 className="border-b border-ink pb-2 font-serif text-lg font-semibold tracking-[0.1em]">他管得到的</h3>
          <dl>
            {CAN.map(([title, body]) => (
              <div key={title} className="grid grid-cols-[6.5em_1fr] gap-3 border-b border-line py-3.5">
                <dt className="font-serif font-semibold tracking-[0.05em]">{title}</dt>
                <dd className="text-[0.95rem] leading-relaxed text-muted">{body}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid content-start gap-12">
          <div>
            <h3 className="border-b border-ink pb-2 font-serif text-lg font-semibold tracking-[0.1em]">他管不到的</h3>
            <ul>
              {CANNOT.map((item) => (
                <li key={item} className="border-b border-line py-3.5 text-[0.95rem] text-muted">
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-relaxed text-muted">這些由中央決定。健保、勞保的保費縣市可以幫忙出，但不能改制度。</p>
          </div>

          <div>
            <h3 className="border-b border-ink pb-2 font-serif text-lg font-semibold tracking-[0.1em]">他怎麼做事</h3>
            <ol>
              {HOW.map(([title, body], i) => (
                <li key={title} className="grid grid-cols-[2em_1fr] border-b border-line py-3.5">
                  <span className="font-serif text-muted">{"一二三"[i]}</span>
                  <span>
                    <span className="font-serif font-semibold tracking-[0.05em]">{title}</span>
                    <span className="block text-[0.95rem] leading-relaxed text-muted">{body}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <p className="mt-12 max-w-[36em] border-l-2 border-stamp pl-5 text-[0.95rem] leading-[2]">
        讀政見時留意「爭取」兩個字。那通常表示要中央點頭或出錢，縣市長能做的是去要。捷運就是這樣：地方提計畫，中央核定並補助一部分經費。
      </p>

      <p className="mt-8 text-xs leading-relaxed text-muted">
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
