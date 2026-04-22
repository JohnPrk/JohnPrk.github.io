import Link from "next/link";
import PostFeed from "@/components/PostFeed";
import { CATEGORIES } from "@/lib/categories";
import { getAllPosts } from "@/lib/posts";

export default function Home() {
  const posts = getAllPosts().map(({ content, ...meta }) => meta);
  const total = posts.length;

  return (
    <div className="flex flex-col gap-10">
      {/* hero (dark glass) */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl backdrop-blur-md md:mr-[260px]">
        <div className="p-7 md:p-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
            yggdrasil · {new Date().getFullYear()}
          </p>
          <h1 className="mt-3 text-[24px] font-bold leading-tight tracking-[-0.01em] md:text-[30px]">
            a garden of code, ideas, and AI.
            <br />
            <span className="text-ink-muted">growing one post at a time.</span>
          </h1>
          <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-ink-soft">
            backend 개발자 박민욱의 블로그. 우아한테크코스에서 배운 것, 실무에서
            마주친 문제, AI와 함께 만드는 것들을 기록합니다. 오른쪽 <strong className="text-white">LIVE</strong> 카메라를 드래그해 나무를 살펴보세요 — 내가 글로 쓴 키워드는 노랗게 빛납니다.
          </p>
          <div className="mt-5 flex w-max flex-wrap items-center gap-x-4 gap-y-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-mono text-[12.5px] text-ink-muted">
            <span>{total} leaves</span>
            <span className="text-ink-faint">|</span>
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/${c.slug}/`}
                className="inline-flex items-center gap-1.5 hover:text-white"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{
                    background:
                      c.slug === "woowacourse"
                        ? "#d97706"
                        : c.slug === "ai"
                        ? "#7c3aed"
                        : "#059669",
                    boxShadow:
                      c.slug === "woowacourse"
                        ? "0 0 8px #d97706"
                        : c.slug === "ai"
                        ? "0 0 8px #7c3aed"
                        : "0 0 8px #059669",
                  }}
                />
                {c.label} {posts.filter((p) => p.category === c.slug).length}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* unified post feed */}
      <div className="md:mr-[260px]">
        <PostFeed posts={posts} />
      </div>
    </div>
  );
}
