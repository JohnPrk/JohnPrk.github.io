import PostFeed from "@/components/PostFeed";
import { getAllPosts } from "@/lib/posts";

export const metadata = { title: "posts · johnprk" };

export default function PostsPage() {
  const posts = getAllPosts().map(({ content, ...meta }) => meta);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="glass p-6 md:p-8">
        <header className="mb-4 flex items-end justify-between border-b border-white/10 pb-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
              posts
            </p>
            <h1 className="text-xl font-bold tracking-tight">모든 기록.</h1>
          </div>
          <span className="font-mono text-[12px] text-ink-muted">
            {posts.length} posts
          </span>
        </header>
        <PostFeed posts={posts} />
      </div>
    </div>
  );
}
