import Link from "next/link";

export default function Header() {
  return (
    <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-3 backdrop-blur-md md:mr-[260px] md:p-4">
      <Link
        href="/"
        className="group flex items-baseline gap-2 font-mono text-[15px] font-semibold tracking-tight"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-cat-dev transition-transform group-hover:scale-110" />
        <span>johnprk</span>
        <span className="hidden text-ink-faint sm:inline">/ blog</span>
      </Link>
      <nav className="flex items-center gap-5 font-mono text-[13px] text-ink-muted">
        <Link className="transition-colors hover:text-white" href="/">
          post
        </Link>
        <Link className="transition-colors hover:text-white" href="/archive/">
          archive
        </Link>
        <Link className="transition-colors hover:text-white" href="/about/">
          about
        </Link>
      </nav>
    </header>
  );
}
