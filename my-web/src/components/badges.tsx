import {
  INTENSITIES,
  type Feeling,
  type Intensity,
  type Kind,
} from "@/lib/workouts";

const KIND_STYLE: Record<Kind, string> = {
  헬스: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  수영: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  러닝: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

const FEELING_STYLE: Record<Feeling, string> = {
  힘들었다: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  할만했다: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  쉬웠다: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
};

export function KindBadge({ kind }: { kind: Kind }) {
  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${KIND_STYLE[kind]}`}
    >
      {kind}
    </span>
  );
}

export function FeelingBadge({ feeling }: { feeling: Feeling }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${FEELING_STYLE[feeling]}`}
    >
      {feeling}
    </span>
  );
}

/** 낮음 / 보통 / 높음을 세 칸 막대로 보여준다. */
export function IntensityMeter({ intensity }: { intensity: Intensity }) {
  const level = INTENSITIES.indexOf(intensity) + 1;

  return (
    <span className="flex items-center gap-2">
      <span className="flex gap-1" aria-hidden>
        {INTENSITIES.map((_, i) => (
          <span
            key={i}
            className={`h-2 w-8 rounded-full ${
              i < level
                ? "bg-black/70 dark:bg-white/70"
                : "bg-black/10 dark:bg-white/15"
            }`}
          />
        ))}
      </span>
      <span className="text-base font-medium">{intensity}</span>
    </span>
  );
}
