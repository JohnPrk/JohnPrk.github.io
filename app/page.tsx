import PostList from "@/components/PostList";
import { getAllPosts } from "@/lib/posts";

export default function Home() {
  const posts = getAllPosts();
  return (
    <section>
      <h1 className="sr-only">전체 글</h1>
      <PostList posts={posts} />
    </section>
  );
}
