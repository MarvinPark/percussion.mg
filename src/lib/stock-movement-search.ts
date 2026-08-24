import type { StockMovementWithProduct } from "@/types/stock-movement";

function stockMovementSearchHaystack(item: StockMovementWithProduct): string {
  const product = item.products;

  return [
    product?.supplier,
    product?.product_name,
    product?.model_name,
    product?.sku,
    item.modified_by_name,
    item.note,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterStockMovements(
  movements: StockMovementWithProduct[],
  query: string,
): StockMovementWithProduct[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return movements;

  return movements.filter((item) =>
    stockMovementSearchHaystack(item).includes(normalized),
  );
}

/** @deprecated Use filterStockMovements */
export const filterStockInMovements = filterStockMovements;
