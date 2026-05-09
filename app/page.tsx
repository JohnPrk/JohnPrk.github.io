import Link from "next/link";
import CategorySection from "@/components/CategorySection";
import { CATEGORIES, CategorySlug } from "@/lib/categories";
import { getPostsByCategory, getAllPosts } from "@/lib/posts";

export default function Home() {
  const all = getAllPosts();
  const total = all.length;

  return (
    <div className="flex flex-col gap-10">
      {/* hero (dark glass) */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/45 shadow-2xl backdrop-blur-xl md:mr-[260px]">
        <div className="p-7 md:p-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
            yggdrasil · {new Date().getFullYear()}
          </p>
          <h2 className="mt-3 text-[20px] font-bold leading-tight tracking-[-0.01em] md:text-[25px]">
            흩어지지 않는 경험, 무한히 연결되고 확장되는 지식
          </h2>
          <div className="mt-5 max-w-2xl space-y-4 text-[14px] leading-[1.95] text-ink-soft">
            <p>
              거대하고 끝없이 뻗어나가는 기술 생태계 속에서, 오늘 마주한 문제들을 묵묵히 하나씩 해결해 나갑니다.
              기술의 형태가 끊임없이 변하고 낯선 도구와 복잡한 설계가 쏟아져도, 이를 하나씩 부딪히며 이뤄낸 성취는 결코 흩어지지 않습니다.
              결국 모든 지식과 경험은 단단한 뼈대가 되어 서로 연결되기 때문입니다.
              무한한 세상을 탐험하며, 배움이 하나의 본질에서 만난다는 것을 증명해 나가는 기록입니다.
            </p>
            <p>
              오른쪽 상단의 <strong className="text-white">Observe</strong>를 눌러보시면 3D로 살펴보실 수 있습니다. 블로그에서 다룬 키워드는 노드와 간선 모두 {" "}
              <span className="text-amber-300">노랗게</span> 빛납니다.
            </p>
          </div>
          <div className="mt-6 flex w-max flex-wrap items-center gap-x-4 gap-y-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-mono text-[12.5px] text-ink-muted">
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
                        : c.slug === "spring"
                        ? "#06b6d4"
                        : "#059669",
                    boxShadow:
                      c.slug === "woowacourse"
                        ? "0 0 8px #d97706"
                        : c.slug === "ai"
                        ? "0 0 8px #7c3aed"
                        : c.slug === "spring"
                        ? "0 0 8px #06b6d4"
                        : "0 0 8px #059669",
                  }}
                />
                {c.label} {all.filter((p) => p.category === c.slug).length}
              </Link>
            ))}
            <span className="text-ink-faint">|</span>
            <Link href="/posts/" className="hover:text-white">
              view all →
            </Link>
          </div>
        </div>
      </section>

      {/* category shelves — 3 per category */}
      <div className="flex flex-col gap-10 md:mr-[260px]">
        {CATEGORIES.map((c) => (
          <CategorySection
            key={c.slug}
            category={c.slug as CategorySlug}
            posts={getPostsByCategory(c.slug as CategorySlug).slice(0, 3)}
          />
        ))}
      </div>
    </div>
  );
}
