import { ExcelDashboard } from "@/components/excel-dashboard";

export const metadata = {
  title: "대시보드",
  description: "엑셀·CSV 파일을 브라우저에서만 읽어 분류별 합계를 막대 차트로 봅니다.",
};

export default function DashboardPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16">
      <header className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight">대시보드</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          엑셀이나 CSV 파일을 고르면 분류별 합계를 막대로 보여줍니다. 파일은 이
          브라우저 안에서만 읽고 서버로 보내지 않습니다.
        </p>
      </header>

      <ExcelDashboard />
    </main>
  );
}
