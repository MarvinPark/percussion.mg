"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logout } from "@/app/login/actions";
import { ROLE_LABELS } from "@/lib/permissions";
import type { NavItem } from "@/lib/permissions";
import type { UserRole } from "@/types/profile";

type AppHeaderNavProps = {
  navItems: NavItem[];
  role: UserRole;
};

export default function AppHeaderNav({ navItems, role }: AppHeaderNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  const linkClass = (href: string) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return [
      "rounded-lg px-3 py-2 text-sm font-medium transition",
      active
        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
        : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
    ].join(" ");
  };

  return (
    <>
      <div className="hidden items-center gap-2 md:flex">
        <nav className="flex flex-wrap items-center gap-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              {item.label}
            </Link>
          ))}
        </nav>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {ROLE_LABELS[role]}
        </span>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            로그아웃
          </button>
        </form>
      </div>

      <div className="flex items-center gap-2 md:hidden">
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {ROLE_LABELS[role]}
        </span>
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      </div>

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="메뉴 배경 닫기"
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div
            id="mobile-nav"
            className="fixed inset-x-0 top-[73px] z-50 border-b border-zinc-200 bg-white px-4 py-3 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 md:hidden"
          >
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={linkClass(item.href)}
                >
                  {item.label}
                </Link>
              ))}
              <form action={logout} className="pt-2">
                <button
                  type="submit"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-left text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  로그아웃
                </button>
              </form>
            </nav>
          </div>
        </>
      ) : null}
    </>
  );
}
