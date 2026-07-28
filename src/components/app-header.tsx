import Link from "next/link";
import { logout } from "@/app/login/actions";

const navItems = [
  { href: "/dashboard", label: "홈" },
  { href: "/products", label: "재고관리" },
  { href: "/sales", label: "매출관리" },
  { href: "/quotes", label: "견적관리" },
];

export default function AppHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href="/dashboard" className="hover:opacity-80">
          <p className="text-xs font-semibold tracking-widest text-zinc-600 dark:text-zinc-400">
            PERCUSSIONCENTER
          </p>
          <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            관리시스템
          </h1>
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {item.label}
            </Link>
          ))}
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              로그아웃
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
