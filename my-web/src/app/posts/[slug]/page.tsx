import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, getPost, getPostSlugs } from "@/lib/posts";

/** 빌드 시점에 content/ 를 훑어 글마다 정적 페이지를 만든다. */
export async function generateStaticParams() {
  const slugs = await getPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

/** 여기 없는 주소는 렌더링하지 않고 404로 보낸다. */
export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/posts/[slug]">) {
  const { slug } = await params;

  try {
    const post = await getPost(slug);
    return { title: post.title, description: post.summary };
  } catch {
    return {};
  }
}

export default async function PostPage({ params }: PageProps<"/posts/[slug]">) {
  const { slug } = await params;

  const post = await getPost(slug).catch(() => null);
  if (!post) notFound();

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
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            {post.title}
          </h1>
          {post.date && (
            <time
              dateTime={post.date}
              className="mt-3 block text-sm text-black/50 dark:text-white/50"
            >
              {formatDate(post.date)}
            </time>
          )}
        </header>

        <div
          className="prose prose-neutral mt-8 max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
      </article>
    </main>
  );
}
