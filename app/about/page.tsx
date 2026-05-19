import Link from "next/link";
import Avatar from "@/components/Avatar";

const projects = [
  {
    name: "패스노트",
    period: "2025.04 – 2025.11",
    role: "백엔드 · 인프라 (기여도 95%)",
    desc:
      "전자책 구매 · 필기 · 실전 모의고사 · 합격 필기 공유를 하나로 묶은 태블릿 학습 플랫폼. 백엔드 로직 전반과 AWS 인프라 설계/운영을 맡았음.",
    highlights: [
      "CloudFront 캐시 적중률 90% · 응답속도 50% 개선",
      "대용량 업로드 대응 — AWS Lambda + ECR 서버리스 전환",
      "앱스토어 도서 인기 14위, 평점 5.0 (71개 리뷰)",
    ],
    stack: ["Java", "Spring", "AWS(EC2, RDS, CloudFront, Lambda, ECR, S3)"],
    link: "https://www.passnote.co.kr",
  },
  {
    name: "방탈출 예약 서비스",
    period: "2024.06 – 2025.01",
    role: "백엔드 · 인프라 (개인)",
    desc:
      "방탈출 테마 검색/예약 MVC 웹앱. 로컬 → AWS 마이그레이션과 테스트 코드 중심의 리팩토링에 집중한 프로젝트.",
    highlights: [
      "NAT Gateway → NAT Instance 전환으로 월 AWS 비용 64% 절감 ($132 → $46)",
      "19개 API · 테스트 87개 · 커버리지 75%",
      "코드리뷰 피드백 136회 반영",
    ],
    stack: ["Java", "Spring", "AWS(EC2, RDS, VPC, CodePipeline)"],
    link: "https://github.com/spring-roomescape-migration",
  },
  {
    name: "(주)월클플레이",
    period: "2023.06 – 2023.12",
    role: "백엔드 개발 · PM 겸무",
    desc:
      "교육자/교육생 분리 회원 도메인과 인증·인가 시스템을 구축. PM 부재 상황에서 프로세스를 잡고 QA 기간을 크게 줄였음.",
    highlights: [
      "Spring Security · NICE 본인인증 · 소셜 로그인",
      "명세 기반 테스트 시나리오로 QA 기간 2주 → 2일 (80% 단축)",
      "기획-개발 공동 유저스토리 프로세스 도입",
    ],
    stack: ["Java", "Spring", "AWS(EC2, RDS, ROUTE53)"],
    link: "https://wcle.co.kr",
  },
];

const stacks = [
  { group: "Backend", items: ["Java", "Spring Boot", "Spring Security", "Spring Data JPA", "Spring MVC", "MySQL", "JUnit5", "RestAssured", "Mockito", "Swagger"] },
  { group: "Infra & DevOps", items: ["AWS(EC2, RDS, S3, CloudFront, Lambda, CloudWatch, VPC, CodePipeline)", "Docker · ECR", "CodePipeline CI/CD"] },
  { group: "Collaboration", items: ["Git · GitHub", "Jira", "Slack · Notion · Figma"] },
];

const certs = [
  "AWS Certified Solutions Architect – Associate (2023.04)",
  "정보처리기사 (2021.11)",
  "SQLD (2021.10)",
];

