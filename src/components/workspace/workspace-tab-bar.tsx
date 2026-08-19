"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { isWorkspacePath } from "@/lib/workspace-tabs";

export default function WorkspaceTabBar() {
  const pathname = usePathname();
  const {
    availableTabs,
    openTabIds,
    activeTabId,
    closedTabIds,
    activateTab,
    closeTab,
    openTab,
  } = useWorkspace();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!isWorkspacePath(pathname)) {
    return null;
  }

  return (
    <div className="sticky top-[var(--app-header-height)] z-20 border-b border-zinc-200/90 bg-white/95 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95">
      <div className="mx-auto flex max-w-app items-center gap-1 overflow-x-auto px-2 py-1">
        {openTabIds.map((tabId) => {
          const tab = availableTabs.find((item) => item.id === tabId);
          if (!tab) return null;
          const active = tabId === activeTabId;

          return (
            <div
              key={tabId}
              className={[
                "inline-flex h-[var(--workspace-tab-bar-height)] max-w-[9rem] shrink-0 items-stretch overflow-hidden rounded-md border text-xs font-semibold transition",
                active
                  ? "border-accent/40 bg-accent-soft text-accent-muted dark:text-accent"
                  : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300 dark:hover:bg-zinc-800",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => activateTab(tabId)}
                className="min-w-0 flex-1 truncate px-2.5 text-left"
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </button>
              <button
                type="button"
                onClick={() => closeTab(tabId)}
                className="inline-flex w-7 shrink-0 items-center justify-center border-l border-inherit text-zinc-400 hover:bg-black/5 hover:text-zinc-700 dark:hover:bg-white/5 dark:hover:text-zinc-200"
                aria-label={`${tab.label} 탭 닫기`}
              >
                ×
              </button>
            </div>
          );
        })}

        {closedTabIds.length > 0 ? (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-[var(--workspace-tab-bar-height)] items-center rounded-md border border-dashed border-zinc-300 px-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-expanded={menuOpen}
              aria-label="탭 열기"
            >
              +
            </button>
            {menuOpen ? (
              <>
                <button
                  type="button"
                  aria-label="탭 메뉴 닫기"
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute left-0 top-[calc(100%+4px)] z-20 min-w-[7rem] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                  {closedTabIds.map((tabId) => {
                    const tab = availableTabs.find((item) => item.id === tabId);
                    if (!tab) return null;

                    return (
                      <button
                        key={tabId}
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          openTab(tabId);
                        }}
                        className="block w-full px-3 py-1.5 text-left text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
