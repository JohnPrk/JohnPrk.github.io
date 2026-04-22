import Image from "next/image";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6 border-b border-ink-line pb-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
          about
        </p>
        <h1 className="text-xl font-bold tracking-tight">who am i.</h1>
      </header>

      <section className="flex flex-col items-start gap-6 sm:flex-row sm:gap-7">
        <div className="shrink-0">
          <div className="relative h-28 w-28 overflow-hidden rounded-full border border-ink-line bg-ink-bg">
            {/* 프로필 이미지를 /public/avatar.jpg 로 올리면 자동 적용됩니다 */}
            <Image
              src="/avatar.svg"
              alt="avatar"
              width={112}
              height={112}
              className="h-full w-full object-cover"
              unoptimized
            />
          </div>
          <p className="mt-2 text-center font-mono text-[11px] text-ink-faint">
            JohnPrk / 민욱
          </p>
        </div>

        <div className="flex flex-col gap-4 text-[14.5px] leading-relaxed text-ink-soft">
          <p>
            떡볶이를 팔다 개발자가 됐고, 지금은{" "}
            <span className="font-semibold text-ink">우아한테크코스</span>
            에서 객체지향과 씨름하고 있습니다. <br />
            <span className="text-ink-muted">AI로 빠르게 만드는 것보다, 스스로 이해해서 만드는 쪽을 좋아합니다.</span>
          </p>
          <div className="grid grid-cols-[80px_1fr] gap-y-1 font-mono text-[12px] text-ink-muted">
            <span className="text-ink-faint">now</span>
            <span>우아한테크코스 8기 · 학습 중</span>
            <span className="text-ink-faint">focus</span>
            <span>객체지향 · AI · 기록</span>
            <span className="text-ink-faint">before</span>
            <span>떡볶이 · 파이썬 · ML/DL 공부</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 font-mono text-[12px]">
            <Link
              href="https://github.com/JohnPrk"
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-ink-line px-2.5 py-1 text-ink-soft hover:border-ink hover:text-ink"
            >
              github
            </Link>
            <Link
              href="https://uo3641493.tistory.com/"
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-ink-line px-2.5 py-1 text-ink-soft hover:border-ink hover:text-ink"
            >
              old blog (tistory)
            </Link>
            <Link
              href="mailto:uo3641493@gmail.com"
              className="rounded-md border border-ink-line px-2.5 py-1 text-ink-soft hover:border-ink hover:text-ink"
            >
              email
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-10 border-t border-ink-line pt-6">
        <h2 className="mb-3 font-mono text-[12px] uppercase tracking-[0.18em] text-ink-faint">
          관심사
        </h2>
        <ul className="grid grid-cols-1 gap-2 text-[14px] text-ink-soft sm:grid-cols-2">
          <li>
            <span className="font-mono text-[11px] text-ink-faint">01.</span>{" "}
            <strong className="font-semibold text-ink">AI</strong> — LLM이 어떻게 맥락을 유지하는지, 왜 특정 표현에 민감한지.
          </li>
          <li>
            <span className="font-mono text-[11px] text-ink-faint">02.</span>{" "}
            <strong className="font-semibold text-ink">객체지향</strong> — 책임을 어디에 둘지 매번 다시 묻기.
          </li>
          <li>
            <span className="font-mono text-[11px] text-ink-faint">03.</span>{" "}
            <strong className="font-semibold text-ink">기록</strong> — 지금의 생각과 과거의 생각을 비교할 수 있게.
          </li>
          <li>
            <span className="font-mono text-[11px] text-ink-faint">04.</span>{" "}
            <strong className="font-semibold text-ink">느린 학습</strong> — 쉽게 배운 건 쉽게 잊히니까.
          </li>
        </ul>
      </section>
    </div>
  );
}
