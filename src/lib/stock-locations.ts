export const STOCK_LOCATIONS = ["3층", "B1", "의왕"] as const;

export type StockLocation = (typeof STOCK_LOCATIONS)[number];

export const STOCK_LOCATION_FIELD = {
  "3층": "stock_floor3",
  B1: "stock_b1",
  의왕: "stock_display",
} as const satisfies Record<StockLocation, string>;

export type StockLocationField =
  (typeof STOCK_LOCATION_FIELD)[StockLocation];

export type LocationStockProduct = {
  stock_location: StockLocation | string | null;
  stock_floor3: number;
  stock_b1: number;
  stock_display: number;
  stock_quantity: number;
};

const LEGACY_STOCK_LOCATIONS: Record<string, StockLocation> = {
  전시: "의왕",
};

export function normalizeStockLocation(value: string | null | undefined): StockLocation {
  const trimmed = value?.trim() ?? "";
  if (LEGACY_STOCK_LOCATIONS[trimmed]) {
    return LEGACY_STOCK_LOCATIONS[trimmed];
  }
  if (isStockLocation(trimmed)) {
    return trimmed;
  }
  return "3층";
}

export function isStockLocation(value: string): value is StockLocation {
  return (STOCK_LOCATIONS as readonly string[]).includes(value);
}

export function getLocationStock(
  product: LocationStockProduct,
  location: StockLocation,
): number {
  switch (location) {
    case "3층":
      return product.stock_floor3;
    case "B1":
      return product.stock_b1;
    case "의왕":
      return product.stock_display;
  }
}

export function sumLocationStock(product: LocationStockProduct): number {
  return product.stock_floor3 + product.stock_b1 + product.stock_display;
}

export function locationStockRecord(
  product: LocationStockProduct,
): Record<StockLocation, number> {
  return {
    "3층": product.stock_floor3,
    B1: product.stock_b1,
    의왕: product.stock_display,
  };
}

export function formatLocationStockSummary(product: LocationStockProduct): string {
  return STOCK_LOCATIONS.map(
    (location) => `${location} ${getLocationStock(product, location)}`,
  ).join(" · ");
}

/** 출고 시 위치별 재고에서 차감 (등록 위치 우선, 이후 3층 → B1 → 의왕). allowNegative이면 부족분을 등록 위치에서 마이너스 처리 */
export function deductLocationStock(
  product: LocationStockProduct,
  quantity: number,
  allowNegative = false,
): Pick<LocationStockProduct, "stock_floor3" | "stock_b1" | "stock_display"> | null {
  if (quantity <= 0) {
    return {
      stock_floor3: product.stock_floor3,
      stock_b1: product.stock_b1,
      stock_display: product.stock_display,
    };
  }

  let remaining = quantity;
  const stocks: Record<StockLocation, number> = locationStockRecord(product);

  const order: StockLocation[] = [];
  const primary = normalizeStockLocation(product.stock_location);
  order.push(primary);
  for (const location of STOCK_LOCATIONS) {
    if (!order.includes(location)) order.push(location);
  }

  for (const location of order) {
    if (remaining <= 0) break;
    const take = Math.min(stocks[location], remaining);
    stocks[location] -= take;
    remaining -= take;
  }

  if (remaining > 0) {
    if (!allowNegative) return null;
    stocks[primary] -= remaining;
  }

  return {
    stock_floor3: stocks["3층"],
    stock_b1: stocks.B1,
    stock_display: stocks.의왕,
  };
}

/** 입고 시 등록 위치에 추가 */
export function addLocationStock(
  product: LocationStockProduct,
  quantity: number,
): Pick<LocationStockProduct, "stock_floor3" | "stock_b1" | "stock_display"> {
  const location = normalizeStockLocation(product.stock_location);

  return addLocationStockAt(product, quantity, location);
}

/** 입고 시 지정 위치에 추가 */
export function addLocationStockAt(
  product: LocationStockProduct,
  quantity: number,
  location: StockLocation,
): Pick<LocationStockProduct, "stock_floor3" | "stock_b1" | "stock_display"> {
  const stocks = locationStockRecord(product);
  stocks[location] += quantity;

  return {
    stock_floor3: stocks["3층"],
    stock_b1: stocks.B1,
    stock_display: stocks.의왕,
  };
}

/** 위치별 재고 합계와 stock_quantity 동기화 */
export function withSyncedTotalStock<T extends LocationStockProduct>(
  product: T,
  locationPatch?: Partial<
    Pick<LocationStockProduct, "stock_floor3" | "stock_b1" | "stock_display">
  >,
): T & { stock_quantity: number } {
  const merged = { ...product, ...locationPatch };
  return {
    ...merged,
    stock_quantity: sumLocationStock(merged),
  };
}
