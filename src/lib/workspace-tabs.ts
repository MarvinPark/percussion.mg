import { hasPermission, type Permission } from "@/lib/permissions";
import type { UserRole } from "@/types/profile";

export type WorkspaceTabId = "products" | "sales" | "quotes";

export type WorkspaceTabMeta = {
  id: WorkspaceTabId;
  href: string;
  label: string;
  permission?: Permission;
};

export const WORKSPACE_TAB_META: WorkspaceTabMeta[] = [
  { id: "products", href: "/products", label: "재고", permission: "viewProducts" },
  { id: "sales", href: "/sales", label: "매출", permission: "viewSales" },
  { id: "quotes", href: "/quotes", label: "견적", permission: "viewQuotes" },
];

export function getAvailableWorkspaceTabs(role: UserRole): WorkspaceTabMeta[] {
  return WORKSPACE_TAB_META.filter(
    (tab) => !tab.permission || hasPermission(role, tab.permission),
  );
}

export function isWorkspacePath(pathname: string) {
  return (
    pathname === "/products" ||
    pathname.startsWith("/products/") ||
    pathname === "/sales" ||
    pathname.startsWith("/sales/") ||
    pathname === "/quotes" ||
    pathname.startsWith("/quotes/")
  );
}

export function getWorkspaceTabIdFromPath(pathname: string): WorkspaceTabId | null {
  if (pathname.startsWith("/products")) return "products";
  if (pathname.startsWith("/sales")) return "sales";
  if (pathname.startsWith("/quotes")) return "quotes";
  return null;
}

export function getWorkspaceTabMeta(id: WorkspaceTabId) {
  return WORKSPACE_TAB_META.find((tab) => tab.id === id)!;
}

const OPEN_TABS_STORAGE_KEY = "percy-workspace-open-tabs";

export function readStoredOpenTabs(): WorkspaceTabId[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = sessionStorage.getItem(OPEN_TABS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (value): value is WorkspaceTabId =>
        value === "products" || value === "sales" || value === "quotes",
    );
  } catch {
    return [];
  }
}

export function writeStoredOpenTabs(tabIds: WorkspaceTabId[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(OPEN_TABS_STORAGE_KEY, JSON.stringify(tabIds));
}
