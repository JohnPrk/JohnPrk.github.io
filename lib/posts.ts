import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { CATEGORIES, CategorySlug } from "./categories";

export type PostMeta = {
  slug: string;
  category: CategorySlug;
  title: string;
  date: string;
  description?: string;
  tags?: string[];
  thumb?: string;
  num?: number;
};

export type Post = PostMeta & { content: string };

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function walkMd(dir: string, base: string): { abs: string; rel: string }[] {
  const out: { abs: string; rel: string }[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walkMd(abs, rel));
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push({ abs, rel });
  }
  return out;
}

function readCategory(category: CategorySlug): Post[] {
  const dir = path.join(POSTS_DIR, category);
  if (!fs.existsSync(dir)) return [];
  return walkMd(dir, "").map(({ abs, rel }) => {
      const raw = fs.readFileSync(abs, "utf8");
      const { data, content } = matter(raw);
      const slug = rel.replace(/\.md$/, "");
      const rawDate = data.date;
      const date =
        rawDate instanceof Date
          ? rawDate.toISOString().slice(0, 10)
          : typeof rawDate === "string"
          ? rawDate.slice(0, 10)
          : new Date().toISOString().slice(0, 10);
      return {
        slug,
        category,
        title: (data.title ?? slug) as string,
        date,
        description: data.description as string | undefined,
        tags: (data.tags as string[] | undefined) ?? [],
        thumb: data.thumb as string | undefined,
        num: data.num as number | undefined,
        content,
      };
    });
}

export function getAllPosts(): Post[] {
  return CATEGORIES.flatMap((c) => readCategory(c.slug)).sort((a, b) =>
    a.date < b.date ? 1 : -1
  );
}

export function getPostsByCategory(category: CategorySlug): Post[] {
  return readCategory(category).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPost(category: CategorySlug, slug: string): Post | null {
  return readCategory(category).find((p) => p.slug === slug) ?? null;
}
