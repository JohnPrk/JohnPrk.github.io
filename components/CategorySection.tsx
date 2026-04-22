import Link from "next/link";
import PostCard from "./PostCard";
import { Post } from "@/lib/posts";
import { categoryLabel, CategorySlug } from "@/lib/categories";

export default function CategorySection({
  category,
  posts,
}: {
  category: CategorySlug;
  posts: Post[];
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3 border-b border-ink-line pb-2">
        <h2 className="flex items-baseline gap-2 font-mono text-[13px] text-ink-soft">
          <span className="cat-dot" data-cat={category} />
          <span className="text-[14px] font-semibold text-ink">{categoryLabel(category)}</span>
          <span className="text-ink-faint">·</span>
          <span className="text-ink-faint">{posts.length} posts</span>
        </h2>
        <Link
          href={`/${category}/`}
          className="font-mono text-[12px] text-ink-muted hover:text-ink"
        >
          view all →
        </Link>
      </div>
      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink-line p-8 text-center font-mono text-[12px] text-ink-faint">
          수집 중입니다. coming soon.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => (
            <PostCard key={`${p.category}/${p.slug}`} post={p} index={posts.length - i} />
          ))}
        </div>
      )}
    </section>
  );
}
