"use client";

import { useEffect, useState } from "react";

// counterapi.dev — no signup, simple GET-based counter
// namespace/key is arbitrary but must stay stable across deploys
const NAMESPACE = "johnprk-blog";
const KEY = "visits";

export default function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const alreadyCounted =
      typeof window !== "undefined" &&
      window.sessionStorage.getItem("visited") === "1";

    const url = alreadyCounted
      ? `https://api.counterapi.dev/v1/${NAMESPACE}/${KEY}/`
      : `https://api.counterapi.dev/v1/${NAMESPACE}/${KEY}/up`;

    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j) return;
        const c = typeof j.count === "number" ? j.count : null;
        if (c !== null) {
          setCount(c);
          if (!alreadyCounted) {
            window.sessionStorage.setItem("visited", "1");
          }
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <span className="font-mono text-[11px] text-ink-faint">
      visitors · {count === null ? "—" : count.toLocaleString()}
    </span>
  );
}
