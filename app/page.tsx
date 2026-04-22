import CategorySection from "@/components/CategorySection";
import { CATEGORIES, CategorySlug } from "@/lib/categories";
import { getAllPosts, getPostsByCategory } from "@/lib/posts";

export default function Home() {
  const all = getAllPosts();
  const total = all.length;
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex flex-col gap-10">
      <section className="relative overflow-hidden rounded-xl border border-ink-line bg-paper p-6 md:p-8">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
            collection · {currentYear}
          </p>
          <h1 className="text-2xl font-bold leading-tight tracking-[-0.01em] md:text-[28px]">
            공부한 만큼 모이는 곳.
            <br />
            <span className="text-ink-muted">studying ai, and everything around it.</span>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[12px] text-ink-muted">
            <span>{total} posts</span>
            <span className="text-ink-faint">·</span>
            {CATEGORIES.map((c) => (
              <span key={c.slug} className="inline-flex items-center">
                <span className="cat-dot" data-cat={c.slug} />
                {c.label} {getPostsByCategory(c.slug).length}
              </span>
            ))}
          </div>
        </div>
      </section>

      {CATEGORIES.map((c) => (
        <CategorySection
          key={c.slug}
          category={c.slug as CategorySlug}
          posts={getPostsByCategory(c.slug as CategorySlug).slice(0, 6)}
        />
      ))}
    </div>
  );
}
