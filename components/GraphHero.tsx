import Link from "next/link";
import { buildGraph } from "@/lib/graph";
import { CATEGORIES } from "@/lib/categories";
import { getAllPosts } from "@/lib/posts";

const CAT_COLOR: Record<string, string> = {
  woowacourse: "#d97706",
  ai: "#7c3aed",
  dev: "#059669",
};

function curvedPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  bend: number
) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const cx = mx + nx * bend;
  const cy = my + ny * bend;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

export default function GraphHero() {
  const posts = getAllPosts();
  const { nodes, edges } = buildGraph(posts);
  const total = posts.length;
  const byNode = new Map(nodes.map((n) => [n.id, n]));

  return (
    <section className="relative overflow-hidden rounded-xl border border-ink-line bg-paper">
      <div className="relative grid gap-0 md:grid-cols-[1fr_auto]">
        <div className="order-2 p-5 md:order-1 md:p-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
            network · {new Date().getFullYear()}
          </p>
          <h1 className="mt-2 text-[22px] font-bold leading-tight tracking-[-0.01em] md:text-[26px]">
            AI 시대를 함께 가는 개발자.
            <br />
            <span className="text-ink-muted">
              공부한 만큼 연결되는 곳.
            </span>
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[12px] text-ink-muted">
            <span>{total} nodes</span>
            <span className="text-ink-faint">·</span>
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/${c.slug}/`}
                className="inline-flex items-center hover:text-ink"
              >
                <span className="cat-dot" data-cat={c.slug} />
                {c.label} {posts.filter((p) => p.category === c.slug).length}
              </Link>
            ))}
          </div>
        </div>

        <div className="order-1 h-[260px] w-full md:order-2 md:h-[320px] md:w-[460px]">
          <svg
            viewBox="0 0 800 400"
            className="h-full w-full"
            preserveAspectRatio="xMidYMid slice"
            role="img"
            aria-label="post network"
          >
            <defs>
              <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ede9fe" stopOpacity="0.55" />
                <stop offset="70%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
              <pattern
                id="gridDots"
                x="0"
                y="0"
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="1" r="0.9" fill="#d4d4dc" />
              </pattern>
              <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="1.2" />
              </filter>
            </defs>

            <rect width="800" height="400" fill="url(#gridDots)" opacity="0.5" />
            <circle cx="400" cy="200" r="200" fill="url(#bgGlow)" />

            {/* tag edges (weighted, curved) */}
            <g opacity="0.55">
              {edges
                .filter((e) => e.kind === "tag")
                .map((e, i) => {
                  const a = byNode.get(e.from);
                  const b = byNode.get(e.to);
                  if (!a || !b) return null;
                  const bend = 22 + ((i * 7) % 18);
                  return (
                    <path
                      key={`tag-${i}`}
                      d={curvedPath(a.x, a.y, b.x, b.y, bend)}
                      stroke="#c7c3d6"
                      strokeWidth="0.6"
                      strokeDasharray="2 3"
                      fill="none"
                    />
                  );
                })}
            </g>

            {/* backbone edges */}
            <g>
              {edges
                .filter((e) => e.kind === "backbone")
                .map((e, i) => {
                  const a = byNode.get(e.from);
                  const b = byNode.get(e.to);
                  if (!a || !b) return null;
                  const cat = a.cat || b.cat;
                  const color = cat ? CAT_COLOR[cat] : "#94a3b8";
                  return (
                    <line
                      key={`bb-${i}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke={color}
                      strokeOpacity="0.5"
                      strokeWidth={b.kind === "category" ? 1.2 : 0.85}
                    />
                  );
                })}
            </g>

            {/* nodes */}
            <g>
              {nodes.map((n, idx) => {
                const color =
                  n.kind === "me"
                    ? "#0f0f10"
                    : n.cat
                    ? CAT_COLOR[n.cat]
                    : "#64748b";
                const label =
                  n.kind === "me"
                    ? "me"
                    : n.kind === "category"
                    ? n.label
                    : null;
                const delay = ((idx * 137) % 3000) / 1000;
                return (
                  <g key={n.id} style={{ animation: `nodeFloat 6s ease-in-out ${delay}s infinite` }}>
                    {n.kind === "post" ? (
                      <circle
                        cx={n.x}
                        cy={n.y}
                        r={n.r + 3}
                        fill={color}
                        opacity="0.18"
                        filter="url(#soft)"
                      />
                    ) : null}
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={n.r}
                      fill={n.kind === "me" ? "#fff" : color}
                      stroke={color}
                      strokeWidth={n.kind === "me" ? 2.2 : 1.4}
                    />
                    {label ? (
                      <text
                        x={n.x}
                        y={n.y + n.r + 14}
                        textAnchor="middle"
                        fontFamily="JetBrains Mono, monospace"
                        fontSize="11"
                        fill="#2a2a2d"
                      >
                        {label}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
