import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ThreeTree from "@/components/ThreeTree";
import { getKeywordHits } from "@/lib/keywords";

export const metadata: Metadata = {
  title: "johnprk — 공부 기록",
  description: "AI, 우테코, 개발을 공부하는 기록. — johnprk",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const keywords = getKeywordHits();
  return (
    <html lang="ko">
      <body className="min-h-screen overflow-x-hidden bg-transparent font-sans text-ink antialiased">
        <ThreeTree keywords={keywords} />
        <div className="relative z-0 mx-auto w-full max-w-6xl px-4 pb-16 pt-5 sm:px-6 md:pt-7">
          <Header />
          <main className="zen-hide mt-7 md:mt-10">{children}</main>
          <div className="zen-hide">
            <Footer />
          </div>
        </div>
      </body>
    </html>
  );
}
