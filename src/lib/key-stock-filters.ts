export type KeyStockColumnFilter = {
  category: string;
  brand: string;
};

export const EMPTY_KEY_STOCK_COLUMN_FILTERS: KeyStockColumnFilter[] = [
  { category: "", brand: "" },
  { category: "", brand: "" },
  { category: "", brand: "" },
];

export function getKeyStockFilterStorageKey(userId: string) {
  return `pc-key-stock-column-filters-${userId}`;
}

function isValidFilter(value: unknown): value is KeyStockColumnFilter {
  if (!value || typeof value !== "object") return false;
  const filter = value as KeyStockColumnFilter;
  return typeof filter.category === "string" && typeof filter.brand === "string";
}

export function loadKeyStockColumnFilters(userId: string): KeyStockColumnFilter[] {
  if (typeof window === "undefined") {
    return EMPTY_KEY_STOCK_COLUMN_FILTERS.map((filter) => ({ ...filter }));
  }

  try {
    const raw = localStorage.getItem(getKeyStockFilterStorageKey(userId));
    if (!raw) {
      return EMPTY_KEY_STOCK_COLUMN_FILTERS.map((filter) => ({ ...filter }));
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 3) {
      return EMPTY_KEY_STOCK_COLUMN_FILTERS.map((filter) => ({ ...filter }));
    }

    return parsed.map((item, index) => {
      if (!isValidFilter(item)) {
        return { ...EMPTY_KEY_STOCK_COLUMN_FILTERS[index] };
      }
      return {
        category: item.category,
        brand: item.brand,
      };
    });
  } catch {
    return EMPTY_KEY_STOCK_COLUMN_FILTERS.map((filter) => ({ ...filter }));
  }
}

export function saveKeyStockColumnFilters(
  userId: string,
  filters: KeyStockColumnFilter[],
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getKeyStockFilterStorageKey(userId), JSON.stringify(filters));
}
