export type KeyStockColumnFilter = {
  category: string;
  brand: string;
};

export const MIN_KEY_STOCK_SECTION_COUNT = 2;
export const MAX_KEY_STOCK_SECTION_COUNT = 2;
export const DEFAULT_KEY_STOCK_SECTION_COUNT = 2;
export const FIXED_KEY_STOCK_SECTION_COUNT = 2;

export const EMPTY_KEY_STOCK_COLUMN_FILTERS: KeyStockColumnFilter[] = Array.from(
  { length: DEFAULT_KEY_STOCK_SECTION_COUNT },
  () => ({ category: "", brand: "" }),
);

export function createEmptyKeyStockColumnFilters(
  count: number,
): KeyStockColumnFilter[] {
  const safeCount = clampKeyStockSectionCount(count);
  return Array.from({ length: safeCount }, () => ({ category: "", brand: "" }));
}

export function clampKeyStockSectionCount(value: number): number {
  void value;
  return FIXED_KEY_STOCK_SECTION_COUNT;
}

export function getKeyStockFilterStorageKey(userId: string) {
  return `pc-key-stock-column-filters-${userId}`;
}

export function getKeyStockSectionCountStorageKey(userId: string) {
  return `pc-key-stock-section-count-${userId}`;
}

function isValidFilter(value: unknown): value is KeyStockColumnFilter {
  if (!value || typeof value !== "object") return false;
  const filter = value as KeyStockColumnFilter;
  return typeof filter.category === "string" && typeof filter.brand === "string";
}

export function loadKeyStockSectionCount(userId: string): number {
  if (typeof window === "undefined") {
    return DEFAULT_KEY_STOCK_SECTION_COUNT;
  }

  try {
    const raw = localStorage.getItem(getKeyStockSectionCountStorageKey(userId));
    if (!raw) return DEFAULT_KEY_STOCK_SECTION_COUNT;
    return clampKeyStockSectionCount(Number(raw));
  } catch {
    return DEFAULT_KEY_STOCK_SECTION_COUNT;
  }
}

export function saveKeyStockSectionCount(userId: string, count: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    getKeyStockSectionCountStorageKey(userId),
    String(clampKeyStockSectionCount(count)),
  );
}

export function loadKeyStockColumnFilters(
  userId: string,
  sectionCount = DEFAULT_KEY_STOCK_SECTION_COUNT,
): KeyStockColumnFilter[] {
  const safeCount = clampKeyStockSectionCount(sectionCount);
  const emptyFilters = createEmptyKeyStockColumnFilters(safeCount);

  if (typeof window === "undefined") {
    return emptyFilters;
  }

  try {
    const raw = localStorage.getItem(getKeyStockFilterStorageKey(userId));
    if (!raw) {
      return emptyFilters;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return emptyFilters;
    }

    return emptyFilters.map((fallback, index) => {
      const item = parsed[index];
      if (!isValidFilter(item)) {
        return { ...fallback };
      }
      return {
        category: item.category,
        brand: item.brand,
      };
    });
  } catch {
    return emptyFilters;
  }
}

export function saveKeyStockColumnFilters(
  userId: string,
  filters: KeyStockColumnFilter[],
) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getKeyStockFilterStorageKey(userId), JSON.stringify(filters));
}

export function resizeKeyStockColumnFilters(
  filters: KeyStockColumnFilter[],
  nextCount: number,
): KeyStockColumnFilter[] {
  const safeCount = clampKeyStockSectionCount(nextCount);
  if (filters.length === safeCount) {
    return filters.map((filter) => ({ ...filter }));
  }

  if (filters.length < safeCount) {
    return [
      ...filters.map((filter) => ({ ...filter })),
      ...createEmptyKeyStockColumnFilters(safeCount - filters.length),
    ];
  }

  return filters.slice(0, safeCount).map((filter) => ({ ...filter }));
}
