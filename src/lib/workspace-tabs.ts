import { hasPermission, type NavItem } from "@/lib/permissions";
import type { UserRole } from "@/types/profile";

export const WORKSPACE_TAB_ITEMS: NavItem[] = [
  { href: "/products", label: "재고", permission: "viewProducts" },
  { href: "/sales", label: "매출", permission: "viewSales" },
  { href: "/quotes", label: "견적", permission: "viewQuotes" },
];

export function getWorkspaceTabItems(role: UserRole) {
  return WORKSPACE_TAB_ITEMS.filter(
    (item) => !item.permission || hasPermission(role, item.permission),
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

export function getActiveWorkspaceTabHref(pathname: string) {
  if (pathname.startsWith("/products")) return "/products";
  if (pathname.startsWith("/sales")) return "/sales";
  if (pathname.startsWith("/quotes")) return "/quotes";
  return null;
}
