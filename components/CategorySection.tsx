import Link from "next/link";
import PostCard from "./PostCard";
import { Post } from "@/lib/posts";
import { categoryLabel, CategorySlug } from "@/lib/categories";

export default function CategorySection({
  category,
  posts,
  total,
}: {
  category: CategorySlug;
  posts: Post[];
  total?: number;
}) {
  const dotColor =
    category === "woowacourse"
      ? "#d97706"
      : category === "ai"
      ? "#7c3aed"
      : category === "spring"
      ? "#06b6d4"
      : "#059669";
  return (
    <section className="glass p-5 md:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-white/10 pb-3">
        <h2 className="flex items-baseline gap-2 font-mono text-[13px] text-ink-soft">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{
              background: dotColor,
              boxShadow: `0 0 8px ${dotColor}`,
            }}
          />
          <span className="text-[15px] font-semibold text-ink">
            {categoryLabel(category)}
          </span>
          <span className="text-ink-faint">·</span>
          <span className="text-ink-faint">{total ?? posts.length} posts</span>
        </h2>
        <Link
          href={`/${category}/`}
          className="font-mono text-[12px] text-ink-muted transition-colors hover:text-white"
        >
          view all →
        </Link>
      </div>
      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-black/30 p-8 text-center font-mono text-[12px] text-ink-faint">
          coming soon.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {posts.map((p) => (
            <PostCard
              key={`${p.category}/${p.slug}`}
              post={p}
            />
          ))}
        </div>
      )}
    </section>
  );
}
