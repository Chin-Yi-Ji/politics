/**
 * 一張卡裡的重點，寫得越完整的排越前面。
 * 「完整」用同一套規則計分，對每位候選人都一樣：有數量、有金額、有時程、有對象、有「從多少變多少」、有明確動作（興建、成立、發放…）的加分；
 * 只有方向、或還在研議評估的扣分。同分時維持資料檔裡的原順序。
 */

// 路名、版本、編號這類數字不是「數量」，先拿掉再數
const NOT_QUANTITY = /(?:台|國道|國|縣道|市道|省道)\s*\d+\s*(?:甲|乙|線|號)?|\d+(?:\.\d+)?\s*(?:版|[Ee]\b)|[A-Za-z]+-?\d+|\d+\.0|\d+\s*號|\d+\s*課綱|1999/g;
const TIMELINE = /20\d\d\s*年|\d+\s*學年度|\d+\s*年內|\d+\s*個月內|[二三四五六七八九十兩]\s*年內|未來[二三四五六七八九十兩]年|明年|後年|上半年|下半年|年底前|年初/g;
const UNIT =
  "億|萬|元|%|％|點|戶|坪|人|處|座|輛|站|公頃|公里|公尺|米|小時|分鐘|次|歲|倍|趟|條|家|棟|名|席|份|個|項|張|所|間|館|天|週|年|月|成|胎|班|組|棵|隻|噸|區|里|鄉|校|堂|劑|胎";
const QUANTITY = new RegExp(`\\d[\\d,.]*\\s*(?:${UNIT})|[二三四五六七八九十兩百千萬]+(?:個|座|處|條|大|項|棵|倍|成|種|類|所|間)`, "g");
const MONEY = /\d[\d,.]*\s*(?:億|萬)?\s*元|\d[\d,.]*\s*(?:億|萬)(?!\s*(?:戶|人|個|份|棵|名|席|點))/;
const BEFORE_AFTER = /(?:由|從).{1,14}(?:提高|增加|增|降|減|延長|擴大|放寬|改|調)(?:到|至|為)?|翻倍|加倍|倍增/;
const TARGET = /歲|以上|以下|未滿|家庭|長者|長輩|學生|學童|幼兒|孩童|青年|勞工|農民|漁民|孕婦|產婦|原住民|身障|弱勢|教師|警消|新住民|獨居/;
const FREE = /免費|免繳|全額|補助|津貼|獎金|獎勵金|補貼/;
const TENTATIVE = /研議|不排除|考慮|^評估|將評估|納入評估|評估(?:設|在|增|建|延|是否)/;
const CONCRETE = /興建|新建|增設|設置|設立|成立|動工|完工|通車|發放|開辦|汰換|拓寬|改建|延伸|裝設|加裝|購置|添購|制定|訂定|編列/;
const DIRECTION_ONLY = /^(?:推動|持續|加強|強化|打造|發展|爭取|支持|鼓勵|規劃|落實|完善|提升|深化|建立|促進|督促|整合|串聯|檢討)/;

export function completeness(point: string): number {
  const timeline = point.match(TIMELINE)?.length ?? 0;
  const rest = point.replace(TIMELINE, " ").replace(NOT_QUANTITY, " ");
  const quantities = rest.match(QUANTITY)?.length ?? 0;
  let score = Math.min(quantities, 3) * 2;
  if (timeline > 0) score += 2;
  if (MONEY.test(rest)) score += 1;
  if (BEFORE_AFTER.test(point)) score += 1;
  if (TARGET.test(point)) score += 1;
  if (FREE.test(point)) score += 1;
  const concrete = CONCRETE.test(point);
  if (concrete) score += 1;
  if (TENTATIVE.test(point)) score -= 1;
  if (quantities === 0 && timeline === 0 && !concrete && DIRECTION_ONLY.test(point)) score -= 1;
  return score;
}

/** 依完整程度由高到低排序；同分維持原順序 */
export function orderPoints(points: string[]): string[] {
  return points
    .map((text, index) => ({ text, index, score: completeness(text) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((p) => p.text);
}
