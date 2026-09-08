export type ProductStockFields = {
  stock_yangjae?: number | null;
  stock_uiwang?: number | null;
  stock_quantity?: number | null;
  reserved_quantity?: number | null;
};

/** 양재 + 의왕 실재고 */
export function grossProductStock(product: ProductStockFields): number {
  const fromLocations =
    (Number(product.stock_yangjae) || 0) +
    (Number(product.stock_uiwang) || 0);

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
    product.stock_yangjae != null ||
    product.stock_uiwang != null ||
    product.reserved_quantity != null ||
    product.stock_quantity != null
  );
}

export function formatProductStockSummaryText(product: ProductStockFields): string {
  const yangjae = Number(product.stock_yangjae) || 0;
  const uiwang = Number(product.stock_uiwang) || 0;
  const reserved = Number(product.reserved_quantity) || 0;
  const available = availableProductStock(product);

  return `양재 ${yangjae} · 의왕 ${uiwang} · 예약 ${reserved} · 가용 ${available}`;
}
