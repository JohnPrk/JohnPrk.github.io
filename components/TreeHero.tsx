import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { getAllPosts } from "@/lib/posts";

type Leaf = { label: string; t: number; off: number; size?: number };
type Branch = {
  cat: "dev" | "ai" | "woowacourse";
  label: string;
  color: string;
  end: { x: number; y: number };
  ctrl: { x: number; y: number };
  leaves: Leaf[];
};

const ROOT = { x: 400, y: 460 };
const FORK = { x: 400, y: 300 };

const BRANCHES: Branch[] = [
  {
    cat: "dev",
    label: "dev",
    color: "#059669",
    end: { x: 720, y: 110 },
    ctrl: { x: 580, y: 170 },
    leaves: [
      { label: "backend", t: 0.32, off: 34 },
      { label: "java", t: 0.5, off: -28, size: 1.1 },
      { label: "spring", t: 0.66, off: 30 },
      { label: "aws", t: 0.82, off: -32 },
      { label: "infra", t: 0.94, off: 22 },
    ],
  },
  {
    cat: "ai",
    label: "ai",
    color: "#7c3aed",
    end: { x: 400, y: 50 },
    ctrl: { x: 430, y: 170 },
    leaves: [
      { label: "llm", t: 0.35, off: 30, size: 1.2 },
      { label: "prompt", t: 0.55, off: -28 },
      { label: "agent", t: 0.72, off: 26 },
      { label: "claude", t: 0.88, off: -24 },
      { label: "tooling", t: 0.98, off: 20 },
    ],
  },
  {
    cat: "woowacourse",
    label: "woowa",
    color: "#d97706",
    end: { x: 80, y: 110 },
    ctrl: { x: 220, y: 170 },
    leaves: [
      { label: "tdd", t: 0.34, off: -32, size: 1.15 },
      { label: "oop", t: 0.5, off: 28 },
      { label: "refactor", t: 0.66, off: -30 },
      { label: "review", t: 0.82, off: 28 },
      { label: "pair", t: 0.94, off: -22 },
    ],
  },
];

function quad(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  t: number
) {
  const u = 1 - t;
  const x = u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x;
  const y = u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y;
  const dx = 2 * u * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const dy = 2 * u * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  const len = Math.hypot(dx, dy) || 1;
  return { x, y, nx: -dy / len, ny: dx / len };
}

