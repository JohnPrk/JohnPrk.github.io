"use client";

import { useEffect, useMemo, useState } from "react";
import Markdown from "@/components/Markdown";
import { CATEGORIES, CategorySlug } from "@/lib/categories";
import {
  clearToken,
  commitPost,
  hasToken,
  setToken,
  verifyToken,
} from "@/lib/github";

const DEFAULT_BODY = `# 제목을 여기에

여기에 본문을 적어주세요. 마크다운(GFM) + 코드블록 하이라이트 지원돼요.

\`\`\`ts
export const hello = (name: string) => \`Hello, \${name}!\`;
\`\`\`
`;

function todayISO() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [login, setLogin] = useState<string | null>(null);
  const [pat, setPat] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState<CategorySlug>("dev");
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [body, setBody] = useState(DEFAULT_BODY);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!hasToken()) return;
    verifyToken()
      .then((u) => {
        setAuthed(true);
        setLogin(u.login);
      })
      .catch(() => {
        clearToken();
        setAuthed(false);
      });
  }, []);

  useEffect(() => {
    if (!slug) setSlug(slugify(title));
  }, [title, slug]);

  const frontmatter = useMemo(() => {
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const lines = [
      "---",
      `title: ${JSON.stringify(title || "제목 없음")}`,
      `date: ${date}`,
      description ? `description: ${JSON.stringify(description)}` : null,
      tagList.length ? `tags: [${tagList.map((t) => JSON.stringify(t)).join(", ")}]` : null,
      "---",
    ].filter(Boolean);
    return lines.join("\n");
  }, [title, date, description, tags]);

  const fullFile = `${frontmatter}\n\n${body}\n`;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    try {
      setToken(pat.trim());
      const u = await verifyToken();
      setAuthed(true);
      setLogin(u.login);
      setPat("");
    } catch (err) {
      clearToken();
      setAuthError((err as Error).message);
    }
  }

  function handleLogout() {
    clearToken();
    setAuthed(false);
    setLogin(null);
  }

  async function handlePublish() {
    setSaveMsg(null);
    if (!title.trim()) {
      setSaveMsg("제목을 입력해주세요.");
      return;
    }
    const finalSlug = slug || slugify(title);
    if (!finalSlug) {
      setSaveMsg("슬러그를 만들 수 없어요. 영문/숫자로 슬러그를 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const { htmlUrl } = await commitPost({
        category,
        slug: finalSlug,
        contents: fullFile,
        message: `post(${category}): ${title}`,
      });
      setSaveMsg(`✅ 저장됨. 곧 사이트에 반영돼요. ${htmlUrl}`);
    } catch (err) {
      setSaveMsg(`❌ ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  if (!authed) {
    return (
      <section className="mx-auto max-w-md">
        <h1 className="mb-2 text-xl font-semibold">write</h1>
        <p className="mb-4 text-sm text-ink-muted">
          GitHub Personal Access Token으로 로그인해주세요. (repo 권한 필요)
          <br />
          <a
            className="underline"
            href="https://github.com/settings/tokens/new?scopes=repo&description=johnprk-blog-admin"
            target="_blank"
            rel="noreferrer"
          >
            토큰 만들기 →
          </a>
        </p>
        <form onSubmit={handleLogin} className="flex flex-col gap-2">
          <input
            type="password"
            placeholder="ghp_..."
            value={pat}
            onChange={(e) => setPat(e.target.value)}
            className="rounded border border-ink-line px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-ink px-3 py-2 text-sm text-white hover:bg-ink-soft"
          >
            로그인
          </button>
          {authError ? <p className="text-xs text-red-600">{authError}</p> : null}
        </form>
      </section>
    );
  }

  return (
    <section className="-mx-5 px-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-ink-muted">
          @{login} 로그인됨 ·{" "}
          <button onClick={handleLogout} className="underline hover:text-ink">
            로그아웃
          </button>
        </div>
        <button
          onClick={handlePublish}
          disabled={saving}
          className="rounded bg-ink px-4 py-2 text-sm text-white hover:bg-ink-soft disabled:opacity-50"
        >
          {saving ? "저장 중..." : "publish"}
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <input
          className="col-span-2 rounded border border-ink-line px-3 py-2 text-sm"
          placeholder="제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select
          className="rounded border border-ink-line px-3 py-2 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value as CategorySlug)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="rounded border border-ink-line px-3 py-2 text-sm"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          className="col-span-2 rounded border border-ink-line px-3 py-2 text-sm"
          placeholder="slug (영문, 비우면 제목에서 자동 생성)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <input
          className="col-span-2 rounded border border-ink-line px-3 py-2 text-sm"
          placeholder="tags (쉼표로 구분)"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <input
          className="col-span-4 rounded border border-ink-line px-3 py-2 text-sm"
          placeholder="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <textarea
          className="h-[70vh] w-full resize-none rounded border border-ink-line p-3 font-mono text-sm leading-6"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          spellCheck={false}
        />
        <div className="h-[70vh] overflow-auto rounded border border-ink-line bg-white p-5">
          <Markdown source={body} />
        </div>
      </div>

      {saveMsg ? (
        <p className="mt-4 break-all text-sm">
          {saveMsg}
        </p>
      ) : null}
    </section>
  );
}
