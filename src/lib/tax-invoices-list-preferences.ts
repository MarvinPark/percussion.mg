import {
  parseTablePageSize,
  TABLE_PAGE_SIZE,
  type TablePageSize,
} from "@/lib/table-page-size";

export function getTaxInvoicesPageSizeStorageKey(userId: string) {
  return `pc-tax-invoices-page-size-${userId}`;
}

export function loadTaxInvoicesPageSize(userId: string): TablePageSize {
  if (typeof window === "undefined") return TABLE_PAGE_SIZE;

  try {
    const raw = localStorage.getItem(getTaxInvoicesPageSizeStorageKey(userId));
    if (!raw) return TABLE_PAGE_SIZE;
    return parseTablePageSize(raw);
  } catch {
    return TABLE_PAGE_SIZE;
  }
}

export function saveTaxInvoicesPageSize(userId: string, pageSize: TablePageSize) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getTaxInvoicesPageSizeStorageKey(userId), String(pageSize));
}
