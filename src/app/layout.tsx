import type { Metadata, Viewport } from "next";
import { PhaseNotice } from "@/components/PhaseNotice";
import { SiteFooter, SiteHeader, SITE_NAME } from "@/components/SiteChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${SITE_NAME}｜2026 縣市長政見盲選與對照`, template: `%s｜${SITE_NAME}` },
  description: "先把候選人的名字蓋起來，只看政見。選完再揭曉你挑的政見是誰提的，並對照 22 縣市所有縣市長候選人的政見。",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant-TW">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&family=Noto+Serif+TC:wght@500;600;900&display=swap"
        />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <SiteHeader />
        <PhaseNotice />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
