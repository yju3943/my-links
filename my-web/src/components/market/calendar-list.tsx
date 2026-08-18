import type { CalendarData } from "@/lib/market/calendar";

const KIND_LABEL: Record<string, string> = {
  FOMC: "통화정책",
  CPI: "물가",
  PCE: "물가",
  JOBS: "고용",
  GDP: "성장",
  기타: "기타",
};

export function CalendarList({ data }: { data: CalendarData }) {
  if (data.events.length === 0) {
    return (
      <p className="border-t border-black/10 py-5 text-sm text-black/50 dark:border-white/15 dark:text-white/50">
        예정된 일정이 없습니다. data/market-calendar.json 을 갱신해 주세요.
      </p>
    );
  }

  return (
    <>
      <ul className="divide-y divide-black/10 border-t border-black/10 dark:divide-white/15 dark:border-white/15">
        {data.events.map((e) => (
          <li key={`${e.date}-${e.title}`} className="flex items-baseline gap-3 py-3">
            <span className="w-24 shrink-0 text-sm tabular-nums">{e.date}</span>
            <span className="w-14 shrink-0 text-xs text-black/40 dark:text-white/40">
              {KIND_LABEL[e.kind] ?? e.kind}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm">{e.title}</span>
              {e.note ? (
                <span className="mt-0.5 block text-xs text-black/40 dark:text-white/40">
                  {e.note}
                </span>
              ) : null}
            </span>
            {e.time ? (
              <span className="hidden shrink-0 text-xs tabular-nums text-black/35 sm:block dark:text-white/35">
                {e.time}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      {data.stale ? (
        <p className="mt-3 text-xs text-[var(--viz-up)]">
          일정이 {data.updatedThrough}까지만 입력되어 있습니다. data/market-calendar.json 을 갱신해 주세요.
        </p>
      ) : null}
    </>
  );
}
