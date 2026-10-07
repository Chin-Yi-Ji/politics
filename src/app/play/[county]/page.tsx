import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { BlindFlow } from "@/components/BlindFlow";
import { getCounties, getCounty, getDomains, getHeat } from "@/lib/data";

export function generateStaticParams() {
  return getCounties().map((c) => ({ county: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/play/[county]">): Promise<Metadata> {
  const county = getCounty((await params).county);
  return county ? { title: `${county.name}長政見盲選` } : {};
}

export default function PlayPage({ params }: PageProps<"/play/[county]">) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-3xl px-4 pt-10 text-muted">載入中…</p>}>
      <Play params={params} />
    </Suspense>
  );
}

async function Play({ params }: { params: Promise<{ county: string }> }) {
  const county = getCounty((await params).county);
  if (!county) notFound();
  if (county.status !== "ready") redirect(`/county/${county.id}`);

  const domains = getDomains().map(({ id, name }) => ({ id, name }));
  return <BlindFlow countyId={county.id} countyName={county.name} domains={domains} heat={getHeat(county.id)} />;
}
