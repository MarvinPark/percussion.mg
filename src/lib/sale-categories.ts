export const SALE_CATEGORIES = ["도매", "소매", "VIP", "중고", "렌탈"] as const;

export type SaleCategory = (typeof SALE_CATEGORIES)[number];

export const DEFAULT_SALE_CATEGORY: SaleCategory = "소매";

export function isSaleCategory(value: string): value is SaleCategory {
  return (SALE_CATEGORIES as readonly string[]).includes(value);
}

export function parseSaleCategory(value: string): SaleCategory | null {
  const trimmed = value.trim();
  return isSaleCategory(trimmed) ? trimmed : null;
}

export function displaySaleCategory(value: string | null | undefined): SaleCategory {
  if (value && isSaleCategory(value)) return value;
  return DEFAULT_SALE_CATEGORY;
}
