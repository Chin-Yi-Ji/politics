import { cacheLife, cacheTag } from "next/cache";
import { getStore } from "./store";
import type { Overrides } from "./types";

/** 對照表用的下架清單。後台改動時會讓這個快取立刻失效。 */
export async function getOverridesCached(): Promise<Overrides> {
  "use cache";
  cacheTag("overrides");
  cacheLife("minutes");
  try {
    return await getStore().getOverrides();
  } catch {
    return {};
  }
}
