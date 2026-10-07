import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportForm } from "@/components/ReportForm";
import { getCounties, getDomains } from "@/lib/data";

export const metadata: Metadata = { title: "回報遺漏或錯誤" };

export default function ReportPage() {
  const counties = getCounties().map(({ id, name }) => ({ id, name }));
  const domains = getDomains().map(({ id, name }) => ({ id, name }));
  return (
    <div className="mx-auto max-w-2xl px-4 pt-10">
      <h1 className="text-4xl">回報遺漏或錯誤</h1>
      <p className="mt-3">
        候選人有提出政見卻被標成「未提出」，或是摘要和原文不符，都請告訴我們。附上來源網址可以加快處理，48
        小時內會有結果。候選人團隊也可以用這個表單補充資料。
      </p>
      <Suspense>
        <ReportForm counties={counties} domains={domains} />
      </Suspense>
    </div>
  );
}
