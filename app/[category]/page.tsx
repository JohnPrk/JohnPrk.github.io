import { notFound } from "next/navigation";
import PostList from "@/components/PostList";
import { CATEGORIES, categoryLabel, isCategorySlug } from "@/lib/categories";
import { getPostsByCategory } from "@/lib/posts";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export default function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  if (!isCategorySlug(params.category)) notFound();
  const posts = getPostsByCategory(params.category);
  return (
    <section>
      <h1 className="mb-4 text-xl font-semibold">{categoryLabel(params.category)}</h1>
      <PostList posts={posts} />
    </section>
  );
}
