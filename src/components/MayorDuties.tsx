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
  ["安全", "地方的警察和消防、防颱、救災、治水"],
  ["環境", "收垃圾、公園、抓污染"],
  ["住的地方", "社會住宅、老屋重建、哪裡可以蓋什麼"],
  ["福利", "津貼補助、照顧弱勢和身心障礙者"],
  ["工作和生意", "招商、市場和商圈、觀光、農漁業"],
];

const HOW: [string, string][] = [
  ["提預算", "每年提出「錢要怎麼花」，縣市議會同意後才能用。"],
  ["選團隊", "教育、交通等各局處的首長，大多由他挑選。"],
  ["帶著做", "指揮縣市政府的公務員，把計畫變成真的。"],
];

const CANNOT = [
  "國防、外交",
  "法律怎麼訂、犯罪怎麼判",
  "健保、勞保、年金的制度（縣市可以幫忙出保費，但不能改制度）",
  "所得稅這類國稅",
  "高鐵、台鐵、國道",
];

export function MayorDuties() {
  return (
    <section aria-labelledby="duties" className="border-b-2 border-ink pb-10 pt-10 sm:pt-14">
      <p className="text-sm text-muted">投票之前，先知道這一票在選什麼</p>
      <h2 id="duties" className="mt-1 text-3xl sm:text-4xl">
        縣市長是做什麼的？
      </h2>
      <p className="mt-4 max-w-2xl text-lg">
        縣市長就像一個縣市的<span className="marked">大管家</span>。任期 4
        年，最多連做兩任。他帶領整個縣市政府，決定哪些事先做、錢花在哪裡。
      </p>
      <p className="mt-2 text-sm">
        <a href="#pick-county" className="link">
          已經知道了，直接選縣市
        </a>
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-[1.4fr_1fr]">
        <div>
          <h3 className="text-xl">他管得到的事</h3>
          <p className="text-sm text-muted">都跟你每天的生活有關。</p>
          <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {CAN.map(([title, body]) => (
              <li key={title} className="border-t border-line pt-2">
                <span className="font-bold">{title}</span>
                <span className="block text-sm text-muted">{body}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid content-start gap-8">
          <div>
            <h3 className="text-xl">他怎麼做事</h3>
            <ol className="mt-3 grid gap-2">
              {HOW.map(([title, body], i) => (
                <li key={title} className="border-t border-line pt-2">
                  <span className="font-bold">
                    {i + 1}. {title}
                  </span>
                  <span className="block text-sm text-muted">{body}</span>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h3 className="text-xl">他管不到的事</h3>
            <p className="text-sm text-muted">這些要中央政府決定。</p>
            <ul className="mt-3 list-disc space-y-1 pl-5">
              {CANNOT.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <p className="mt-8 max-w-3xl rounded-lg border-2 border-ink bg-card px-4 py-3">
        <span className="font-bold">看政見時的小提醒：</span>
        政見裡寫「爭取」，通常表示這件事要中央政府點頭或出錢，縣市長能做的是去要，不是自己就能決定。捷運就是這樣：地方提計畫，中央核定並補助一部分經費。
      </p>
      <p className="mt-3 text-sm text-muted">
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
