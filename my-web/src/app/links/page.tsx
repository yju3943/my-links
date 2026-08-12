import { getLinkGroups, hostLabel } from "@/lib/links";

export const metadata = {
  title: "링크 모음",
  description: "운동에 도움이 되는 사이트를 분류별로 모아둔 목록",
};

export default async function LinksPage() {
  const groups = await getLinkGroups();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">링크 모음</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          data/links.json 에 적어둔 링크를 분류별로 모았습니다.
        </p>
      </header>

      {groups.length === 0 ? (
        <p className="mt-12 text-sm text-black/50 dark:text-white/50">
          아직 링크가 없습니다. data/links.json 에 항목을 추가해 보세요.
        </p>
      ) : (
        <div className="mt-12 space-y-12">
          {groups.map((group) => (
            <section key={group.category}>
              <h2 className="text-xs font-medium tracking-wide text-black/45 dark:text-white/45">
                {group.category}
              </h2>

              <ul className="mt-3 divide-y divide-black/10 border-t border-black/10 dark:divide-white/15 dark:border-white/15">
                {group.items.map((item) => (
                  <li key={item.url}>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block py-5 transition-opacity hover:opacity-70"
                    >
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-lg font-medium group-hover:underline">
                          {item.title}
                        </h3>
                        <span className="text-xs text-black/40 dark:text-white/40">
                          {hostLabel(item.url)} ↗
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                        {item.description}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
