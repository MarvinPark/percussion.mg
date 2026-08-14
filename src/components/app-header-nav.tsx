"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { logout } from "@/app/login/actions";
import AppHeaderUsage from "@/components/app-header-usage";
import type { MonthlyUsageSummary } from "@/lib/app-usage";
import { ROLE_LABELS } from "@/lib/permissions";
import type { NavItem } from "@/lib/permissions";
import type { UserRole } from "@/types/profile";

type AppHeaderNavProps = {
  navItems: NavItem[];
  role: UserRole;
  usage: MonthlyUsageSummary;
};

function getActiveNavHref(pathname: string, navItems: NavItem[]) {
  const matching = navItems.filter(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  if (!matching.length) return null;

  return matching.reduce((best, item) =>
    item.href.length > best.href.length ? item : best,
  ).href;
}

export default function AppHeaderNav({ navItems, role, usage }: AppHeaderNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const activeHref = getActiveNavHref(pathname, navItems);

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
    const active = href === activeHref;
    return [
      "rounded-lg px-3 py-2 text-sm font-medium transition",
      active
        ? "bg-accent-soft text-accent-muted shadow-sm ring-1 ring-accent-border/60 dark:text-accent"
        : "text-zinc-700 hover:bg-zinc-100 hover:text-blue-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-sky-200",
    ].join(" ");
  };

  return (
    <>
      <div className="hidden items-center gap-2 md:flex">
        <nav className="flex flex-wrap items-center gap-1">
          {navItems.map((item) => (
            <Fragment key={item.href}>
              <Link href={item.href} className={linkClass(item.href)}>
                {item.label}
              </Link>
              {item.href === "/quotes" ? <AppHeaderUsage usage={usage} /> : null}
            </Fragment>
          ))}
        </nav>
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300">
          {ROLE_LABELS[role]}
        </span>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
          >
            로그아웃
          </button>
        </form>
      </div>

      <div className="flex items-center gap-2 md:hidden">
        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300">
          {ROLE_LABELS[role]}
        </span>
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
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
            className="fixed inset-x-0 top-[var(--app-header-height)] z-50 border-b border-zinc-200/80 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95 md:hidden"
          >
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Fragment key={item.href}>
                  <Link href={item.href} className={linkClass(item.href)}>
                    {item.label}
                  </Link>
                  {item.href === "/quotes" ? (
                    <div className="px-3 pb-1 lg:hidden">
                      <AppHeaderUsage
                        usage={usage}
                        className="inline-flex flex-wrap items-center gap-1 text-[10px] font-extralight tracking-tight"
                      />
                    </div>
                  ) : null}
                </Fragment>
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
