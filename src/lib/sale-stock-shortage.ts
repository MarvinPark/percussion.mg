import { isStoreFulfillment } from "@/lib/quote-fulfillment";
import type { SaleProductOption } from "@/types/sale";

export type SaleStockPurchaseItem = {
  id: string;
  model_name: string;
  product_name: string;
  quantity: number;
  fulfillment_location: string;
  purchase_price: number;
  current_stock: number;
  default_purchase_quantity: number;
};

type SaleLineForStockCheck = {
  id: string;
  productId: string;
  quantity: number;
  unitPurchasePrice: number;
  fulfillmentLocation: string;
};

export function getInsufficientStockLines(
  lines: SaleLineForStockCheck[],
  selectedProductsByLine: Record<string, SaleProductOption>,
): SaleStockPurchaseItem[] {
  const items: SaleStockPurchaseItem[] = [];

  for (const line of lines) {
    if (!line.productId) continue;
    if (!isStoreFulfillment(line.fulfillmentLocation)) continue;

    const product = findProductForLine(line, selectedProductsByLine);
    if (!product) continue;

    const currentStock = Number(product.stock_quantity) || 0;
    if (currentStock >= line.quantity) continue;

    items.push({
      id: line.id,
      model_name: product.model_name?.trim() || "-",
      product_name: product.product_name?.trim() || "-",
      quantity: line.quantity,
      fulfillment_location: line.fulfillmentLocation,
      purchase_price: line.unitPurchasePrice,
      current_stock: currentStock,
      default_purchase_quantity: Math.max(0, line.quantity - currentStock),
    });
  }

  return items;
}

export function buildPurchaseQuantitiesArray(
  lines: SaleLineForStockCheck[],
  purchaseQuantitiesByLineId: Record<string, number>,
): number[] {
  return lines
    .filter((line) => line.productId)
    .map((line) => Math.max(0, Math.round(purchaseQuantitiesByLineId[line.id] ?? 0)));
}

export type SaleStockCheckResultItem = Omit<SaleStockPurchaseItem, "id"> & {
  lineIndex: number;
};

export function mapStockCheckItemsToLines(
  items: SaleStockCheckResultItem[],
  lines: SaleLineForStockCheck[],
): SaleStockPurchaseItem[] {
  const activeLines = lines.filter((line) => line.productId);

  return items.map((item) => ({
    id: activeLines[item.lineIndex]?.id ?? String(item.lineIndex),
    model_name: item.model_name,
    product_name: item.product_name,
    quantity: item.quantity,
    fulfillment_location: item.fulfillment_location,
    purchase_price: item.purchase_price,
    current_stock: item.current_stock,
    default_purchase_quantity: item.default_purchase_quantity,
  }));
}

export function findProductForLine(
  line: SaleLineForStockCheck,
  selectedProductsByLine: Record<string, SaleProductOption>,
): SaleProductOption | null {
  if (selectedProductsByLine[line.id]) {
    return selectedProductsByLine[line.id] ?? null;
  }

  return (
    Object.values(selectedProductsByLine).find(
      (product) => product.id === line.productId,
    ) ?? null
  );
}
