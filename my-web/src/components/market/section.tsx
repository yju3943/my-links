import type { ReactNode } from "react";

export function MarketSection({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xs font-medium tracking-wide text-black/45 dark:text-white/45">
        {title}
      </h2>
      {note ? (
        <p className="mt-1 text-xs text-black/40 dark:text-white/40">{note}</p>
      ) : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** 한 섹션이 실패해도 제목은 남기고 그 자리만 대체한다. */
export function SectionFallback({ reason }: { reason: string }) {
  return (
    <p className="border-t border-black/10 py-5 text-sm text-black/50 dark:border-white/15 dark:text-white/50">
      {reason}
    </p>
  );
}
