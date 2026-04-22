import CategorySection from "@/components/CategorySection";
import GraphHero from "@/components/GraphHero";
import { CATEGORIES, CategorySlug } from "@/lib/categories";
import { getPostsByCategory } from "@/lib/posts";

export default function Home() {
  return (
    <div className="flex flex-col gap-10">
      <GraphHero />
      {CATEGORIES.map((c) => (
        <CategorySection
          key={c.slug}
          category={c.slug as CategorySlug}
          posts={getPostsByCategory(c.slug as CategorySlug).slice(0, 6)}
        />
      ))}
    </div>
  );
}
