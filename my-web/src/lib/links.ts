import fs from "node:fs/promises";
import path from "node:path";

const LINKS_FILE = path.join(process.cwd(), "data", "links.json");

export type LinkItem = {
  title: string;
  url: string;
  description: string;
  category: string;
};

export type LinkGroup = {
  category: string;
  items: LinkItem[];
};

/** data/links.json 을 빌드 시점에 읽는다. */
export async function getLinks(): Promise<LinkItem[]> {
  const raw = await fs.readFile(LINKS_FILE, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) return [];

  return parsed.filter(isLinkItem);
}

/** 분류별로 묶는다. 분류 순서와 항목 순서 모두 파일에 적힌 순서를 따른다. */
export async function getLinkGroups(): Promise<LinkGroup[]> {
  const links = await getLinks();
  const groups = new Map<string, LinkItem[]>();

  for (const link of links) {
    const items = groups.get(link.category);
    if (items) items.push(link);
    else groups.set(link.category, [link]);
  }

  return [...groups].map(([category, items]) => ({ category, items }));
}

/** 네 항목이 모두 문자열이고 주소가 http(s)인 것만 통과시킨다. */
function isLinkItem(value: unknown): value is LinkItem {
  if (typeof value !== "object" || value === null) return false;

  const { title, url, description, category } = value as Record<string, unknown>;

  return (
    typeof title === "string" &&
    typeof url === "string" &&
    typeof description === "string" &&
    typeof category === "string" &&
    /^https?:\/\//.test(url)
  );
}

/** https://www.strava.com → strava.com */
export function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
