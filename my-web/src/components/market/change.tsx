import { formatPct } from "@/lib/market/series";

/**
 * 등락률 표시. 색만으로 방향을 전하지 않도록 ▲▼ 를 항상 함께 쓴다.
 * 색은 한국 관습(상승 빨강 / 하락 파랑).
 */
export function Change({ value, className = "" }: { value: number; className?: string }) {
  const flat = Math.abs(value) < 0.005;
  const mark = flat ? "―" : value > 0 ? "▲" : "▼";
  const color = flat
    ? "var(--viz-muted)"
    : value > 0
      ? "var(--viz-up)"
      : "var(--viz-down)";

  return (
    <span className={`tabular-nums ${className}`} style={{ color }}>
      <span aria-hidden="true">{mark} </span>
      {formatPct(value)}
    </span>
  );
}
