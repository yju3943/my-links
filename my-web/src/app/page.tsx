import Link from "next/link";
import { formatDate, getAllPosts } from "@/lib/posts";

export default async function Home() {
  const posts = await getAllPosts();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">글 목록</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          content 폴더의 마크다운 파일이 그대로 글이 됩니다.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="mt-12 text-sm text-black/50 dark:text-white/50">
          아직 글이 없습니다. content 폴더에 .md 파일을 추가해 보세요.
        </p>
      ) : (
        <ul className="mt-12 divide-y divide-black/10 border-t border-black/10 dark:divide-white/15 dark:border-white/15">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/posts/${post.slug}`}
                className="group block py-6 transition-opacity hover:opacity-70"
              >
                {post.date && (
                  <time
                    dateTime={post.date}
                    className="text-xs text-black/50 dark:text-white/50"
                  >
                    {formatDate(post.date)}
                  </time>
                )}
                <h2 className="mt-1 text-lg font-medium group-hover:underline">
                  {post.title}
                </h2>
                {post.summary && (
                  <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                    {post.summary}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
