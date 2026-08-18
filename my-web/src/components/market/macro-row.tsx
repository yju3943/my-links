import { SparkLine } from "@/components/market/spark-line";
import { formatAsOf } from "@/lib/market/series";
import { daysAgo } from "@/lib/market/series";
import type { MacroRow } from "@/lib/market/quotes";

function formatValue(row: MacroRow): string {
  const digits = row.suffix === "천명" ? 0 : 2;
  return `${row.value.toFixed(digits)}${row.suffix}`;
}

/**
 * FRED 지표 한 줄. 기준일을 반드시 함께 보여준다 —
 * 월간 지표는 발표까지 몇 주가 걸려서, 날짜 없이 숫자만 두면 화면이 조용히 거짓말을 한다.
 */
export function MacroRowItem({ row }: { row: MacroRow }) {
  const stale = daysAgo(row.asOf) > 40;

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-4 sm:grid-cols-[minmax(0,11rem)_1fr_auto_auto]">
      <span className="text-sm">{row.label}</span>

      <span className="order-last col-span-2 sm:order-none sm:col-span-1">
        <SparkLine
          series={[{ points: row.points, color: "var(--viz-series)", label: row.label }]}
          zeroLine
          ariaLabel={`${row.label} 추이`}
        />
      </span>

      <span className="text-right text-sm tabular-nums">{formatValue(row)}</span>
      <span className="text-right text-xs tabular-nums text-black/35 dark:text-white/35">
        {formatAsOf(row.asOf)}
        {stale ? " 발표" : ""}
      </span>
    </li>
  );
}
