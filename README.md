# johnprk.github.io

개인 블로그. Next.js + GitHub Pages.

## 카테고리
- 우테코 (`woowacourse`)
- AI (`ai`)
- 개발 (`dev`)

## 로컬 개발
```bash
npm install
npm run dev
```
- `http://localhost:3000` → 블로그
- `http://localhost:3000/admin` → 에디터

## 글쓰기
1. `/admin` 접속
2. GitHub Personal Access Token(`repo` 스코프)으로 로그인 — 토큰은 브라우저 `localStorage`에만 저장
3. 제목/카테고리/슬러그/본문 입력 → **publish**
4. GitHub Actions가 자동 빌드·배포

## 배포
`main`에 push되면 `.github/workflows/deploy.yml`이 돌면서 Pages로 배포.
