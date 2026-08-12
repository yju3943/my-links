import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

const CONTENT_DIR = path.join(process.cwd(), "content");

export const KINDS = ["헬스", "수영", "러닝"] as const;
export const INTENSITIES = ["낮음", "보통", "높음"] as const;
export const FEELINGS = ["힘들었다", "할만했다", "쉬웠다"] as const;

export type Kind = (typeof KINDS)[number];
export type Intensity = (typeof INTENSITIES)[number];
export type Feeling = (typeof FEELINGS)[number];

export type WorkoutMeta = {
  slug: string;
  date: string;
  kind: Kind;
  minutes: number | null;
  intensity: Intensity;
  feeling: Feeling;
};

export type Workout = WorkoutMeta & {
  /** 상세 내역 (마크다운 본문) */
  html: string;
  /** 소감 한 줄 */
  note?: string;
  photo?: string;
  photoAlt?: string;
};

/** content/ 안의 마크다운 파일 이름 목록. 파일 이름이 곧 slug가 된다. */
export async function getWorkoutSlugs(): Promise<string[]> {
  const entries = await fs.readdir(CONTENT_DIR, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => entry.name.replace(/\.md$/, ""));
}

/** 파일 맨 위의 front matter를 읽고 상세 내역을 HTML로 바꾼다. */
export async function getWorkout(slug: string): Promise<Workout> {
  const raw = await fs.readFile(path.join(CONTENT_DIR, `${slug}.md`), "utf8");
  const { data, content } = matter(raw);

  const processed = await remark().use(remarkGfm).use(remarkHtml).process(content);

  return {
    slug,
    date: toDateString(data.date) || slug,
    kind: pick(data.kind, KINDS),
    minutes: toMinutes(data.minutes),
    intensity: pick(data.intensity, INTENSITIES),
    feeling: pick(data.feeling, FEELINGS),
    note: typeof data.note === "string" ? data.note : undefined,
    photo: typeof data.photo === "string" ? data.photo : undefined,
    photoAlt: typeof data.photoAlt === "string" ? data.photoAlt : undefined,
    html: processed.toString(),
  };
}

/** 목록 화면용. 오래된 기록이 위로 온다. */
export async function getAllWorkouts(): Promise<WorkoutMeta[]> {
  const slugs = await getWorkoutSlugs();
  const workouts = await Promise.all(slugs.map(getWorkout));

  return workouts
    .map(({ slug, date, kind, minutes, intensity, feeling }) => ({
      slug,
      date,
      kind,
      minutes,
      intensity,
      feeling,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug));
}

/** 정해진 값 중 하나만 받고, 벗어나면 첫 번째 값으로 둔다. */
function pick<T extends readonly string[]>(value: unknown, allowed: T): T[number] {
  return typeof value === "string" && allowed.includes(value) ? value : allowed[0];
}

/** YAML은 따옴표 없는 날짜를 Date 객체로 파싱하므로 YYYY-MM-DD 문자열로 통일한다. */
function toDateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string") return value;
  return "";
}

function toMinutes(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
}

export function formatDate(date: string): string {
  if (!date) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** 70 → "1시간 10분" */
export function formatDuration(minutes: number | null): string {
  if (!minutes) return "기록 없음";

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (!h) return `${m}분`;
  return m ? `${h}시간 ${m}분` : `${h}시간`;
}
