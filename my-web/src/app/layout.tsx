import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

/** 페이퍼로지 (Paperlogy) — https://noonnu.cc/font_page/1456 */
const paperlogy = localFont({
  src: [
    { path: "../fonts/Paperlogy-3Light.woff2", weight: "300", style: "normal" },
    { path: "../fonts/Paperlogy-4Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Paperlogy-5Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Paperlogy-6SemiBold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/Paperlogy-7Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-paperlogy",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "오늘의 운동일지",
    template: "%s | 오늘의 운동일지",
  },
  description: "헬스, 수영, 러닝 기록을 날짜별로 남기는 운동일지",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${paperlogy.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
