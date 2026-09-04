import type { UserRole } from "@/types/profile";

export type Permission =
  | "viewProducts"
  | "manageProducts"
  | "viewSales"
  | "createSales"
  | "manageSales"
  | "viewQuotes"
  | "manageQuotes"
  | "viewPartners"
  | "managePartners"
  | "manageUsers"
  | "managePaymentMethods";

export const ALL_PERMISSIONS: Permission[] = [
  "viewProducts",
  "manageProducts",
  "viewSales",
  "createSales",
  "manageSales",
  "viewQuotes",
  "manageQuotes",
  "viewPartners",
  "managePartners",
  "manageUsers",
  "managePaymentMethods",
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  viewProducts: "재고 조회",
  manageProducts: "재고 수정·입고",
  viewSales: "매출 조회",
  createSales: "매출 등록",
  manageSales: "매출 수정·삭제",
  viewQuotes: "견적 조회",
  manageQuotes: "견적 작성·수정",
  viewPartners: "거래처 조회",
  managePartners: "거래처 등록·수정",
  manageUsers: "사용자·권한 관리",
  managePaymentMethods: "결제수단 관리",
};

export const PERMISSION_GROUPS: {
  label: string;
  permissions: Permission[];
}[] = [
  {
    label: "재고",
    permissions: ["viewProducts", "manageProducts"],
  },
  {
    label: "매출",
    permissions: ["viewSales", "createSales", "manageSales"],
  },
  {
    label: "견적",
    permissions: ["viewQuotes", "manageQuotes"],
  },
  {
    label: "거래처",
    permissions: ["viewPartners", "managePartners"],
  },
  {
    label: "관리자 설정",
    permissions: ["manageUsers", "managePaymentMethods"],
  },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "관리자",
  manager: "매니저",
  employee: "직원",
};

/** 상단 네비 역할 뱃지 — 설정 메뉴「관리자」와 구분 */
export const ROLE_BADGE_LABELS: Record<UserRole, string> = {
  admin: "관리자",
  manager: "매니저 권한",
  employee: "직원 권한",
};

export type RolePermissionMap = Record<UserRole, Permission[]>;

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionMap = {
  admin: [
    "viewProducts",
    "manageProducts",
    "viewSales",
    "createSales",
    "manageSales",
    "viewQuotes",
    "manageQuotes",
    "viewPartners",
    "managePartners",
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
    "viewPartners",
    "managePartners",
  ],
  employee: [
    "viewProducts",
    "viewSales",
    "createSales",
    "manageSales",
    "viewQuotes",
    "manageQuotes",
    "viewPartners",
    "managePartners",
  ],
};

export function cloneRolePermissionMap(
  source: RolePermissionMap,
): RolePermissionMap {
  return {
    admin: [...source.admin],
    manager: [...source.manager],
    employee: [...source.employee],
  };
}

export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as readonly string[]).includes(value);
}

export function normalizeRole(value: string | null | undefined): UserRole {
  if (value === "admin" || value === "manager" || value === "employee") {
    return value;
  }
  return "employee";
}

export function hasPermission(
  role: UserRole,
  permission: Permission,
  permissionMap: RolePermissionMap = DEFAULT_ROLE_PERMISSIONS,
) {
  return permissionMap[role]?.includes(permission) ?? false;
}

export function canAccessPath(
  role: UserRole,
  pathname: string,
  permissionMap: RolePermissionMap = DEFAULT_ROLE_PERMISSIONS,
) {
  if (pathname.startsWith("/settings/users")) {
    return hasPermission(role, "manageUsers", permissionMap);
  }

  if (pathname.startsWith("/settings/overhead")) {
    return role === "admin";
  }

  if (pathname.startsWith("/quotes")) {
    return hasPermission(role, "viewQuotes", permissionMap);
  }

  if (pathname === "/partners/new") {
    return hasPermission(role, "managePartners", permissionMap);
  }

  if (pathname.startsWith("/partners")) {
    return hasPermission(role, "viewPartners", permissionMap);
  }

  if (pathname.startsWith("/sales/payment-methods")) {
    return hasPermission(role, "managePaymentMethods", permissionMap);
  }

  if (pathname.startsWith("/sales/tax-invoices")) {
    return hasPermission(role, "viewSales", permissionMap);
  }

  if (
    pathname === "/products/new" ||
    /^\/products\/[^/]+\/edit\/?$/.test(pathname) ||
    pathname.startsWith("/products/stock") ||
    pathname.startsWith("/products/history")
  ) {
    return hasPermission(role, "manageProducts", permissionMap);
  }

  return true;
}

export type NavItem = {
  href: string;
  label: string;
  permission?: Permission;
  adminOnly?: boolean;
};

export const ALL_NAV_ITEMS: NavItem[] = [
  { href: "/sales", label: "매출", permission: "viewSales" },
  { href: "/quotes", label: "견적", permission: "viewQuotes" },
  { href: "/products", label: "재고", permission: "viewProducts" },
  {
    href: "/products/key-stock",
    label: "주요재고",
    permission: "viewProducts",
  },
  { href: "/partners", label: "거래처", permission: "viewPartners" },
  { href: "/settings/overhead", label: "결산", adminOnly: true },
  { href: "/settings/users", label: "설정", permission: "manageUsers" },
  { href: "/my-page", label: "마이페이지" },
];

export function getNavItems(
  role: UserRole,
  permissionMap: RolePermissionMap = DEFAULT_ROLE_PERMISSIONS,
) {
  return ALL_NAV_ITEMS.filter((item) => {
    if (item.adminOnly && role !== "admin") return false;
    return (
      !item.permission || hasPermission(role, item.permission, permissionMap)
    );
  });
}
