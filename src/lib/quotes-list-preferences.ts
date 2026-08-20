import {
  parseTablePageSize,
  TABLE_PAGE_SIZE,
  type TablePageSize,
} from "@/lib/table-page-size";

export function getQuotesPageSizeStorageKey(userId: string) {
  return `pc-quotes-page-size-${userId}`;
}

export function loadQuotesPageSize(userId: string): TablePageSize {
  if (typeof window === "undefined") return TABLE_PAGE_SIZE;

  try {
    const raw = localStorage.getItem(getQuotesPageSizeStorageKey(userId));
    if (!raw) return TABLE_PAGE_SIZE;
    return parseTablePageSize(raw);
  } catch {
    return TABLE_PAGE_SIZE;
  }
}

export function saveQuotesPageSize(userId: string, pageSize: TablePageSize) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getQuotesPageSizeStorageKey(userId), String(pageSize));
}

export function getQuoteFavoritesStorageKey(userId: string) {
  return `pc-quote-favorites-${userId}`;
}

export function loadQuoteFavoriteIds(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();

  try {
    const raw = localStorage.getItem(getQuoteFavoritesStorageKey(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

export function saveQuoteFavoriteIds(userId: string, ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    getQuoteFavoritesStorageKey(userId),
    JSON.stringify([...ids]),
  );
}
