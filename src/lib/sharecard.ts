/**
 * 揭曉後的分享圖。整張圖在使用者的瀏覽器裡用 canvas 畫出來，不經過伺服器，
 * 所以「誰得到什麼推薦」不會被網站記下來。
 * 尺寸 1080×1350（4:5），FB、Threads、IG 貼文都能直接用。
 */

export const CARD_W = 1080;
export const CARD_H = 1350;

export type ShareCardData = {
  countyName: string;
  /** 推薦的候選人；平手時有多位 */
  winners: { name: string; party: string }[];
  /** 加權後的票數，高到低 */
  tally: { name: string; weighted: number }[];
  /** 使用者一開始選的領域名稱 */
  domains: string[];
  /** 網站網址（不含 https://） */
  host: string;
};

const INK = "#262231";
const MUTED = "#6c6680";
const PAPER = "#f1eff3";
const STAMP = "#d0252b";
const MARK = "#f3e3a6";
const SERIF = '"Noto Serif TC", "Songti TC", "PMingLiU", serif';
const SANS = '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
const M = 96;

type Ctx = CanvasRenderingContext2D;

function font(weight: number, size: number, family: string) {
  return `${weight} ${size}px ${family}`;
}

/** 從 start 開始縮小字級，直到整行塞得進 maxWidth */
function fit(ctx: Ctx, text: string, maxWidth: number, start: number, min: number, weight: number, family: string) {
  let size = start;
  for (; size > min; size -= 2) {
    ctx.font = font(weight, size, family);
    if (ctx.measureText(text).width <= maxWidth) break;
  }
  ctx.font = font(weight, size, family);
  return size;
}

/** 圈選章：和網站上的 Stamp 元件同一個形狀 */
function drawStamp(ctx: Ctx, cx: number, cy: number, size: number, rotateDeg: number) {
  const k = size / 64;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((rotateDeg * Math.PI) / 180);
  ctx.scale(k, k);
  ctx.translate(-32, -32);
  ctx.strokeStyle = STAMP;
  ctx.lineCap = "round";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(32, 32, 27, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(27, 15);
  ctx.lineTo(27, 49);
  ctx.moveTo(27, 29);
  ctx.lineTo(42, 38);
  ctx.stroke();
  ctx.restore();
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function rule(ctx: Ctx, y: number, width: number, color = INK) {
  ctx.fillStyle = color;
  ctx.fillRect(M, y, CARD_W - M * 2, width);
}

/** 圖上會用到的字，先請瀏覽器把對應的字型檔載進來，畫出來才不會是預設字型 */
async function loadFonts(text: string) {
  if (typeof document === "undefined" || !document.fonts) return;
  const wait = Promise.all([
    document.fonts.load(font(900, 80, '"Noto Serif TC"'), text),
    document.fonts.load(font(700, 40, '"Noto Sans TC"'), text),
    document.fonts.load(font(400, 40, '"Noto Sans TC"'), text),
  ]);
  // 字型載不到就用系統字型畫，不要讓使用者等不到圖
  await Promise.race([wait, new Promise((resolve) => setTimeout(resolve, 4000))]).catch(() => undefined);
}

export function shareHeadline(countyName: string) {
  return { first: "依照政見，", second: `${countyName}我會投：` };
}

export async function drawShareCard(canvas: HTMLCanvasElement, data: ShareCardData) {
  const tie = data.winners.length > 1;
  const headline = shareHeadline(data.countyName);
  const names = data.winners.map((w) => w.name).join("、");
  const tallyLine = data.tally
    .filter((t) => t.weighted > 0)
    .slice(0, 4)
    .map((t) => `${t.name} ${t.weighted} 票`)
    .join("、");
  const domainLine = data.domains.length > 0 ? `最在意：${data.domains.join("、")}` : "";
  const partyLine = tie ? "票數相同，並列" : data.winners[0]?.party ?? "";
  const fixed = "先看政見政見盲選結果名字蓋起來，只看政見選出的結果先看政見，再看是誰。個人盲選結果，不是民調，也不代表本站立場。最在意的領域一張算兩票。0123456789";
  await loadFonts(headline.first + headline.second + names + tallyLine + domainLine + partyLine + fixed + data.host);

  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("這個瀏覽器不支援產生圖片。");
  const right = CARD_W - M;
  const inner = CARD_W - M * 2;

  // 底色與選票外框
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  roundRect(ctx, 40, 40, CARD_W - 80, CARD_H - 80, 28);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = INK;
  ctx.stroke();

  // 頁首
  ctx.textBaseline = "alphabetic";
  drawStamp(ctx, M + 30, 136, 60, 0);
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  ctx.font = font(900, 46, SERIF);
  ctx.fillText("先看政見", M + 76, 153);
  ctx.textAlign = "right";
  ctx.fillStyle = MUTED;
  ctx.font = font(700, 30, SANS);
  ctx.fillText("政見盲選結果", right, 150);
  rule(ctx, 196, 4);

  // 主句
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = font(900, 84, SERIF);
  ctx.fillText(headline.first, M, 350);
  fit(ctx, headline.second, inner, 84, 56, 900, SERIF);
  ctx.fillText(headline.second, M, 462);

  // 名字：螢光筆底線加圈選章
  const nameBase = 730;
  const nameMax = tie ? inner : 760;
  const size = fit(ctx, names, nameMax, tie ? 170 : 230, 64, 900, SERIF);
  const nameWidth = Math.min(ctx.measureText(names).width, nameMax);
  ctx.fillStyle = MARK;
  ctx.fillRect(M - 12, nameBase - size * 0.3, nameWidth + 24, size * 0.42);
  ctx.fillStyle = INK;
  ctx.fillText(names, M, nameBase, nameMax);
  if (!tie) drawStamp(ctx, right - 108, nameBase - 150, 232, -14);

  ctx.fillStyle = MUTED;
  ctx.font = font(400, 40, SANS);
  ctx.fillText(partyLine, M, nameBase + 92, inner);

  // 票數與在意的領域
  rule(ctx, 900, 2);
  ctx.fillStyle = MUTED;
  ctx.font = font(400, 34, SANS);
  ctx.fillText("名字蓋起來，只看政見選出的結果", M, 962);
  ctx.fillStyle = INK;
  fit(ctx, tallyLine, inner, 46, 28, 700, SANS);
  ctx.fillText(tallyLine, M, 1030, inner);
  if (domainLine) {
    ctx.fillStyle = MUTED;
    fit(ctx, domainLine, inner, 34, 24, 400, SANS);
    ctx.fillText(domainLine, M, 1092, inner);
  }

  // 頁尾
  rule(ctx, 1140, 2);
  ctx.fillStyle = INK;
  ctx.font = font(900, 42, SERIF);
  ctx.fillText("先看政見，再看是誰。", M, 1210);
  ctx.textAlign = "right";
  fit(ctx, data.host, 380, 30, 20, 700, SANS);
  ctx.fillText(data.host, right, 1208);
  ctx.textAlign = "left";
  ctx.fillStyle = MUTED;
  ctx.font = font(400, 25, SANS);
  ctx.fillText("個人盲選結果，不是民調，也不代表本站立場。最在意的領域一張算兩票。", M, 1260, inner);
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("圖片產生失敗。"))), "image/png");
  });
}
