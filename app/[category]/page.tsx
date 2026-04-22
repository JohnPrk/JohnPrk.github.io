import { notFound } from "next/navigation";
import PostList from "@/components/PostList";
import { CATEGORIES, categoryLabel, isCategorySlug } from "@/lib/categories";
import { getPostsByCategory } from "@/lib/posts";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export default function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  if (!isCategorySlug(params.category)) notFound();
  const posts = getPostsByCategory(params.category);
  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-2 flex items-end justify-between border-b border-ink-line pb-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
            category
          </p>
          <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="cat-dot" data-cat={params.category} />
            {categoryLabel(params.category)}
          </h1>
        </div>
        <span className="font-mono text-[12px] text-ink-muted">{posts.length} posts</span>
      </header>
      <PostList posts={posts} />
    </div>
  );
}
