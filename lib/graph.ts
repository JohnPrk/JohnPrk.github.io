import { CATEGORIES, CategorySlug } from "./categories";
import { Post } from "./posts";

export type GraphNode = {
  id: string;
  kind: "me" | "category" | "post" | "tag";
  label: string;
  x: number;
  y: number;
  r: number;
  cat?: CategorySlug;
  href?: string;
};

export type GraphEdge = {
  from: string;
  to: string;
  weight: number;
  kind: "backbone" | "tag";
};

const CENTER = { x: 400, y: 200 };
const CAT_ORBIT = 95;
const POST_ORBIT = 178;

const CAT_ANGLES: Record<CategorySlug, number> = {
  dev: 90,
  woowacourse: 210,
  ai: 330,
};

function deg2rad(d: number) {
  return (d * Math.PI) / 180;
}

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

export function buildGraph(allPosts: Post[]): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  nodes.push({
    id: "me",
    kind: "me",
    label: "johnprk",
    x: CENTER.x,
    y: CENTER.y,
    r: 13,
  });

  for (const c of CATEGORIES) {
    const a = deg2rad(CAT_ANGLES[c.slug]);
    const x = CENTER.x + CAT_ORBIT * Math.cos(a);
    const y = CENTER.y - CAT_ORBIT * Math.sin(a);
    nodes.push({
      id: `cat:${c.slug}`,
      kind: "category",
      label: c.label,
      x,
      y,
      r: 9,
      cat: c.slug,
      href: `/${c.slug}/`,
    });
    edges.push({ from: "me", to: `cat:${c.slug}`, weight: 1, kind: "backbone" });
  }

  // posts grouped by category
  const byCat = new Map<CategorySlug, Post[]>();
  for (const c of CATEGORIES) byCat.set(c.slug, []);
  for (const p of allPosts) byCat.get(p.category)!.push(p);

  for (const c of CATEGORIES) {
    const posts = byCat.get(c.slug)!;
    const baseAngle = CAT_ANGLES[c.slug];
    const n = posts.length;
    // spread in a 110° arc facing away from center
    const spread = Math.min(110, 22 + n * 14);
    posts.forEach((p, i) => {
      const t = n === 1 ? 0 : i / (n - 1) - 0.5;
      const a = deg2rad(baseAngle + t * spread);
      const jitter = hash(p.slug);
      const r = POST_ORBIT + (jitter - 0.5) * 30;
      const x = CENTER.x + r * Math.cos(a);
      const y = CENTER.y - r * Math.sin(a);
      const id = `post:${p.category}:${p.slug}`;
      nodes.push({
        id,
        kind: "post",
        label: p.title,
        x,
        y,
        r: 5 + Math.min(3, Math.max(0, (p.content.length - 1500) / 5000) * 2),
        cat: p.category,
        href: `/${p.category}/${p.slug}/`,
      });
      edges.push({ from: `cat:${c.slug}`, to: id, weight: 1, kind: "backbone" });
    });
  }

  // tag edges: if two posts share a tag, draw a weighted edge between them
  const tagMap = new Map<string, string[]>();
  for (const p of allPosts) {
    for (const t of p.tags ?? []) {
      const key = t.toLowerCase();
      if (!tagMap.has(key)) tagMap.set(key, []);
      tagMap.get(key)!.push(`post:${p.category}:${p.slug}`);
    }
  }
  const seen = new Set<string>();
  for (const ids of tagMap.values()) {
    if (ids.length < 2) continue;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const k = [ids[i], ids[j]].sort().join("|");
        if (seen.has(k)) continue;
        seen.add(k);
        edges.push({ from: ids[i], to: ids[j], weight: 0.5, kind: "tag" });
      }
    }
  }

  return { nodes, edges };
}
