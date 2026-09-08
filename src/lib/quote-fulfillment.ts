import { FALLBACK_NON_STOCK_CATEGORIES } from "@/lib/non-stock-category-options";

export const FULFILLMENT_LOCATIONS = ["직발송", "매장"] as const;

export type FulfillmentLocation = (typeof FULFILLMENT_LOCATIONS)[number];

export const DEFAULT_FULFILLMENT_LOCATION: FulfillmentLocation = "매장";

/** @deprecated fetchNonStockCategoryNames / FALLBACK_NON_STOCK_CATEGORIES 사용 */
export const NON_STOCK_SERVICE_KEYWORDS = FALLBACK_NON_STOCK_CATEGORIES;

export function parseFulfillmentLocation(
  value: unknown,
): FulfillmentLocation {
  if (value === "직발송" || value === "매장") {
    return value;
  }
  return DEFAULT_FULFILLMENT_LOCATION;
}

export function isStoreFulfillment(value: unknown): boolean {
  return parseFulfillmentLocation(value) === "매장";
}

function itemTextFields(item: {
  model_name?: string | null;
  product_name?: string | null;
  category?: string | null;
}) {
  return [
    item.category?.trim() ?? "",
    item.model_name?.trim() ?? "",
    item.product_name?.trim() ?? "",
  ].filter(Boolean);
}

function itemMatchesKeyword(
  item: {
    model_name?: string | null;
    product_name?: string | null;
    category?: string | null;
  },
  keyword: string,
) {
  return itemTextFields(item).some(
    (field) => field === keyword || field.includes(keyword),
  );
}

/**
 * 설정의 재고 미반영 품목에 해당하면 견적·매출·예약 시 재고 변동을 하지 않습니다.
 * 품목(category) 일치를 우선하고, 제품명·모델명 키워드도 하위 호환으로 확인합니다.
 */
export function isNonStockServiceItem(
  item: {
    model_name?: string | null;
    product_name?: string | null;
    category?: string | null;
  },
  nonStockCategories: readonly string[] = FALLBACK_NON_STOCK_CATEGORIES,
): boolean {
  const category = item.category?.trim() ?? "";
  if (category && nonStockCategories.includes(category)) {
    return true;
  }

  return nonStockCategories.some((name) => itemMatchesKeyword(item, name));
}

/** @deprecated isNonStockServiceItem 사용. 기존 호출부 호환용 별칭입니다. */
export function isShippingFeeQuoteItem(
  item: {
    model_name?: string | null;
    product_name?: string | null;
    category?: string | null;
  },
  nonStockCategories?: readonly string[],
): boolean {
  return isNonStockServiceItem(item, nonStockCategories);
}

export function defaultQuoteConvertPurchaseQuantity(
  item: {
    model_name: string;
    product_name: string;
    quantity: number;
    fulfillment_location: string;
    category?: string | null;
  },
  nonStockCategories: readonly string[] = FALLBACK_NON_STOCK_CATEGORIES,
): number {
  if (
    nonStockCategories.includes("배송비") &&
    itemMatchesKeyword(item, "배송비")
  ) {
    return 1;
  }

  if (isNonStockServiceItem(item, nonStockCategories)) {
    return 0;
  }

  if (parseFulfillmentLocation(item.fulfillment_location) === "직발송") {
    return Math.max(0, Math.round(Number(item.quantity) || 0));
  }

  return 0;
}
