import type { Point, Unit } from "@/lib/market/types";

/** 야후는 휴장일 자리에 null 을 끼워 보낸다. 그 구멍을 걷어내고 날짜를 붙인다. */
export function cleanPoints(
  timestamps: number[] | undefined,
  closes: (number | null)[] | undefined,
): Point[] {
  if (!timestamps || !closes) return [];

  const points: Point[] = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const v = closes[i];
    const ts = timestamps[i];
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    if (typeof ts !== "number") continue;
    points.push({ t: new Date(ts * 1000).toISOString().slice(0, 10), v });
  }
  return points;
}

export function changePct(prev: number, next: number): number {
  if (!prev) return 0;
  return ((next - prev) / prev) * 100;
}

export function extent(points: Point[]): { min: number; max: number } {
  if (points.length === 0) return { min: 0, max: 1 };

  let min = points[0].v;
  let max = points[0].v;
  for (const p of points) {
    if (p.v < min) min = p.v;
    if (p.v > max) max = p.v;
  }
  // 완전히 평평한 시리즈도 선이 보이도록 위아래를 살짝 벌린다.
  if (min === max) return { min: min - 1, max: max + 1 };
  return { min, max };
}

/** 여러 시리즈를 한 차트에 겹칠 때 쓰는 공통 y 범위. */
export function sharedExtent(series: Point[][]): { min: number; max: number } {
  return extent(series.flat());
}

/** SVG path. 좌표를 반올림해서 문서에 실리는 문자열을 줄인다. */
export function toPath(
  points: Point[],
  width: number,
  height: number,
  domain: { min: number; max: number },
  pad = 2,
): string {
  if (points.length === 0) return "";

  const span = domain.max - domain.min || 1;
  const usable = height - pad * 2;
  const step = points.length > 1 ? width / (points.length - 1) : 0;

  return points
    .map((p, i) => {
      const x = (i * step).toFixed(2);
      const y = (pad + (1 - (p.v - domain.min) / span) * usable).toFixed(2);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

/** 값 하나를 y 좌표로. 0선 같은 기준선을 그릴 때 쓴다. */
export function toY(
  value: number,
  height: number,
  domain: { min: number; max: number },
  pad = 2,
): number {
  const span = domain.max - domain.min || 1;
  return pad + (1 - (value - domain.min) / span) * (height - pad * 2);
}

export function downsample(points: Point[], maxPoints: number): Point[] {
  if (points.length <= maxPoints) return points;

  const stride = Math.ceil(points.length / maxPoints);
  const out = points.filter((_, i) => i % stride === 0);
  // 마지막 값은 최신치라 반드시 남긴다.
  const last = points[points.length - 1];
  if (out[out.length - 1]?.t !== last.t) out.push(last);
  return out;
}

/** 월간 물가지수를 전년 대비 상승률로 바꾼다. 지수 원값은 의미가 읽히지 않는다. */
export function yoy(points: Point[], lagMonths = 12): Point[] {
  const out: Point[] = [];
  for (let i = lagMonths; i < points.length; i += 1) {
    const base = points[i - lagMonths].v;
    if (!base) continue;
    out.push({ t: points[i].t, v: ((points[i].v - base) / base) * 100 });
  }
  return out;
}

const KO = "ko-KR";

export function formatLevel(value: number, unit: Unit): string {
  switch (unit) {
    case "pct":
      return `${new Intl.NumberFormat(KO, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}%`;
    case "krw":
      return `${new Intl.NumberFormat(KO, { maximumFractionDigits: 1 }).format(value)}원`;
    case "usd":
      return `$${new Intl.NumberFormat(KO, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
    default:
      return new Intl.NumberFormat(KO, { maximumFractionDigits: 2 }).format(value);
  }
}

export function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat(KO, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}%`;
}

export function formatVolume(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억주`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}만주`;
  return new Intl.NumberFormat(KO).format(value);
}

/** "8월 17일 기준" 같은 짧은 기준일 표기. */
export function formatAsOf(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** 며칠 지난 데이터인지. 폴백 값이 얼마나 묵었는지 알리는 용도. */
export function daysAgo(iso: string, today = new Date()): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.round((today.getTime() - d.getTime()) / 86_400_000));
}
