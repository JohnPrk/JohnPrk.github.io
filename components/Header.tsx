"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Header() {
  const [zen, setZen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("zen-mode", zen);
    window.dispatchEvent(new CustomEvent("zen:toggle", { detail: zen }));
    return () => {
      // on unmount, ensure we don't leave the body stuck in zen
      document.body.classList.remove("zen-mode");
    };
  }, [zen]);

  return (
    <header className="pointer-events-auto fixed top-4 left-4 right-4 z-[9999] mx-auto flex max-w-5xl items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-3 backdrop-blur-md transition-colors duration-500 md:p-4">
      <Link
        href="/"
        className="group zen-hide flex items-baseline gap-2 font-mono text-[15px] font-semibold tracking-tight"
      >
        <span className="inline-block h-2 w-2 rounded-full bg-cat-dev transition-transform group-hover:scale-110" />
        <span>johnprk</span>
        <span className="hidden text-ink-faint sm:inline">/ blog</span>
      </Link>
      <nav className="flex items-center gap-5 font-mono text-[13px] text-ink-muted">
        <Link
          className="zen-hide transition-colors hover:text-white"
          href="/posts/"
        >
          post
        </Link>
        <Link
          className="zen-hide transition-colors hover:text-white"
          href="/archive/"
        >
          archive
        </Link>
        <Link
          className="zen-hide transition-colors hover:text-white"
          href="/about/"
        >
          about
        </Link>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setZen((v) => !v);
          }}
          aria-pressed={zen}
          aria-label={zen ? "exit observe mode" : "enter observe mode"}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors ${
            zen
              ? "border-amber-300/40 bg-amber-300/10 text-amber-200 hover:border-amber-300/70"
              : "border-white/15 bg-white/5 text-ink-soft hover:border-white/40 hover:text-white"
          }`}
        >
          {zen ? (
            <>
              <span aria-hidden>×</span>
              <span>close</span>
            </>
          ) : (
            <>
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_#fbbf24]"
              />
              <span>Observe</span>
            </>
          )}
        </button>
      </nav>
    </header>
  );
}
