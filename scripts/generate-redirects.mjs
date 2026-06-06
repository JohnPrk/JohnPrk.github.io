// 정적 export(out/)에 옛 경로 -> 새 경로 redirect stub(meta refresh)을 생성한다.
// GitHub Pages는 정적 호스팅이라 next.config의 redirects()가 동작하지 않으므로,
// 빌드 후 이 스크립트가 redirects.json을 읽어 옛 경로에 index.html을 만든다.
// 글을 다른 카테고리로 옮길 때 redirects.json에 { from, to } 한 줄만 추가하면 된다.

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SITE = "https://johnprk.github.io";
const OUT = "out";

const redirects = JSON.parse(readFileSync("redirects.json", "utf8"));

for (const { from, to } of redirects) {
  const target = to.startsWith("http") ? to : SITE + to;
  const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=${to}" />
    <link rel="canonical" href="${target}" />
    <meta name="robots" content="noindex" />
    <title>이동되었습니다</title>
    <script>
      location.replace("${to}" + location.search + location.hash);
    </script>
  </head>
  <body>
    이 글은 <a href="${to}">${target}</a>로 이동했습니다.
  </body>
</html>
`;
  const dir = join(OUT, from);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
  console.log(`redirect stub: ${from} -> ${to}`);
}
