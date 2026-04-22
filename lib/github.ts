"use client";

const OWNER = "johnprk";
const REPO = "johnprk.github.io";
const BRANCH = "main";

const API = "https://api.github.com";

function token(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("gh_pat");
}

export function setToken(t: string) {
  localStorage.setItem("gh_pat", t);
}

export function clearToken() {
  localStorage.removeItem("gh_pat");
}

export function hasToken(): boolean {
  return !!token();
}

async function ghFetch(path: string, init: RequestInit = {}) {
  const t = token();
  if (!t) throw new Error("No GitHub token set");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${t}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${res.status}: ${body}`);
  }
  return res.json();
}

export async function verifyToken(): Promise<{ login: string }> {
  return ghFetch("/user");
}

export async function getFileSha(path: string): Promise<string | null> {
  try {
    const t = token();
    if (!t) throw new Error("No GitHub token set");
    const res = await fetch(
      `${API}/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${t}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    const data = await res.json();
    return data.sha ?? null;
  } catch {
    return null;
  }
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

export async function commitPost(params: {
  category: string;
  slug: string;
  contents: string;
  message: string;
}): Promise<{ htmlUrl: string; path: string }> {
  const path = `content/posts/${params.category}/${params.slug}.md`;
  const sha = await getFileSha(path);
  const body = {
    message: params.message,
    content: utf8ToBase64(params.contents),
    branch: BRANCH,
    ...(sha ? { sha } : {}),
  };
  const data = await ghFetch(
    `/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`,
    { method: "PUT", body: JSON.stringify(body) }
  );
  return { htmlUrl: data.content?.html_url ?? "", path };
}
