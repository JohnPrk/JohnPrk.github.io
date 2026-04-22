"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, CategorySlug, categoryLabel } from "@/lib/categories";
import type { PostMeta } from "@/lib/posts";

type Filter = "all" | CategorySlug;

export default function PostFeed({ posts }: { posts: PostMeta[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const base =
      filter === "all" ? posts : posts.filter((p) => p.category === filter);
    const needle = q.trim().toLowerCase();
    if (!needle) return base;
    return base.filter((p) => {
      const hay = [
        p.title,
        p.description ?? "",
        (p.tags ?? []).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [posts, filter, q]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: posts.length };
    for (const c of CATEGORIES) m[c.slug] = 0;
    for (const p of posts) m[p.category] = (m[p.category] ?? 0) + 1;
    return m;
  }, [posts]);

  const TABS: { key: Filter; label: string; cat?: CategorySlug }[] = [
    { key: "all", label: "all" },
    ...CATEGORIES.map((c) => ({
      key: c.slug as Filter,
      label: c.label,
      cat: c.slug as CategorySlug,
    })),
  ];

  return (
    <section className="flex flex-col gap-4">
      {/* search bar */}
      <label className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3.5 py-2 backdrop-blur-sm focus-within:border-white/25">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className="shrink-0 text-ink-faint"
          aria-hidden
        >
          <circle
            cx="11"
            cy="11"
            r="7"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="m20 20-3.5-3.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="제목, 설명, 태그 검색…"
          className="w-full bg-transparent font-mono text-[12.5px] text-ink placeholder:text-ink-faint focus:outline-none"
          aria-label="search posts"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="font-mono text-[13px] text-ink-faint hover:text-white"
            aria-label="clear search"
          >
            ×
          </button>
        )}
      </label>

      {/* category tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        {TABS.map((t) => {
          const active = filter === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[12px] transition-all ${
                active
                  ? "border-white/30 bg-white/10 text-white"
                  : "border-white/10 bg-black/30 text-ink-muted hover:border-white/20 hover:text-ink"
              }`}
            >
              {t.cat ? (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  data-cat={t.cat}
                  style={{
                    background:
                      t.cat === "woowacourse"
                        ? "#d97706"
                        : t.cat === "ai"
                        ? "#7c3aed"
                        : "#059669",
                    boxShadow:
                      t.cat === "woowacourse"
                        ? "0 0 8px #d97706"
                        : t.cat === "ai"
                        ? "0 0 8px #7c3aed"
                        : "0 0 8px #059669",
                  }}
                />
              ) : null}
              <span>{t.label}</span>
              <span
                className={`text-[10.5px] ${
                  active ? "text-white/70" : "text-ink-faint"
                }`}
              >
                {counts[t.key] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/10 bg-black/30 p-8 text-center font-mono text-[12px] text-ink-faint">
          {q.trim() ? `"${q.trim()}"에 대한 결과가 없습니다.` : "coming soon."}
        </p>
      ) : (
        <ul className="divide-y divide-white/10">
          {filtered.map((p) => (
            <li key={`${p.category}/${p.slug}`}>
              <Link
                href={`/${p.category}/${p.slug}/`}
                className="group block py-5"
              >
                <div className="mb-1 flex items-center gap-2 font-mono text-[11px] text-ink-muted">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{
                      background:
                        p.category === "woowacourse"
                          ? "#d97706"
                          : p.category === "ai"
                          ? "#7c3aed"
                          : "#059669",
                      boxShadow:
                        p.category === "woowacourse"
                          ? "0 0 8px #d97706"
                          : p.category === "ai"
                          ? "0 0 8px #7c3aed"
                          : "0 0 8px #059669",
                    }}
                  />
                  <span>{categoryLabel(p.category)}</span>
                  <span className="text-ink-faint">·</span>
                  <time>{p.date}</time>
                </div>
                <h3 className="text-[16px] font-semibold tracking-[-0.005em] text-ink group-hover:text-white group-hover:underline">
                  {p.title}
                </h3>
                {p.description ? (
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted">
                    {p.description}
                  </p>
                ) : null}
                {p.tags && p.tags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1 font-mono text-[10.5px] text-ink-faint">
                    {p.tags.slice(0, 5).map((t) => (
                      <span key={t}>#{t}</span>
                    ))}
                  </div>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
