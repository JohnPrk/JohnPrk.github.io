export type CategorySlug = "woowacourse" | "ai" | "dev" | "spring";

export const CATEGORIES: { slug: CategorySlug; label: string }[] = [
  { slug: "woowacourse", label: "우테코" },
  { slug: "ai", label: "AI" },
  { slug: "dev", label: "개발" },
  { slug: "spring", label: "스프링" },
];

export function categoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export function isCategorySlug(v: string): v is CategorySlug {
  return CATEGORIES.some((c) => c.slug === v);
}
