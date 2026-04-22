import Link from "next/link";

export default function Header() {
  return (
    <header className="flex items-center justify-between">
      <Link
        href="/"
        className="group flex items-baseline gap-2 font-mono text-[15px] font-semibold tracking-tight"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-cat-ai transition-transform group-hover:scale-110" />
        <span>johnprk</span>
        <span className="hidden text-ink-faint sm:inline">/ studying</span>
      </Link>
      <nav className="flex items-center gap-5 font-mono text-[13px] text-ink-muted">
        <Link className="hover:text-ink" href="/archive/">
          archive
        </Link>
        <Link className="hover:text-ink" href="/about/">
          about
        </Link>
        <Link
          className="rounded-md border border-ink-line px-2.5 py-1 text-[12px] text-ink-soft hover:border-ink hover:text-ink"
          href="/admin/"
        >
          ✎ write
        </Link>
      </nav>
    </header>
  );
}
