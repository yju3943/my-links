"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "홈" },
  { href: "/links", label: "링크 모음" },
  { href: "/news", label: "주요 뉴스" },
  { href: "/dashboard", label: "대시보드" },
  { href: "/market", label: "미국 증시" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-black/10 dark:border-white/15">
      <nav className="mx-auto flex w-full max-w-3xl flex-wrap gap-x-6 gap-y-2 px-6 py-4">
        {NAV.map(({ href, label }) => {
          const active = isActive(pathname, href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "text-sm font-medium"
                  : "text-sm text-black/50 transition-colors hover:text-black dark:text-white/50 dark:hover:text-white"
              }
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

/** 기록 상세(/posts/…)도 홈 쪽으로 본다. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/posts");
  return pathname === href || pathname.startsWith(`${href}/`);
}
