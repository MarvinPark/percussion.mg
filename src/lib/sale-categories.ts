export const SALE_CATEGORIES = ["도매", "소매", "VIP", "중고", "렌탈"] as const;

export type SaleCategory = (typeof SALE_CATEGORIES)[number];

export const DEFAULT_SALE_CATEGORY: SaleCategory = "소매";

/** 엑셀 등 외부 주문 불러오기 시 기본 구분 */
export const ONLINE_SALE_CATEGORY = "온라인";

/** DB 마이그레이션 전 정적 fallback (관리자 구분 테이블 없을 때) */
export const FALLBACK_SALE_CATEGORIES = [
  ...SALE_CATEGORIES,
  ONLINE_SALE_CATEGORY,
] as const;

export function isSaleCategory(value: string): value is SaleCategory {
  return (SALE_CATEGORIES as readonly string[]).includes(value);
}

export function parseSaleCategory(value: string): SaleCategory | null {
  const trimmed = value.trim();
  return isSaleCategory(trimmed) ? trimmed : null;
}

/** 저장된 구분 값을 그대로 표시 (빈 값만 기본값으로 대체) */
export function displaySaleCategory(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (trimmed) return trimmed;
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
    } 구분 값을 저장할 수 없습니다. 관리자 페이지에서 구분을 확인하거나 supabase/schema-admin-settings.sql을 실행해 주세요.`;
  }

  if (table === "quotes") {
    return "quotes 테이블에 구분(sale_category) 컬럼이 없습니다. Supabase SQL Editor에서 supabase/schema-quotes-sale-category.sql을 실행해 주세요.";
  }

  return "sales 테이블에 sale_category 컬럼이 없습니다. supabase/schema-sales-category.sql을 실행해 주세요.";
}
