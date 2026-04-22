import Link from "next/link";
import { Post } from "@/lib/posts";
import { categoryLabel } from "@/lib/categories";

export default function PostList({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return <p className="mt-6 text-sm text-ink-muted">아직 글이 없어요.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-ink-line">
      {posts.map((p) => (
        <li key={`${p.category}/${p.slug}`} className="py-5">
          <Link href={`/${p.category}/${p.slug}/`} className="group block">
            <div className="mb-1 flex items-center gap-3 text-xs text-ink-muted">
              <span className="rounded bg-ink-bg px-2 py-0.5 text-ink-soft">
                {categoryLabel(p.category)}
              </span>
              <time>{p.date}</time>
            </div>
            <h2 className="text-lg font-semibold group-hover:underline">{p.title}</h2>
            {p.description ? (
              <p className="mt-1 text-sm text-ink-muted">{p.description}</p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
