"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getActiveWorkspaceTabHref,
  isWorkspacePath,
} from "@/lib/workspace-tabs";
import type { NavItem } from "@/lib/permissions";

type WorkspaceTabsProps = {
  tabs: NavItem[];
};

function TabIcon({ href, active }: { href: string; active: boolean }) {
  const className = active ? "text-accent" : "text-zinc-500 dark:text-zinc-400";

  if (href === "/products") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path
          d="M4 7.5 12 3l8 4.5V18L12 22 4 18V7.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M12 12 20 7.5M12 12 4 7.5M12 12v10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (href === "/sales") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path
          d="M4 7h16l-1.2 11H5.2L4 7Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9 7V5a3 3 0 0 1 6 0v2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M7 4h10v16H7V4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 8h6M9 12h6M9 16h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function WorkspaceTabs({ tabs }: WorkspaceTabsProps) {
  const pathname = usePathname();

  if (!tabs.length || !isWorkspacePath(pathname)) {
    return null;
  }

  const activeHref = getActiveWorkspaceTabHref(pathname);

  return (
    <>
      <div
        className="h-[calc(var(--workspace-tabs-height)+env(safe-area-inset-bottom,0px))] shrink-0"
        aria-hidden="true"
      />
      <nav
        aria-label="주요 메뉴"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/90 bg-white/95 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-4px_16px_rgb(0_0_0_/_0.06)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95 dark:shadow-[0_-4px_16px_rgb(0_0_0_/_0.25)]"
      >
        <div className="mx-auto flex max-w-app items-stretch">
          {tabs.map((tab) => {
            const active = tab.href === activeHref;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={[
                  "flex min-h-[var(--workspace-tabs-height)] flex-1 flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-[11px] font-semibold transition",
                  active
                    ? "text-accent dark:text-accent"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
              >
                <TabIcon href={tab.href} active={active} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