export default function TreeHero() {
  const posts = getAllPosts();
  const total = posts.length;

  return (
    <section className="relative overflow-hidden rounded-xl border border-ink-line">
      <div className="relative grid gap-0 md:grid-cols-[1fr_auto]">
        <div className="order-2 p-5 md:order-1 md:p-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
            yggdrasil · {new Date().getFullYear()}
          </p>
          <h1 className="mt-2 text-[22px] font-bold leading-tight tracking-[-0.01em] md:text-[26px]">
            a garden of code, ideas, and AI.
            <br />
            <span className="text-ink-muted">
              growing one post at a time.
            </span>
          </h1>
          <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-ink-soft">
            backend 개발자 박민욱의 블로그. 우아한테크코스에서 배운 것,
            실무에서 마주친 문제, AI와 함께 만드는 것들을 기록합니다.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[12px] text-ink-muted">
            <span>{total} leaves</span>
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

        <div className="order-1 h-[300px] w-full md:order-2 md:h-[360px] md:w-[500px]">
          <svg
            viewBox="0 0 800 500"
            className="h-full w-full"
            preserveAspectRatio="xMidYMid slice"
            role="img"
            aria-label="knowledge tree"
          >
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fef9c3" />
                <stop offset="55%" stopColor="#ecfccb" />
                <stop offset="100%" stopColor="#d9f99d" />
              </linearGradient>
              <radialGradient id="sun" cx="78%" cy="22%" r="40%">
                <stop offset="0%" stopColor="#fde68a" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
              </radialGradient>
              <pattern
                id="dots"
                x="0"
                y="0"
                width="22"
                height="22"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="1" r="0.7" fill="#a3a380" opacity="0.35" />
              </pattern>
              <filter id="leafGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="2.4" />
              </filter>
            </defs>

            <rect width="800" height="500" fill="url(#sky)" />
            <rect width="800" height="500" fill="url(#dots)" />
            <rect width="800" height="500" fill="url(#sun)" />

            {/* distant ground glow */}
            <ellipse cx="400" cy="470" rx="260" ry="18" fill="#84cc16" opacity="0.18" />

            {/* trunk */}
            <path
              d={`M ${ROOT.x - 14} ${ROOT.y} C ${ROOT.x - 8} ${ROOT.y - 60}, ${
                ROOT.x - 6
              } ${FORK.y + 40}, ${FORK.x - 6} ${FORK.y} L ${FORK.x + 6} ${FORK.y} C ${
                ROOT.x + 6
              } ${FORK.y + 40}, ${ROOT.x + 8} ${ROOT.y - 60}, ${ROOT.x + 14} ${ROOT.y} Z`}
              fill="#5b4636"
            />

            {/* roots */}
            <g stroke="#5b4636" strokeWidth="3" fill="none" opacity="0.8" strokeLinecap="round">
              <path d={`M ${ROOT.x} ${ROOT.y} C 360 475, 320 482, 300 490`} />
              <path d={`M ${ROOT.x} ${ROOT.y} C 440 475, 480 482, 500 490`} />
              <path d={`M ${ROOT.x} ${ROOT.y} C 390 478, 370 490, 360 498`} />
              <path d={`M ${ROOT.x} ${ROOT.y} C 410 478, 430 490, 440 498`} />
            </g>

            {/* branches */}
            {BRANCHES.map((b) => (
              <g key={b.cat}>
                <path
                  d={`M ${FORK.x} ${FORK.y} Q ${b.ctrl.x} ${b.ctrl.y} ${b.end.x} ${b.end.y}`}
                  stroke="#5b4636"
                  strokeWidth="4.5"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d={`M ${FORK.x} ${FORK.y} Q ${b.ctrl.x} ${b.ctrl.y} ${b.end.x} ${b.end.y}`}
                  stroke="#8b6f4e"
                  strokeWidth="1.2"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.8"
                />
              </g>
            ))}

            {/* leaves + labels */}
            {BRANCHES.flatMap((b) =>
              b.leaves.map((leaf, i) => {
                const p = quad(FORK, b.ctrl, b.end, leaf.t);
                const lx = p.x + p.nx * leaf.off;
                const ly = p.y + p.ny * leaf.off;
                const r = 5.5 * (leaf.size ?? 1);
                const delay = ((b.cat.length + i * 173) % 3000) / 1000;
                return (
                  <g
                    key={`${b.cat}-${leaf.label}`}
                    style={{
                      animation: `nodeFloat 6s ease-in-out ${delay}s infinite`,
                    }}
                  >
                    {/* twig */}
                    <line
                      x1={p.x}
                      y1={p.y}
                      x2={lx}
                      y2={ly}
                      stroke="#8b6f4e"
                      strokeWidth="1"
                      opacity="0.7"
                    />
                    {/* glow */}
                    <circle cx={lx} cy={ly} r={r + 3} fill={b.color} opacity="0.25" filter="url(#leafGlow)" />
                    {/* leaf */}
                    <circle cx={lx} cy={ly} r={r} fill={b.color} stroke="#fff" strokeWidth="1.4" />
                    {/* label */}
                    <text
                      x={lx + (leaf.off >= 0 ? r + 4 : -(r + 4))}
                      y={ly + 3}
                      textAnchor={leaf.off >= 0 ? "start" : "end"}
                      fontFamily="JetBrains Mono, monospace"
                      fontSize="10.5"
                      fill="#3f3f1f"
                    >
                      {leaf.label}
                    </text>
                  </g>
                );
              })
            )}

            {/* branch category labels at tips */}
            {BRANCHES.map((b) => (
              <g key={`tip-${b.cat}`}>
                <circle cx={b.end.x} cy={b.end.y} r="9" fill={b.color} stroke="#fff" strokeWidth="2" />
                <text
                  x={b.end.x}
                  y={b.end.y - 14}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="11"
                  fontWeight="600"
                  fill="#2a2a2d"
                >
                  {b.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
}
