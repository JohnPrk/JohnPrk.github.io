import Link from "next/link";
import { Post } from "@/lib/posts";
import { categoryLabel } from "@/lib/categories";

export default function PostCard({ post, index }: { post: Post; index: number }) {
  return (
    <Link
      href={`/${post.category}/${post.slug}/`}
      className="post-card group"
      data-cat={post.category}
    >
      <span className="card-num">#{String(index).padStart(3, "0")}</span>
      <div className="flex items-center gap-1.5 font-mono text-[11px] text-ink-muted">
        <span className="cat-dot" data-cat={post.category} />
        <span>{categoryLabel(post.category)}</span>
        <span className="text-ink-faint">·</span>
        <time>{post.date}</time>
      </div>
      <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.005em] text-ink group-hover:underline">
        {post.title}
      </h3>
      {post.description ? (
        <p className="line-clamp-3 text-[13px] leading-relaxed text-ink-muted">
          {post.description}
        </p>
      ) : null}
      {post.tags && post.tags.length > 0 ? (
        <div className="mt-auto flex flex-wrap gap-1 pt-1 font-mono text-[10.5px] text-ink-faint">
          {post.tags.slice(0, 4).map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}
