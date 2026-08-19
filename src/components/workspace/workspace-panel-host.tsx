"use client";

import { usePathname } from "next/navigation";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { isWorkspacePath } from "@/lib/workspace-tabs";

export default function WorkspacePanelHost() {
  const pathname = usePathname();
  const { openTabIds, activeTabId, panels, availableTabs, openTab } = useWorkspace();

  if (!isWorkspacePath(pathname)) {
    return null;
  }

  if (openTabIds.length === 0) {
    return (
      <div className="mx-auto max-w-app px-4 py-16 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          열려 있는 탭이 없습니다.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => openTab(tab.id)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {tab.label} 열기
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {openTabIds.map((tabId) => {
        if (!availableTabs.some((tab) => tab.id === tabId)) return null;
        const active = tabId === activeTabId;

        return (
          <div
            key={tabId}
            hidden={!active}
            className="min-w-0 data-[active=true]:block"
            data-active={active}
          >
            {panels[tabId] ?? (
              <div className="mx-auto max-w-app px-4 py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
                불러오는 중...
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
