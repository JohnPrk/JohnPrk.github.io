import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "johnprk — 공부 기록",
  description: "AI, 우테코, 개발을 공부하는 기록. — johnprk",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen font-sans text-ink antialiased">
        <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-5 sm:px-6 md:pt-7">
          <Header />
          <main className="mt-7 md:mt-9">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
