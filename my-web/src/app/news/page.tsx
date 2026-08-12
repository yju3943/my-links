export const metadata = {
  title: "주요 뉴스",
  description: "어제의 뉴스 페이지를 그대로 불러옵니다.",
};

const NEWS_URL = "https://hello-vercel-phi-smoky.vercel.app/";

export default function NewsPage() {
  return (
    <main className="flex flex-1 flex-col">
      <iframe
        src={NEWS_URL}
        title="주요 뉴스"
        className="w-full flex-1 border-0"
      />
    </main>
  );
}
