"use client";

import { useState } from "react";

export default function Avatar({
  size = 128,
  src = "/avatar.jpg",
  fallback = "/avatar.svg",
  alt = "avatar",
}: {
  size?: number;
  src?: string;
  fallback?: string;
  alt?: string;
}) {
  const [current, setCurrent] = useState(src);
  return (
    <img
      src={current}
      alt={alt}
      width={size}
      height={size}
      className="h-full w-full object-cover"
      onError={() => {
        if (current !== fallback) setCurrent(fallback);
      }}
    />
  );
}
