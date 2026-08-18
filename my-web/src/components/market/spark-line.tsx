import { sharedExtent, toPath, toY } from "@/lib/market/series";
import type { Point } from "@/lib/market/types";

const WIDTH = 240;

export type SparkSeries = {
  points: Point[];
  color: string;
  label: string;
  dashed?: boolean;
};

/**
 * 서버에서 그리는 인라인 SVG 선 그래프. 차트 라이브러리를 들이지 않는다.
 * 한 차트 안의 여러 시리즈는 y 범위를 공유한다 — 2년물과 10년물이 서로 다른
 * 축에 있으면 두 선을 비교하는 의미가 사라진다.
 */
export function SparkLine({
  series,
  height = 56,
  zeroLine = false,
  ariaLabel,
  className = "",
}: {
  series: SparkSeries[];
  height?: number;
  zeroLine?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  const drawable = series.filter((s) => s.points.length > 1);
  if (drawable.length === 0) {
    return <div className={`h-14 ${className}`} aria-hidden="true" />;
  }

  const domain = sharedExtent(drawable.map((s) => s.points));
  const showZero = zeroLine && domain.min < 0 && domain.max > 0;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
      className={`h-14 w-full ${className}`}
    >
      <title>{ariaLabel}</title>

      {showZero ? (
        <line
          x1="0"
          x2={WIDTH}
          y1={toY(0, height, domain)}
          y2={toY(0, height, domain)}
          stroke="var(--viz-baseline)"
          strokeWidth={1}
          strokeDasharray="2 3"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}

      {drawable.map((s) => (
        <path
          key={s.label}
          d={toPath(s.points, WIDTH, height, domain)}
          fill="none"
          stroke={s.color}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray={s.dashed ? "3 3" : undefined}
          /* 가로로 늘려 그리기 때문에 이게 없으면 선이 쐐기처럼 두꺼워진다 */
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
