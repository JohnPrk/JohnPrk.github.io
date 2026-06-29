import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "@/components/Markdown";
import { CATEGORIES, categoryLabel, isCategorySlug } from "@/lib/categories";
import { getPost, getPostsByCategory } from "@/lib/posts";

export function generateStaticParams() {
  return CATEGORIES.flatMap((c) =>
    getPostsByCategory(c.slug).map((p) => ({
      category: c.slug,
      slug: p.slug.split("/"),
    }))
  );
}

export default function PostPage({
  params,
}: {
  params: { category: string; slug: string[] };
}) {
  if (!isCategorySlug(params.category)) notFound();
  const post = getPost(params.category, params.slug.join("/"));
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-[760px]">
      <div className="glass px-6 py-8 md:px-10 md:py-10">
        <h1 className="mb-3 text-[28px] font-bold leading-tight tracking-[-0.01em] text-white">
          {post.title}
        </h1>
        <div className="mb-8 flex items-center gap-2 font-mono text-[12px] text-ink-muted">
          <Link
            href={`/${post.category}/`}
            className="inline-flex items-center hover:text-white"
          >
            <span className="cat-dot" data-cat={post.category} />
            {categoryLabel(post.category)}
          </Link>
          <span className="text-ink-faint">·</span>
          <time>{post.date}</time>
        </div>
        <Markdown source={post.content} />
        {post.tags && post.tags.length > 0 ? (
          <div className="mt-10 flex flex-wrap gap-1.5 border-t border-white/10 pt-5 font-mono text-[11px] text-ink-faint">
            {post.tags.map((t) => (
              <span key={t} className="rounded border border-white/10 bg-white/5 px-2 py-0.5">
                #{t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
