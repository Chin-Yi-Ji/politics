import fs from "node:fs";
import path from "node:path";

export type SiteInfo = { authorName: string; disclosure: string; contactEmail: string };

/** 「關於」頁要揭露的內容，由站長自己填在 data/site.json */
export function getSiteInfo(): SiteInfo {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "site.json"), "utf8")) as SiteInfo;
}
