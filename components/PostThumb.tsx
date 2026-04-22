import { CategorySlug } from "@/lib/categories";

const CAT_STYLES: Record<
  CategorySlug,
  { from: string; to: string; accent: string; glyph: string }
> = {
  woowacourse: {
    from: "#fef3c7",
    to: "#fde68a",
    accent: "#d97706",
    glyph: "◆",
  },
  ai: {
    from: "#ede9fe",
    to: "#ddd6fe",
    accent: "#7c3aed",
    glyph: "✦",
  },
  dev: {
    from: "#d1fae5",
    to: "#a7f3d0",
    accent: "#059669",
    glyph: "❖",
  },
};

function hashNum(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export default function PostThumb({
  src,
  category,
  slug,
  title,
  className,
}: {
  src?: string;
  category: CategorySlug;
  slug: string;
  title: string;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={title}
        className={className ?? "h-full w-full object-cover"}
      />
    );
  }
  const s = CAT_STYLES[category];
  const h = hashNum(slug);
  const seed = (n: number) => ((h >> (n * 3)) & 0xff) / 255;
  const orbs = [
    { cx: 30 + seed(0) * 80, cy: 40 + seed(1) * 40, r: 34 + seed(2) * 10 },
    { cx: 160 + seed(3) * 80, cy: 70 + seed(4) * 50, r: 42 + seed(5) * 12 },
    { cx: 90 + seed(6) * 120, cy: 150 + seed(7) * 20, r: 26 + seed(8) * 8 },
  ];
  const gradId = `g-${category}-${slug}`;
  const blurId = `b-${category}-${slug}`;

  return (
    <svg
      viewBox="0 0 320 180"
      className={className ?? "h-full w-full"}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={s.from} />
          <stop offset="100%" stopColor={s.to} />
        </linearGradient>
        <filter id={blurId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      <rect width="320" height="180" fill={`url(#${gradId})`} />
      <g filter={`url(#${blurId})`} opacity="0.55">
        {orbs.map((o, i) => (
          <circle key={i} cx={o.cx} cy={o.cy} r={o.r} fill={s.accent} />
        ))}
      </g>
      <text
        x="18"
        y="32"
        fontFamily="JetBrains Mono, monospace"
        fontSize="11"
        fill={s.accent}
        opacity="0.85"
      >
        {category}
      </text>
      <text
        x="302"
        y="32"
        textAnchor="end"
        fontFamily="JetBrains Mono, monospace"
        fontSize="16"
        fill={s.accent}
        opacity="0.7"
      >
        {s.glyph}
      </text>
    </svg>
  );
}
