import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeelingBadge, IntensityMeter, KindBadge } from "@/components/badges";
import {
  formatDate,
  formatDuration,
  getWorkout,
  getWorkoutSlugs,
} from "@/lib/workouts";

/** 빌드 시점에 content/ 를 훑어 기록마다 정적 페이지를 만든다. */
export async function generateStaticParams() {
  const slugs = await getWorkoutSlugs();
  return slugs.map((slug) => ({ slug }));
}

/** 여기 없는 주소는 렌더링하지 않고 404로 보낸다. */
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/posts/[slug]">) {
  const { slug } = await params;

  try {
    const workout = await getWorkout(slug);
    return {
      title: `${formatDate(workout.date)} ${workout.kind}`,
      description: workout.note,
    };
  } catch {
    return {};
  }
}

export default async function WorkoutPage({ params }: PageProps<"/posts/[slug]">) {
  const { slug } = await params;

  const workout = await getWorkout(slug).catch(() => null);
  if (!workout) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <Link
        href="/"
        className="text-sm text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
      >
        ← 목록으로
      </Link>

      <article className="mt-8">
        <header className="border-b border-black/10 pb-6 dark:border-white/15">
          <h1 className="text-3xl font-semibold tracking-tight">
            <time dateTime={workout.date}>{formatDate(workout.date)}</time>
          </h1>
        </header>

        <Section title="운동 종류">
          <KindBadge kind={workout.kind} />
        </Section>

        <Section title="운동 시간">
          <p className="text-base font-medium">
            {formatDuration(workout.minutes)}
          </p>
        </Section>

        <Section title="상세 내역">
          <div
            className="prose prose-neutral max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: workout.html }}
          />
        </Section>

        <Section title="운동 강도">
          <IntensityMeter intensity={workout.intensity} />
        </Section>

        <Section title="운동 후 소감">
          <FeelingBadge feeling={workout.feeling} />
          {workout.note && (
            <p className="mt-3 text-base text-black/70 dark:text-white/70">
              {workout.note}
            </p>
          )}
        </Section>

        <Section title="운동 인증 사진">
          {workout.photo ? (
            <Image
              src={workout.photo}
              alt={workout.photoAlt ?? `${formatDate(workout.date)} 운동 인증 사진`}
              width={1200}
              height={900}
              sizes="(max-width: 672px) 100vw, 640px"
              className="w-full rounded-lg border border-black/10 dark:border-white/15"
            />
          ) : (
            <p className="rounded-lg border border-dashed border-black/15 px-4 py-10 text-center text-sm text-black/40 dark:border-white/20 dark:text-white/40">
              아직 사진을 올리지 않았습니다.
            </p>
          )}
        </Section>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-black/10 py-6 dark:border-white/15">
      <h2 className="text-xs font-medium tracking-wide text-black/45 dark:text-white/45">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
