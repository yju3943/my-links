import type { Loaded, NewsItem } from "@/lib/market/types";

/**
 * AI 요약과 근거 헤드라인을 반드시 함께 놓는다.
 * 요약만 남기고 출처를 감추면 읽는 사람이 사실 여부를 확인할 방법이 없다.
 */
export function NewsBrief({
  brief,
  news,
  showBrief = true,
}: {
  brief: Loaded<string>;
  news: NewsItem[];
  /** AI 요약이 설정되지 않은 환경에서는 블록째 감춘다. */
  showBrief?: boolean;
}) {
  return (
    <div className="border-t border-black/10 pt-5 dark:border-white/15">
      {showBrief ? (
        <>
          <div className="flex items-center gap-2">
            <span className="rounded-sm bg-black/[0.06] px-1.5 py-0.5 text-[11px] text-black/55 dark:bg-white/10 dark:text-white/55">
              AI 요약
            </span>
            <span className="text-[11px] text-black/35 dark:text-white/35">
              아래 헤드라인만 근거로 씁니다. 투자 판단에 쓰지 마세요.
            </span>
          </div>

          <p className="mt-3 text-sm leading-relaxed">
            {brief.ok ? (
              brief.data
            ) : (
              <span className="text-black/50 dark:text-white/50">{brief.reason}</span>
            )}
          </p>
        </>
      ) : null}

      {news.length > 0 ? (
        <ol className="mt-6 divide-y divide-black/10 border-t border-black/10 dark:divide-white/15 dark:border-white/15">
          {news.map((n, i) => (
            <li key={n.link} className="py-3">
              <a
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-3 transition-opacity hover:opacity-70"
              >
                <span className="shrink-0 text-xs tabular-nums text-black/35 dark:text-white/35">
                  [{i + 1}]
                </span>
                <span className="min-w-0">
                  <span className="block text-sm group-hover:underline">{n.title}</span>
                  <span className="mt-0.5 block text-xs text-black/40 dark:text-white/40">
                    {n.publisher}
                    {n.lang === "en" ? " · 영문" : ""}
                    {n.tickers.length > 0 ? ` · ${n.tickers.slice(0, 4).join(" ")}` : ""}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
