/** 推薦公式。網站「方法」頁的說明必須和這個檔案一致。 */

/** 使用者期待命中的領域，一票算兩票 */
export const MATCHED_WEIGHT = 2;
export const NORMAL_WEIGHT = 1;
/** 有效作答少於這個數字，只揭曉、不推薦 */
export const MIN_VALID_PICKS = 3;

export type Pick = {
  domainId: string;
  /** null 代表這個領域選了「都不滿意」 */
  candidateId: string | null;
};

export type TallyRow = {
  candidateId: string;
  /** 被選中的卡片張數 */
  count: number;
  /** 加權後的票數 */
  weighted: number;
};

export type Recommendation =
  | { kind: "single"; candidateIds: [string] }
  | { kind: "tie"; candidateIds: string[] }
  | { kind: "insufficient"; candidateIds: [] };

export type Result = {
  tally: TallyRow[];
  validPicks: number;
  recommendation: Recommendation;
};

export function computeResult(
  picks: Pick[],
  matchedDomainIds: string[],
  candidateIds: string[],
): Result {
  const matched = new Set(matchedDomainIds);
  const rows = new Map<string, TallyRow>(
    candidateIds.map((id) => [id, { candidateId: id, count: 0, weighted: 0 }]),
  );

  let validPicks = 0;
  for (const pick of picks) {
    if (pick.candidateId === null) continue;
    const row = rows.get(pick.candidateId);
    if (!row) continue;
    validPicks += 1;
    row.count += 1;
    row.weighted += matched.has(pick.domainId) ? MATCHED_WEIGHT : NORMAL_WEIGHT;
  }

  const tally = [...rows.values()].sort(
    (a, b) => b.weighted - a.weighted || b.count - a.count,
  );

  if (validPicks < MIN_VALID_PICKS) {
    return { tally, validPicks, recommendation: { kind: "insufficient", candidateIds: [] } };
  }

  const top = tally[0].weighted;
  const leaders = tally.filter((r) => r.weighted === top).map((r) => r.candidateId);
  const recommendation: Recommendation =
    leaders.length === 1
      ? { kind: "single", candidateIds: [leaders[0]] }
      : { kind: "tie", candidateIds: leaders };

  return { tally, validPicks, recommendation };
}
