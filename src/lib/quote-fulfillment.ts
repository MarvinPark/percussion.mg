export const FULFILLMENT_LOCATIONS = ["직발송", "매장"] as const;

export type FulfillmentLocation = (typeof FULFILLMENT_LOCATIONS)[number];

export const DEFAULT_FULFILLMENT_LOCATION: FulfillmentLocation = "매장";

/** 재고를 건드리지 않는 서비스 품목 키워드 (제품명·모델명·품목) */
export const NON_STOCK_SERVICE_KEYWORDS = ["배송비", "출장비"] as const;

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
 * 택배 배송비·출장비처럼 판매·예약 시 재고 변동이 없어야 하는 서비스 품목인지 판별합니다.
 */
export function isNonStockServiceItem(item: {
  model_name?: string | null;
  product_name?: string | null;
  category?: string | null;
}): boolean {
  return NON_STOCK_SERVICE_KEYWORDS.some((keyword) =>
    itemMatchesKeyword(item, keyword),
  );
}

/** @deprecated isNonStockServiceItem 사용. 기존 호출부 호환용 별칭입니다. */
export function isShippingFeeQuoteItem(item: {
  model_name?: string | null;
  product_name?: string | null;
  category?: string | null;
}): boolean {
  return isNonStockServiceItem(item);
}

export function defaultQuoteConvertPurchaseQuantity(item: {
  model_name: string;
  product_name: string;
  quantity: number;
  fulfillment_location: string;
  category?: string | null;
}): number {
  // 배송비는 기존처럼 매입 수량 기본 1. 출장비 등 다른 서비스 품목은 재고 변동 없음.
  if (itemMatchesKeyword(item, "배송비")) {
    return 1;
  }

  if (isNonStockServiceItem(item)) {
    return 0;
  }

  if (parseFulfillmentLocation(item.fulfillment_location) === "직발송") {
    return Math.max(0, Math.round(Number(item.quantity) || 0));
  }

  return 0;
}
