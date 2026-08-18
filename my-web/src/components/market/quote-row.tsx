import { SparkLine } from "@/components/market/spark-line";
import { Change } from "@/components/market/change";
import { formatAsOf, formatLevel } from "@/lib/market/series";
import type { Loaded, Quote } from "@/lib/market/types";

export function QuoteRow({ row, label }: { row: Loaded<Quote>; label: string }) {
  if (!row.ok) {
    return (
      <li className="flex items-baseline justify-between gap-3 py-4">
        <span className="text-sm">{label}</span>
        <span className="text-xs text-black/40 dark:text-white/40">{row.reason}</span>
      </li>
    );
  }

  const q = row.data;

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-4 sm:grid-cols-[minmax(0,7rem)_1fr_auto_auto]">
      <span className="text-sm">{q.label}</span>

      <span className="order-last col-span-2 sm:order-none sm:col-span-1">
        <SparkLine
          series={[{ points: q.points, color: "var(--viz-series)", label: q.label }]}
          ariaLabel={`${q.label} 6개월 추이`}
        />
      </span>

      <span className="text-right text-sm tabular-nums">{formatLevel(q.value, q.unit)}</span>
      <span className="text-right text-sm">
        <Change value={q.changePct} />
        <span className="ml-2 text-xs text-black/35 dark:text-white/35">
          {formatAsOf(q.asOf)}
        </span>
      </span>
    </li>
  );
}

export function QuoteList({
  specs,
  rows,
}: {
  specs: { key: string; label: string }[];
  rows: Map<string, Loaded<Quote>>;
}) {
  return (
    <ul className="divide-y divide-black/10 border-t border-black/10 dark:divide-white/15 dark:border-white/15">
      {specs.map((spec) => (
        <QuoteRow
          key={spec.key}
          label={spec.label}
          row={rows.get(spec.key) ?? { ok: false, reason: "시세를 불러오지 못했습니다." }}
        />
      ))}
    </ul>
  );
}
