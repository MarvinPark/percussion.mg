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
