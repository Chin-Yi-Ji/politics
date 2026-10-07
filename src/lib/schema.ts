import { z } from "zod";

export const MAX_POINTS = 5;
export const MAX_POINT_CHARS = 60;
export const MAX_SUMMARY_CHARS = 220;

export const originalSchema = z.object({
  quote: z.string().min(1),
  sourceUrl: z.url(),
  sourceType: z.enum(["bulletin", "official", "forum", "media"]),
  capturedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const cardSchema = z
  .object({
    id: z.string().min(1),
    candidateId: z.string().min(1),
    domainId: z.string().min(1),
    points: z.array(z.string().min(1).max(MAX_POINT_CHARS)).min(1).max(MAX_POINTS),
    strictPoints: z.array(z.string().min(1).max(MAX_POINT_CHARS)).min(1).max(MAX_POINTS).optional(),
    status: z.enum(["published", "held"]),
    heldReason: z.string().optional(),
    originals: z.array(originalSchema).min(1),
  })
  .refine((c) => c.points.join("").length <= MAX_SUMMARY_CHARS, {
    message: `摘要合計不可超過 ${MAX_SUMMARY_CHARS} 字`,
  })
  .refine(
    (c) => {
      const media = c.originals.filter((o) => o.sourceType === "media").length;
      const mixed = media > 0 && media < c.originals.length;
      return mixed ? c.strictPoints !== undefined : c.strictPoints === undefined;
    },
    { message: "同時引用第一手來源與新聞報導的卡必須附 strictPoints，其他卡不可以有" },
  );

export const policyFileSchema = z.object({
  countyId: z.string().min(1),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().optional(),
  cards: z.array(cardSchema),
});
