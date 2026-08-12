import Link from "next/link";
import { KindBadge } from "@/components/badges";
import { formatDate, formatDuration, getAllWorkouts } from "@/lib/workouts";

export default async function Home() {
  const workouts = await getAllWorkouts();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">오늘의 운동일지</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          {workouts.length ? `기록 ${workouts.length}개` : "아직 기록이 없습니다."}
        </p>
      </header>

      {workouts.length === 0 ? (
        <p className="mt-12 text-sm text-black/50 dark:text-white/50">
          content 폴더에 날짜 이름으로 .md 파일을 추가해 보세요.
        </p>
      ) : (
        <ul className="mt-12 divide-y divide-black/10 border-t border-black/10 dark:divide-white/15 dark:border-white/15">
          {workouts.map((workout) => (
            <li key={workout.slug}>
              <Link
                href={`/posts/${workout.slug}`}
                className="group flex items-center justify-between gap-4 py-6 transition-opacity hover:opacity-70"
              >
                <div className="min-w-0">
                  <h2 className="text-lg font-medium group-hover:underline">
                    <time dateTime={workout.date}>{formatDate(workout.date)}</time>
                  </h2>
                  <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                    {formatDuration(workout.minutes)} · 강도 {workout.intensity}
                  </p>
                </div>
                <KindBadge kind={workout.kind} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
