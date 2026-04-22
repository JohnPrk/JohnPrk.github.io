import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "johnprk",
  description: "우테코 · AI · 개발 기록",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen font-sans antialiased">
        <div className="mx-auto max-w-3xl px-5 pb-24 pt-10">
          <Header />
          <main className="mt-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
