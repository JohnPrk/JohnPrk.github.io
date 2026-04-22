import { getAllPosts } from "./posts";

// Canonical keyword list that can appear on the tree. Keys are lowercase
// tokens the matcher looks for in post body/tags/title; `label` is what
// we render on the 3D sprite.
export type KeywordDef = {
  label: string;
  patterns: string[]; // lowercase substrings / whole-words that count as a hit
};

export const KEYWORDS: KeywordDef[] = [
  { label: "Java", patterns: ["java"] },
  { label: "Spring", patterns: ["spring"] },
  { label: "Spring Boot", patterns: ["spring boot", "springboot"] },
  { label: "JPA", patterns: ["jpa", "hibernate"] },
  { label: "OOP", patterns: ["oop", "객체지향", "object oriented"] },
  { label: "TDD", patterns: ["tdd", "테스트 주도"] },
  { label: "Clean Code", patterns: ["clean code", "클린 코드", "클린코드"] },
  { label: "Refactoring", patterns: ["refactor", "리팩토링", "리팩터링"] },
  { label: "Design Patterns", patterns: ["design pattern", "디자인 패턴"] },
  { label: "Architecture", patterns: ["architecture", "아키텍처"] },
  { label: "REST API", patterns: ["rest api", "restful", " api "] },
  { label: "Database", patterns: ["database", "데이터베이스"] },
  { label: "MySQL", patterns: ["mysql"] },
  { label: "Redis", patterns: ["redis"] },
  { label: "Kafka", patterns: ["kafka"] },
  { label: "Data Structure", patterns: ["data structure", "자료구조"] },
  { label: "Algorithm", patterns: ["algorithm", "알고리즘"] },
  { label: "System Design", patterns: ["system design", "시스템 설계"] },
  { label: "AI", patterns: [" ai ", " ai,", " ai.", "인공지능"] },
  { label: "LLM", patterns: ["llm", "large language"] },
  { label: "Prompt", patterns: ["prompt", "프롬프트"] },
  { label: "Claude", patterns: ["claude", "클로드"] },
  { label: "Gemini", patterns: ["gemini", "제미나이", "제미니"] },
  { label: "ChatGPT", patterns: ["chatgpt", "gpt"] },
  { label: "Agent", patterns: ["agent", "에이전트"] },
  { label: "RAG", patterns: ["rag", "retrieval augmented"] },
  { label: "Fine-tuning", patterns: ["fine-tuning", "fine tuning", "파인튜닝"] },
  { label: "LangChain", patterns: ["langchain"] },
  { label: "Vector DB", patterns: ["vector db", "vector database", "벡터 db"] },
  { label: "AWS", patterns: ["aws"] },
  { label: "EC2", patterns: ["ec2"] },
  { label: "S3", patterns: ["s3"] },
  { label: "RDS", patterns: ["rds"] },
  { label: "Lambda", patterns: ["lambda"] },
  { label: "CloudFront", patterns: ["cloudfront"] },
  { label: "VPC", patterns: ["vpc"] },
  { label: "Docker", patterns: ["docker"] },
  { label: "Kubernetes", patterns: ["kubernetes", "k8s"] },
  { label: "CI/CD", patterns: ["ci/cd", "ci\u00b7cd"] },
  { label: "GitHub Actions", patterns: ["github actions"] },
  { label: "Linux", patterns: ["linux"] },
  { label: "Network", patterns: ["network", "네트워크"] },
  { label: "OS", patterns: [" os "] },
  { label: "Serverless", patterns: ["serverless", "서버리스"] },
  { label: "Nginx", patterns: ["nginx"] },
  { label: "Terraform", patterns: ["terraform"] },
  { label: "DevOps", patterns: ["devops"] },
  { label: "Git", patterns: [" git ", "github", "git."] },
  { label: "TypeScript", patterns: ["typescript", "타입스크립트"] },
  { label: "Node.js", patterns: ["node.js", "nodejs"] },
  { label: "React", patterns: ["react"] },
  { label: "Python", patterns: ["python", "파이썬"] },
  { label: "Kotlin", patterns: ["kotlin"] },
  { label: "Go", patterns: [" go ", "golang"] },
  { label: "우아한테크코스", patterns: ["우아한테크코스", "우테코"] },
  { label: "Pair", patterns: ["pair program", "페어"] },
  { label: "Code Review", patterns: ["code review", "코드리뷰", "코드 리뷰"] },
  { label: "Security", patterns: ["security", "보안"] },
  { label: "OAuth2", patterns: ["oauth"] },
  { label: "JWT", patterns: ["jwt"] },
  { label: "SOLID", patterns: ["solid"] },
  { label: "DDD", patterns: [" ddd ", "domain driven"] },
  { label: "Agile", patterns: ["agile", "애자일"] },
  { label: "Scrum", patterns: ["scrum", "스크럼"] },
  { label: "Frontend", patterns: ["frontend", "프론트엔드"] },
  { label: "Backend", patterns: ["backend", "백엔드"] },
  { label: "Machine Learning", patterns: ["machine learning", "머신러닝"] },
  { label: "Deep Learning", patterns: ["deep learning", "딥러닝"] },
  { label: "NLP", patterns: ["nlp", "자연어"] },
  { label: "장기", patterns: ["장기"] },
  { label: "블랙잭", patterns: ["블랙잭", "blackjack"] },
  { label: "Canvas", patterns: ["canvas"] },
  { label: "Tooling", patterns: ["tooling"] },
];

export type KeywordHit = {
  label: string;
  count: number;
  postSlugs: string[]; // where it appears
};

export function getKeywordHits(): KeywordHit[] {
  const posts = getAllPosts();
  return KEYWORDS.map((k) => {
    const slugs: string[] = [];
    let total = 0;
    for (const p of posts) {
      const haystack = [
        " " + p.title.toLowerCase() + " ",
        " " + (p.description ?? "").toLowerCase() + " ",
        " " + (p.tags ?? []).join(" ").toLowerCase() + " ",
        " " + p.content.toLowerCase() + " ",
      ].join(" ");
      let n = 0;
      for (const pat of k.patterns) {
        // crude but sufficient: count occurrences of the pattern
        let idx = haystack.indexOf(pat);
        while (idx !== -1) {
          n++;
          idx = haystack.indexOf(pat, idx + pat.length);
        }
      }
      if (n > 0) {
        total += n;
        slugs.push(`${p.category}/${p.slug}`);
      }
    }
    return { label: k.label, count: total, postSlugs: slugs };
  });
}
