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
};

export type Post = PostMeta & { content: string };

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

function readCategory(category: CategorySlug): Post[] {
  const dir = path.join(POSTS_DIR, category);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      const { data, content } = matter(raw);
      const slug = f.replace(/\.md$/, "");
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
