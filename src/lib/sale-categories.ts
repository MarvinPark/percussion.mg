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

export function formatSaleCategoryDbError(
  message: string,
  table: "quotes" | "sales",
): string | null {
  if (!message.includes("sale_category")) return null;

  if (
    message.includes("violates check constraint") ||
    message.includes("_sale_category_check")
  ) {
    return `${
      table === "quotes" ? "견적" : "매출"
    } 구분 값을 저장할 수 없습니다. Supabase SQL Editor에서 supabase/schema-sale-category-rental.sql을 실행해 주세요.`;
  }

  if (table === "quotes") {
    return "quotes 테이블에 구분(sale_category) 컬럼이 없습니다. Supabase SQL Editor에서 supabase/schema-quotes-sale-category.sql을 실행해 주세요.";
  }

  return "sales 테이블에 sale_category 컬럼이 없습니다. supabase/schema-sales-category.sql을 실행해 주세요.";
}
