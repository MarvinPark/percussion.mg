export const FULFILLMENT_LOCATIONS = ["직발송", "매장"] as const;

export type FulfillmentLocation = (typeof FULFILLMENT_LOCATIONS)[number];

export const DEFAULT_FULFILLMENT_LOCATION: FulfillmentLocation = "매장";

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

export function isShippingFeeQuoteItem(item: {
  model_name: string;
  product_name: string;
}): boolean {
  const model = item.model_name?.trim() ?? "";
  const product = item.product_name?.trim() ?? "";
  return model === "배송비" || product === "배송비";
}

export function defaultQuoteConvertPurchaseQuantity(item: {
  model_name: string;
  product_name: string;
  quantity: number;
  fulfillment_location: string;
}): number {
  if (isShippingFeeQuoteItem(item)) {
    return 1;
  }

  if (parseFulfillmentLocation(item.fulfillment_location) === "직발송") {
    return Math.max(0, Math.round(Number(item.quantity) || 0));
  }

  return 0;
}
