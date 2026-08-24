import {
  parseTablePageSize,
  TABLE_PAGE_SIZE,
  type TablePageSize,
} from "@/lib/table-page-size";

export function getStockHistoryPageSizeStorageKey(userId: string) {
  return `pc-stock-history-page-size-${userId}`;
}

export function loadStockHistoryPageSize(userId: string): TablePageSize {
  if (typeof window === "undefined") return TABLE_PAGE_SIZE;

  try {
    const raw = localStorage.getItem(getStockHistoryPageSizeStorageKey(userId));
    if (!raw) return TABLE_PAGE_SIZE;
    return parseTablePageSize(raw);
  } catch {
    return TABLE_PAGE_SIZE;
  }
}

export function saveStockHistoryPageSize(userId: string, pageSize: TablePageSize) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getStockHistoryPageSizeStorageKey(userId), String(pageSize));
}
