"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";

export default function Markdown({ source }: { source: string }) {
  return (
    <div className="prose-post">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[
          rehypeSlug,
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
        ]}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
