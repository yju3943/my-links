"use client";

export default function MarketError({ retry }: { error: Error; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">미국 증시</h1>
      <p className="mt-4 text-sm text-black/60 dark:text-white/60">
        화면을 그리는 중에 문제가 생겼습니다.
      </p>
      <button
        type="button"
        onClick={retry}
        className="mt-6 rounded-md border border-black/15 px-4 py-2 text-sm transition-opacity hover:opacity-70 dark:border-white/20"
      >
        다시 시도
      </button>
    </main>
  );
}
