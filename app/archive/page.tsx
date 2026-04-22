import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { categoryLabel } from "@/lib/categories";

export default function ArchivePage() {
  const posts = getAllPosts();

  const byYear = new Map<string, typeof posts>();
  for (const p of posts) {
    const y = p.date.slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(p);
  }
  const years = Array.from(byYear.keys()).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex items-end justify-between border-b border-ink-line pb-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
            archive
          </p>
          <h1 className="text-xl font-bold tracking-tight">언제 무엇을 썼는지.</h1>
        </div>
        <span className="font-mono text-[12px] text-ink-muted">{posts.length} posts</span>
      </header>

      {years.map((year) => (
        <section key={year} className="mb-8">
          <h2 className="mb-2 font-mono text-[28px] font-bold text-ink">{year}</h2>
          <ul>
            {byYear.get(year)!.map((p) => (
              <li key={`${p.category}/${p.slug}`}>
                <Link
                  href={`/${p.category}/${p.slug}/`}
                  className="archive-row group"
                >
                  <time className="font-mono text-[12px] text-ink-muted">
                    {p.date}
                  </time>
                  <span className="archive-title text-[14.5px] leading-snug group-hover:underline">
                    {p.title}
                  </span>
                  <span
                    className="rounded bg-ink-bg px-2 py-0.5 font-mono text-[10.5px] text-ink-soft"
                    data-cat={p.category}
                  >
                    <span className="cat-dot" data-cat={p.category} />
                    {categoryLabel(p.category)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
