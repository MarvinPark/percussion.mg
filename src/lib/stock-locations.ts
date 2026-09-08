export const STOCK_LOCATIONS = ["양재", "의왕"] as const;

export type StockLocation = (typeof STOCK_LOCATIONS)[number];

export const STOCK_LOCATION_FIELD = {
  양재: "stock_yangjae",
  의왕: "stock_uiwang",
} as const satisfies Record<StockLocation, string>;

export type StockLocationField =
  (typeof STOCK_LOCATION_FIELD)[StockLocation];

export type LocationStockProduct = {
  stock_location: StockLocation | string | null;
  stock_yangjae: number;
  stock_uiwang: number;
  stock_quantity: number;
};

const LEGACY_STOCK_LOCATIONS: Record<string, StockLocation> = {
  "3층": "양재",
  B1: "양재",
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
  return "양재";
}

export function isStockLocation(value: string): value is StockLocation {
  return (STOCK_LOCATIONS as readonly string[]).includes(value);
}

export function getLocationStock(
  product: LocationStockProduct,
  location: StockLocation,
): number {
  switch (location) {
    case "양재":
      return product.stock_yangjae;
    case "의왕":
      return product.stock_uiwang;
  }
}

export function sumLocationStock(
  product: Pick<LocationStockProduct, "stock_yangjae" | "stock_uiwang">,
): number {
  return product.stock_yangjae + product.stock_uiwang;
}

/** 위치별 재고 중 수량이 가장 많은 곳을 등록 위치로 사용합니다. */
export function inferPrimaryStockLocation(
  product: Pick<LocationStockProduct, "stock_yangjae" | "stock_uiwang">,
): StockLocation {
  let best: StockLocation = "양재";
  let bestQty = -1;

  for (const location of STOCK_LOCATIONS) {
    const qty = getLocationStock(
      { ...product, stock_location: "양재", stock_quantity: 0 },
      location,
    );
    if (qty > bestQty) {
      bestQty = qty;
      best = location;
    }
  }

  return best;
}

export function locationStockRecord(
  product: LocationStockProduct,
): Record<StockLocation, number> {
  return {
    양재: product.stock_yangjae,
    의왕: product.stock_uiwang,
  };
}

export function formatLocationStockSummary(product: LocationStockProduct): string {
  return STOCK_LOCATIONS.map(
    (location) => `${location} ${getLocationStock(product, location)}`,
  ).join(" · ");
}

export type LocationStockPatch = Pick<
  LocationStockProduct,
  "stock_yangjae" | "stock_uiwang"
>;

/**
 * 재고를 양재 → 의왕 순서로 차감합니다.
 *
 * 차감 순서는 제품의 등록 위치(stock_location)와 무관하게 항상 고정입니다.
 * allowNegative면 부족분은 양재에 마이너스로 남습니다.
 */
export function deductLocationStock(
  product: LocationStockProduct,
  quantity: number,
  allowNegative = true,
): { next: LocationStockPatch; taken: LocationStockPatch } | null {
  if (quantity <= 0) {
    return {
      next: {
        stock_yangjae: product.stock_yangjae,
        stock_uiwang: product.stock_uiwang,
      },
      taken: { stock_yangjae: 0, stock_uiwang: 0 },
    };
  }

  let remaining = quantity;
  const stocks = locationStockRecord(product);
  const taken: Record<StockLocation, number> = { 양재: 0, 의왕: 0 };

  for (const location of STOCK_LOCATIONS) {
    if (remaining <= 0) break;
    const available = stocks[location];
    const take = Math.min(available, remaining);
    stocks[location] -= take;
    taken[location] += take;
    remaining -= take;
  }

  if (remaining > 0) {
    if (!allowNegative) return null;
    const sink: StockLocation = "양재";
    stocks[sink] -= remaining;
    taken[sink] += remaining;
  }

  return {
    next: {
      stock_yangjae: stocks.양재,
      stock_uiwang: stocks.의왕,
    },
    taken: {
      stock_yangjae: taken.양재,
      stock_uiwang: taken.의왕,
    },
  };
}

/** 예약 해제 시 기록된 위치별 수량을 되돌립니다. */
export function restoreLocationStockFromTaken(
  product: LocationStockProduct,
  taken: LocationStockPatch,
): LocationStockPatch {
  return {
    stock_yangjae: product.stock_yangjae + (taken.stock_yangjae || 0),
    stock_uiwang: product.stock_uiwang + (taken.stock_uiwang || 0),
  };
}

/** 입고 시 등록 위치에 추가 */
export function addLocationStock(
  product: LocationStockProduct,
  quantity: number,
): LocationStockPatch {
  const location = normalizeStockLocation(product.stock_location);

  return addLocationStockAt(product, quantity, location);
}

/** 입고 시 지정 위치에 추가 */
export function addLocationStockAt(
  product: LocationStockProduct,
  quantity: number,
  location: StockLocation,
): LocationStockPatch {
  const stocks = locationStockRecord(product);
  stocks[location] += quantity;

  return {
    stock_yangjae: stocks.양재,
    stock_uiwang: stocks.의왕,
  };
}

/** 위치별 재고 합계와 stock_quantity 동기화 */
export function withSyncedTotalStock<T extends LocationStockProduct>(
  product: T,
  locationPatch?: Partial<LocationStockPatch>,
): T & { stock_quantity: number } {
  const merged = { ...product, ...locationPatch };
  return {
    ...merged,
    stock_quantity: sumLocationStock(merged),
  };
}
