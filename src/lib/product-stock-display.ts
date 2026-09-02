export type ProductStockFields = {
  stock_floor3?: number | null;
  stock_b1?: number | null;
  stock_display?: number | null;
  stock_quantity?: number | null;
  reserved_quantity?: number | null;
};

/** 3층 + B1 + 의왕 실재고 */
export function grossProductStock(product: ProductStockFields): number {
  const fromLocations =
    (Number(product.stock_floor3) || 0) +
    (Number(product.stock_b1) || 0) +
    (Number(product.stock_display) || 0);

  if (fromLocations > 0) {
    return fromLocations;
  }

  return Number(product.stock_quantity) || 0;
}

/** 가용재고 = 위치별 실재고 (예약 시 이미 위치에서 차감됨) */
export function availableProductStock(product: ProductStockFields): number {
  return grossProductStock(product);
}

export function hasProductStockSummaryData(product: ProductStockFields): boolean {
  return (
    product.stock_floor3 != null ||
    product.stock_b1 != null ||
    product.stock_display != null ||
    product.reserved_quantity != null ||
    product.stock_quantity != null
  );
}

export function formatProductStockSummaryText(product: ProductStockFields): string {
  const floor3 = Number(product.stock_floor3) || 0;
  const b1 = Number(product.stock_b1) || 0;
  const uiwang = Number(product.stock_display) || 0;
  const reserved = Number(product.reserved_quantity) || 0;
  const available = availableProductStock(product);

  return `3층 ${floor3} · B1 ${b1} · 의왕 ${uiwang} · 예약 ${reserved} · 가용 ${available}`;
}
