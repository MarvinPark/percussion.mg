"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  getWorkspaceTabIdFromPath,
  getWorkspaceTabMeta,
  isWorkspacePath,
  readStoredOpenTabs,
  writeStoredOpenTabs,
  type WorkspaceTabId,
  type WorkspaceTabMeta,
} from "@/lib/workspace-tabs";

type WorkspaceContextValue = {
  availableTabs: WorkspaceTabMeta[];
  openTabIds: WorkspaceTabId[];
  activeTabId: WorkspaceTabId | null;
  panels: Partial<Record<WorkspaceTabId, ReactNode>>;
  closedTabIds: WorkspaceTabId[];
  activateTab: (tabId: WorkspaceTabId) => void;
  openTab: (tabId: WorkspaceTabId) => void;
  closeTab: (tabId: WorkspaceTabId) => void;
  setPanelContent: (tabId: WorkspaceTabId, content: ReactNode) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return context;
}

function sanitizeOpenTabs(
  tabIds: WorkspaceTabId[],
  availableTabs: WorkspaceTabMeta[],
) {
  const allowed = new Set(availableTabs.map((tab) => tab.id));
  return tabIds.filter((tabId) => allowed.has(tabId));
}

type WorkspaceProviderProps = {
  availableTabs: WorkspaceTabMeta[];
  children: ReactNode;
};

export function WorkspaceProvider({
  availableTabs,
  children,
}: WorkspaceProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [openTabIds, setOpenTabIds] = useState<WorkspaceTabId[]>([]);
  const [activeTabId, setActiveTabId] = useState<WorkspaceTabId | null>(null);
  const [panels, setPanels] = useState<Partial<Record<WorkspaceTabId, ReactNode>>>(
    {},
  );
  const panelsRef = useRef(panels);
  panelsRef.current = panels;
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isWorkspacePath(pathname)) return;

    const routeTab = getWorkspaceTabIdFromPath(pathname);
    if (!routeTab || !availableTabs.some((tab) => tab.id === routeTab)) return;

    setOpenTabIds((prev) => {
      const stored = sanitizeOpenTabs(readStoredOpenTabs(), availableTabs);
      const base = prev.length > 0 ? prev : stored;
      return base.includes(routeTab) ? base : [...base, routeTab];
    });
    setActiveTabId(routeTab);
  }, [availableTabs, hydrated, pathname]);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredOpenTabs(openTabIds);
  }, [hydrated, openTabIds]);

  useEffect(() => {
    if (!hydrated) return;

    function handlePopState() {
      const routeTab = getWorkspaceTabIdFromPath(window.location.pathname);
      if (!routeTab) return;
      setOpenTabIds((prev) =>
        prev.includes(routeTab) ? prev : [...prev, routeTab],
      );
      setActiveTabId(routeTab);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [hydrated]);

  const closedTabIds = useMemo(
    () =>
      availableTabs
        .map((tab) => tab.id)
        .filter((tabId) => !openTabIds.includes(tabId)),
    [availableTabs, openTabIds],
  );

  const replaceUrl = useCallback((href: string) => {
    if (window.location.pathname !== href) {
      window.history.replaceState(window.history.state, "", href);
    }
  }, []);

  const activateTab = useCallback(
    (tabId: WorkspaceTabId) => {
      if (!availableTabs.some((tab) => tab.id === tabId)) return;

      setOpenTabIds((prev) => (prev.includes(tabId) ? prev : [...prev, tabId]));
      setActiveTabId(tabId);

      if (panelsRef.current[tabId]) {
        replaceUrl(getWorkspaceTabMeta(tabId).href);
        return;
      }

      router.push(getWorkspaceTabMeta(tabId).href);
    },
    [availableTabs, replaceUrl, router],
  );

  const openTab = useCallback(
    (tabId: WorkspaceTabId) => {
      activateTab(tabId);
    },
    [activateTab],
  );

  const closeTab = useCallback(
    (tabId: WorkspaceTabId) => {
      setOpenTabIds((prev) => {
        const next = prev.filter((id) => id !== tabId);
        if (activeTabId === tabId) {
          const fallback = next[next.length - 1] ?? null;
          setActiveTabId(fallback);
          if (fallback) {
            if (panelsRef.current[fallback]) {
              replaceUrl(getWorkspaceTabMeta(fallback).href);
            } else {
              router.push(getWorkspaceTabMeta(fallback).href);
            }
          }
        }
        return next;
      });
    },
    [activeTabId, replaceUrl, router],
  );

  const setPanelContent = useCallback((tabId: WorkspaceTabId, content: ReactNode) => {
    setPanels((prev) => ({ ...prev, [tabId]: content }));
  }, []);

  const value = useMemo(
    () => ({
      availableTabs,
      openTabIds,
      activeTabId,
      panels,
      closedTabIds,
      activateTab,
      openTab,
      closeTab,
      setPanelContent,
    }),
    [
      availableTabs,
      openTabIds,
      activeTabId,
      panels,
      closedTabIds,
      activateTab,
      openTab,
      closeTab,
      setPanelContent,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}
