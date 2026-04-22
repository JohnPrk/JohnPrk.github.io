import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

export default function Header() {
  return (
    <header className="flex flex-col gap-3 border-b border-ink-line pb-6">
      <Link href="/" className="text-2xl font-bold tracking-tight">
        johnprk
      </Link>
      <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
        <Link className="hover:text-ink" href="/">
          all
        </Link>
        {CATEGORIES.map((c) => (
          <Link key={c.slug} className="hover:text-ink" href={`/${c.slug}/`}>
            {c.label}
          </Link>
        ))}
        <Link className="ml-auto hover:text-ink" href="/admin/">
          write
        </Link>
      </nav>
    </header>
  );
}
