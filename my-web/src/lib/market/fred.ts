import { fail, type Loaded, type Point } from "@/lib/market/types";

const CSV_BASE = "https://fred.stlouisfed.org/graph/fredgraph.csv";
const API_BASE = "https://api.stlouisfed.org/fred/series/observations";

export type FredOpts = {
  /** "YYYY-MM-DD". 시리즈당 1회 요청 + 구간 제한으로 응답을 작게 유지한다. */
  start: string;
  transformation?: "pc1" | "chg";
  revalidate?: number;
};

/**
 * 결측치 표기가 두 경로에서 다르다. CSV 는 빈 문자열, JSON API 는 ".".
 * 둘 다 걸러야 차트에 0 이 찍히는 사고를 막는다.
 */
function isMissing(raw: string): boolean {
  const v = raw.trim();
  return v === "" || v === ".";
}

/** 헤더 컬럼명은 transformation 을 주면 바뀌므로(CPIAUCSL_PC1) 인덱스로 읽는다. */
function parseCsv(text: string): Point[] {
  const lines = text.trim().split(/\r?\n/);
  const out: Point[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(",");
    if (cols.length < 2) continue;
    const t = cols[0].trim();
    if (isMissing(cols[1])) continue;
    const v = Number(cols[1]);
    if (!Number.isFinite(v)) continue;
    out.push({ t, v });
  }
  return out;
}

async function fetchViaCsv(id: string, opts: FredOpts): Promise<Point[]> {
  const params = new URLSearchParams({ id, cosd: opts.start });
  if (opts.transformation) params.set("transformation", opts.transformation);

  const res = await fetch(`${CSV_BASE}?${params}`, {
    next: { revalidate: opts.revalidate ?? 21_600, tags: ["market:fred"] },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseCsv(await res.text());
}

async function fetchViaApi(id: string, key: string, opts: FredOpts): Promise<Point[]> {
  const params = new URLSearchParams({
    series_id: id,
    api_key: key,
    file_type: "json",
    observation_start: opts.start,
    sort_order: "asc",
  });
  if (opts.transformation) params.set("units", opts.transformation);

  const res = await fetch(`${API_BASE}?${params}`, {
    next: { revalidate: opts.revalidate ?? 21_600, tags: ["market:fred"] },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = (await res.json()) as { observations?: { date: string; value: string }[] };
  return (json.observations ?? [])
    .filter((o) => !isMissing(o.value))
    .map((o) => ({ t: o.date, v: Number(o.value) }))
    .filter((p) => Number.isFinite(p.v));
}

/**
 * 키가 있으면 공식 JSON API, 없으면 키가 필요 없는 fredgraph.csv.
 * 두 경로는 같은 숫자를 내야 한다 — 키 유무가 화면을 바꾸면 안 된다.
 */
export async function fetchFredSeries(id: string, opts: FredOpts): Promise<Loaded<Point[]>> {
  const key = process.env.FRED_API_KEY;

  try {
    const points = key ? await fetchViaApi(id, key, opts) : await fetchViaCsv(id, opts);
    if (points.length === 0) return fail("지표 데이터가 비어 있습니다.");
    return {
      ok: true,
      data: points,
      source: "fred",
      asOf: points[points.length - 1].t,
    };
  } catch {
    return fail("지표를 불러오지 못했습니다.");
  }
}

export async function fetchFredMany(
  ids: string[],
  opts: FredOpts,
): Promise<Map<string, Loaded<Point[]>>> {
  const results = await Promise.all(ids.map((id) => fetchFredSeries(id, opts)));
  return new Map(ids.map((id, i) => [id, results[i]]));
}

/** 오늘로부터 n 개월 전 날짜. cosd 용. */
export function monthsAgo(months: number, today = new Date()): string {
  const d = new Date(today);
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}
