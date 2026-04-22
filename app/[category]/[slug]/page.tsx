import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "@/components/Markdown";
import { CATEGORIES, categoryLabel, isCategorySlug } from "@/lib/categories";
import { getPost, getPostsByCategory } from "@/lib/posts";

export function generateStaticParams() {
  return CATEGORIES.flatMap((c) =>
    getPostsByCategory(c.slug).map((p) => ({ category: c.slug, slug: p.slug }))
  );
}

export default function PostPage({
  params,
}: {
  params: { category: string; slug: string };
}) {
  if (!isCategorySlug(params.category)) notFound();
  const post = getPost(params.category, params.slug);
  if (!post) notFound();

  return (
    <article>
      <div className="mb-4 flex items-center gap-3 text-xs text-ink-muted">
        <Link
          href={`/${post.category}/`}
          className="rounded bg-ink-bg px-2 py-0.5 text-ink-soft hover:text-ink"
        >
          {categoryLabel(post.category)}
        </Link>
        <time>{post.date}</time>
      </div>
      <h1 className="mb-8 text-2xl font-bold">{post.title}</h1>
      <Markdown source={post.content} />
    </article>
  );
}