const education = [
  "우아한테크코스 8기 · 학습 중",
  "학습 테스트로 배우는 Spring 3기 (2024.07 – 2024.10)",
  "ATDD, 클린코드 with Spring 6기 (2023.02 – 2023.03)",
  "인프라공방 (2022.08 – 2022.09)",
  "플레이데이터 부트캠프 (2021.12 – 2022.06)",
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="glass p-6 md:p-8">
      <header className="mb-6 border-b border-white/10 pb-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-faint">
          about
        </p>
        <h1 className="text-xl font-bold tracking-tight">who am i.</h1>
      </header>

      {/* hero */}
      <section className="flex flex-col items-start gap-6 sm:flex-row sm:gap-7">
        <div className="shrink-0">
          <div className="relative h-32 w-32 overflow-hidden rounded-full border border-white/15 bg-white/5">
            <Avatar size={128} alt="박민욱" />
          </div>
          <p className="mt-2 text-center font-mono text-[11px] text-ink-faint">
            박민욱 · 티뉴(우테코)
          </p>
        </div>

        <div className="flex flex-col gap-5 text-[14.5px] leading-[2] text-ink-soft">
          <p>
            현실적인 제약 속에서 최선의 해결책을 찾아가는 일을 좋아합니다.
          </p>
          <p>
            변화를 두려워 하기보다 흔들리지 않는 기본기를 다지고, 그 위에서{" "}
            <span className="font-semibold text-white">AI와 가장 잘 지내는 개발자</span>
            가 되는 것을 목표로 합니다.
          </p>
          <div className="grid grid-cols-[76px_1fr] gap-y-1 font-mono text-[12px] text-ink-muted">
            <span className="text-ink-faint">now</span>
            <span>우아한테크코스 8기 · 백엔드</span>
            <span className="text-ink-faint">focus</span>
            <span>AI 협업 · 객체지향 · 인프라</span>
            <span className="text-ink-faint">stack</span>
            <span>Java · Spring · AWS</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1 font-mono text-[12px]">
            <Link
              href="https://github.com/JohnPrk"
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-white/15 px-2.5 py-1 text-ink-soft hover:border-white/40 hover:text-white"
            >
              github
            </Link>
            <Link
              href="mailto:uo3641493@gmail.com"
              className="rounded-md border border-white/15 px-2.5 py-1 text-ink-soft hover:border-white/40 hover:text-white"
            >
              email
            </Link>
          </div>
        </div>
      </section>

      {/* projects / experience */}
      <section className="mt-10">
        <h2 className="mb-4 font-mono text-[12px] uppercase tracking-[0.18em] text-ink-faint">
          work &amp; experience
        </h2>
        <div className="flex flex-col gap-5">
          {projects.map((p) => (
            <article
              key={p.name}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-5"
            >
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-[16px] font-semibold tracking-tight">
                  {p.link ? (
                    <Link
                      href={p.link}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {p.name}
                    </Link>
                  ) : (
                    p.name
                  )}
                </h3>
                <span className="font-mono text-[11px] text-ink-muted">
                  {p.period}
                </span>
              </header>
              <p className="mt-0.5 font-mono text-[11.5px] text-ink-faint">
                {p.role}
              </p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
                {p.desc}
              </p>
              <ul className="mt-2 space-y-0.5 text-[13px] text-ink-soft">
                {p.highlights.map((h) => (
                  <li key={h} className="before:mr-1.5 before:content-['—']">
                    {h}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-1.5 font-mono text-[10.5px] text-ink-faint">
                {p.stack.map((s) => (
                  <span key={s} className="rounded border border-white/10 bg-white/5 px-2 py-0.5">
                    {s}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* stack */}
      <section className="mt-10">
        <h2 className="mb-3 font-mono text-[12px] uppercase tracking-[0.18em] text-ink-faint">
          stack
        </h2>
        <div className="flex flex-col gap-2">
          {stacks.map((s) => (
            <div
              key={s.group}
              className="grid grid-cols-[120px_1fr] gap-3 border-b border-white/10 py-2 last:border-b-0"
            >
              <span className="font-mono text-[12px] text-ink-muted">
                {s.group}
              </span>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px] text-ink-soft">
                {s.items.map((i) => (
                  <span key={i} className="rounded border border-white/10 bg-white/5 px-2 py-0.5">
                    {i}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* certs & education */}
      <section className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 font-mono text-[12px] uppercase tracking-[0.18em] text-ink-faint">
            certs
          </h2>
          <ul className="space-y-1 text-[13.5px] text-ink-soft">
            {certs.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-mono text-[12px] uppercase tracking-[0.18em] text-ink-faint">
            education
          </h2>
          <ul className="space-y-1 text-[13.5px] text-ink-soft">
            {education.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      </section>
      </div>
    </div>
  );
}
