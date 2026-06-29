export type CategorySlug = "woowacourse" | "ai" | "token-guardians" | "dev" | "spring" | "java" | "web";

export const CATEGORIES: { slug: CategorySlug; label: string }[] = [
  { slug: "woowacourse", label: "우테코" },
  { slug: "ai", label: "AI" },
  { slug: "token-guardians", label: "토큰 지키미" },
  { slug: "dev", label: "개발" },
  { slug: "spring", label: "스프링" },
  { slug: "java", label: "자바" },
  { slug: "web", label: "웹" },
];

export function categoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export function isCategorySlug(v: string): v is CategorySlug {
  return CATEGORIES.some((c) => c.slug === v);
}
