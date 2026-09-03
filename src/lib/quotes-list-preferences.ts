import {
  parseTablePageSize,
  TABLE_PAGE_SIZE,
  type TablePageSize,
} from "@/lib/table-page-size";

export const QUOTE_LIST_SECTION_IDS = [
  "favorites",
  "quoteCompleted",
  "salesCompleted",
] as const;

export type QuoteListSectionId = (typeof QUOTE_LIST_SECTION_IDS)[number];

export type QuoteListSectionPageSizes = Record<
  QuoteListSectionId,
  TablePageSize
>;

export const DEFAULT_QUOTE_LIST_SECTION_PAGE_SIZES: QuoteListSectionPageSizes = {
  favorites: TABLE_PAGE_SIZE,
  quoteCompleted: TABLE_PAGE_SIZE,
  salesCompleted: TABLE_PAGE_SIZE,
};

export function getQuotesPageSizeStorageKey(userId: string) {
  return `pc-quotes-page-size-${userId}`;
}

function getQuotesSectionPageSizeStorageKey(
  userId: string,
  sectionId: QuoteListSectionId,
) {
  return `pc-quotes-page-size-${sectionId}-${userId}`;
}

export function loadQuotesSectionPageSize(
  userId: string,
  sectionId: QuoteListSectionId,
): TablePageSize {
  if (typeof window === "undefined") {
    return DEFAULT_QUOTE_LIST_SECTION_PAGE_SIZES[sectionId];
  }

  try {
    const sectionRaw = localStorage.getItem(
      getQuotesSectionPageSizeStorageKey(userId, sectionId),
    );
    if (sectionRaw) return parseTablePageSize(sectionRaw);
  } catch {
    // ignore storage errors
  }

  return DEFAULT_QUOTE_LIST_SECTION_PAGE_SIZES[sectionId];
}

export function loadQuotesSectionPageSizes(
  userId: string,
): QuoteListSectionPageSizes {
  return {
    favorites: loadQuotesSectionPageSize(userId, "favorites"),
    quoteCompleted: loadQuotesSectionPageSize(userId, "quoteCompleted"),
    salesCompleted: loadQuotesSectionPageSize(userId, "salesCompleted"),
  };
}

export function saveQuotesSectionPageSize(
  userId: string,
  sectionId: QuoteListSectionId,
  pageSize: TablePageSize,
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    getQuotesSectionPageSizeStorageKey(userId, sectionId),
    String(pageSize),
  );
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
