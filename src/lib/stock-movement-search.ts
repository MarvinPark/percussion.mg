import type { StockMovementWithProduct } from "@/types/stock-movement";
import { matchesTokenSearch } from "@/lib/text-search";

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
  if (!query.trim()) return movements;

  return movements.filter((item) =>
    matchesTokenSearch(stockMovementSearchHaystack(item), query),
  );
}

/** @deprecated Use filterStockMovements */
export const filterStockInMovements = filterStockMovements;
