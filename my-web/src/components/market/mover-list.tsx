import { Change } from "@/components/market/change";
import { formatLevel, formatVolume } from "@/lib/market/series";
import type { Mover } from "@/lib/market/types";

export function MoverList({ title, rows }: { title: string; rows: Mover[] }) {
  if (rows.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs text-black/45 dark:text-white/45">{title}</h3>
      <ul className="mt-2 divide-y divide-black/10 border-t border-black/10 dark:divide-white/15 dark:border-white/15">
        {rows.map((m) => (
          <li key={m.symbol} className="flex items-baseline gap-3 py-3">
            <span className="w-16 shrink-0 text-sm font-medium">{m.symbol}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-black/50 dark:text-white/50">
              {m.name}
            </span>
            <span className="shrink-0 text-sm tabular-nums">{formatLevel(m.price, "usd")}</span>
            <span className="w-20 shrink-0 text-right text-sm">
              <Change value={m.changePct} />
            </span>
            {m.volume > 0 ? (
              <span className="hidden w-20 shrink-0 text-right text-xs tabular-nums text-black/35 sm:block dark:text-white/35">
                {formatVolume(m.volume)}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
