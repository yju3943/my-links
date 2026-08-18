import { Change } from "@/components/market/change";
import type { Quote } from "@/lib/market/types";

/**
 * 섹터를 등락률 순으로 세워 자금이 어디로 쏠렸는지 한눈에 보이게 한다.
 * 막대 길이는 그날 가장 크게 움직인 섹터를 기준으로 상대화한다.
 */
export function SectorGrid({ sectors }: { sectors: Quote[] }) {
  const sorted = [...sectors].sort((a, b) => b.changePct - a.changePct);
  const max = Math.max(...sorted.map((s) => Math.abs(s.changePct)), 0.1);

  return (
    <ul className="divide-y divide-black/10 border-t border-black/10 dark:divide-white/15 dark:border-white/15">
      {sorted.map((s) => {
        const width = `${(Math.abs(s.changePct) / max) * 50}%`;
        const up = s.changePct >= 0;

        return (
          <li key={s.key} className="flex items-center gap-3 py-3">
            <span className="w-24 shrink-0 text-sm">{s.label}</span>

            {/* 0을 가운데 두고 좌우로 뻗는 막대 — 방향이 바로 읽힌다 */}
            <span className="relative hidden h-3 flex-1 sm:block" aria-hidden="true">
              <span className="absolute inset-y-0 left-1/2 w-px bg-[var(--viz-baseline)]" />
              <span
                className="absolute inset-y-0 rounded-sm"
                style={{
                  width,
                  [up ? "left" : "right"]: "50%",
                  background: up ? "var(--viz-up)" : "var(--viz-down)",
                }}
              />
            </span>

            <span className="ml-auto text-sm sm:ml-0">
              <Change value={s.changePct} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
