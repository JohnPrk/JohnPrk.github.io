import CategorySection from "@/components/CategorySection";
import TreeHero from "@/components/TreeHero";
import { CATEGORIES, CategorySlug } from "@/lib/categories";
import { getPostsByCategory } from "@/lib/posts";

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <TreeHero />
      {CATEGORIES.map((c) => (
        <CategorySection
          key={c.slug}
          category={c.slug as CategorySlug}
          posts={getPostsByCategory(c.slug as CategorySlug).slice(0, 4)}
        />
      ))}
    </div>
  );
}
