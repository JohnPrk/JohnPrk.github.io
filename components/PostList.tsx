import Link from "next/link";
import { Post } from "@/lib/posts";
import { categoryLabel } from "@/lib/categories";

export default function PostList({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return (
      <p className="mt-4 rounded-lg border border-dashed border-ink-line p-8 text-center font-mono text-[12px] text-ink-faint">
        수집 중입니다. coming soon.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-white/10">
      {posts.map((p) => (
        <li key={`${p.category}/${p.slug}`}>
          <Link href={`/${p.category}/${p.slug}/`} className="group block py-5">
            <div className="mb-1 flex items-center gap-2 font-mono text-[11px] text-ink-muted">
              <span className="cat-dot" data-cat={p.category} />
              <span>{categoryLabel(p.category)}</span>
              <span className="text-ink-faint">·</span>
              <time>{p.date}</time>
            </div>
            <h3 className="text-[16px] font-semibold tracking-[-0.005em] text-ink group-hover:underline">
              {p.title}
            </h3>
            {p.description ? (
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted">
                {p.description}
              </p>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
