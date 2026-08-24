import {
  parseTablePageSize,
  TABLE_PAGE_SIZE,
  type TablePageSize,
} from "@/lib/table-page-size";

export function getStockInPageSizeStorageKey(userId: string) {
  return `pc-stock-in-page-size-${userId}`;
}

export function loadStockInPageSize(userId: string): TablePageSize {
  if (typeof window === "undefined") return TABLE_PAGE_SIZE;

  try {
    const raw = localStorage.getItem(getStockInPageSizeStorageKey(userId));
    if (!raw) return TABLE_PAGE_SIZE;
    return parseTablePageSize(raw);
  } catch {
    return TABLE_PAGE_SIZE;
  }
}

export function saveStockInPageSize(userId: string, pageSize: TablePageSize) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getStockInPageSizeStorageKey(userId), String(pageSize));
}
