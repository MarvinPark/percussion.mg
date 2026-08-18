import type { UserRole } from "@/types/profile";

export type Permission =
  | "viewProducts"
  | "manageProducts"
  | "viewSales"
  | "createSales"
  | "manageSales"
  | "viewQuotes"
  | "manageQuotes"
  | "manageUsers"
  | "managePaymentMethods";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "관리자",
  manager: "매니저",
  employee: "직원",
};

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  admin: [
    "viewProducts",
    "manageProducts",
    "viewSales",
    "createSales",
    "manageSales",
    "viewQuotes",
    "manageQuotes",
    "manageUsers",
    "managePaymentMethods",
  ],
  manager: [
    "viewProducts",
    "manageProducts",
    "viewSales",
    "createSales",
    "manageSales",
    "viewQuotes",
    "manageQuotes",
  ],
  employee: ["viewProducts", "viewSales", "createSales"],
};

export function normalizeRole(value: string | null | undefined): UserRole {
  if (value === "admin" || value === "manager" || value === "employee") {
    return value;
  }
  return "employee";
}

export function hasPermission(role: UserRole, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAccessPath(role: UserRole, pathname: string) {
  if (pathname.startsWith("/settings/users")) {
    return hasPermission(role, "manageUsers");
  }

  if (pathname.startsWith("/quotes")) {
    return hasPermission(role, "viewQuotes");
  }

  if (pathname.startsWith("/sales/payment-methods")) {
    return hasPermission(role, "managePaymentMethods");
  }

  if (
    pathname === "/products/new" ||
    /^\/products\/[^/]+\/edit\/?$/.test(pathname) ||
    pathname.startsWith("/products/stock") ||
    pathname.startsWith("/products/history")
  ) {
    return hasPermission(role, "manageProducts");
  }

  return true;
}

export type NavItem = {
  href: string;
  label: string;
  permission?: Permission;
};

export const ALL_NAV_ITEMS: NavItem[] = [
  {
    href: "/products/key-stock",
    label: "주요재고",
    permission: "viewProducts",
  },
  { href: "/settings/users", label: "관리자", permission: "manageUsers" },
  { href: "/my-page", label: "마이페이지" },
];

export function getNavItems(role: UserRole) {
  return ALL_NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(role, item.permission),
  );
}
