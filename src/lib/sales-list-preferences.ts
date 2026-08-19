import {
  parseTablePageSize,
  TABLE_PAGE_SIZE,
  type TablePageSize,
} from "@/lib/table-page-size";

export function getSalesPageSizeStorageKey(userId: string) {
  return `pc-sales-page-size-${userId}`;
}

export function loadSalesPageSize(userId: string): TablePageSize {
  if (typeof window === "undefined") return TABLE_PAGE_SIZE;

  try {
    const raw = localStorage.getItem(getSalesPageSizeStorageKey(userId));
    if (!raw) return TABLE_PAGE_SIZE;
    return parseTablePageSize(raw);
  } catch {
    return TABLE_PAGE_SIZE;
  }
}

export function saveSalesPageSize(userId: string, pageSize: TablePageSize) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getSalesPageSizeStorageKey(userId), String(pageSize));
}
