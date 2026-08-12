import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

const CONTENT_DIR = path.join(process.cwd(), "content");

export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  summary?: string;
};

export type Post = PostMeta & {
  html: string;
};

/** content/ 안의 마크다운 파일 이름 목록. 파일 이름이 곧 slug가 된다. */
export async function getPostSlugs(): Promise<string[]> {
  const entries = await fs.readdir(CONTENT_DIR, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name.replace(/\.md$/, ""));
}

/** 파일 맨 위의 front matter를 읽고 본문을 HTML로 바꾼다. */
export async function getPost(slug: string): Promise<Post> {
  const raw = await fs.readFile(path.join(CONTENT_DIR, `${slug}.md`), "utf8");
  const { data, content } = matter(raw);

  const processed = await remark().use(remarkGfm).use(remarkHtml).process(content);

  return {
    slug,
    title: typeof data.title === "string" ? data.title : slug,
    date: toDateString(data.date),
    summary: typeof data.summary === "string" ? data.summary : undefined,
    html: processed.toString(),
  };
}

/** 목록 화면용. 최신 글이 위로 온다. */
export async function getAllPosts(): Promise<PostMeta[]> {
  const slugs = await getPostSlugs();
  const posts = await Promise.all(slugs.map(getPost));

  return posts
    .map(({ html: _html, ...meta }) => meta)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** YAML은 따옴표 없는 날짜를 Date 객체로 파싱하므로 YYYY-MM-DD 문자열로 통일한다. */
function toDateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value;
  return "";
}

export function formatDate(date: string): string {
  if (!date) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
