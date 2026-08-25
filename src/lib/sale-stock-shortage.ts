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

    const product = selectedProductsByLine[line.id];
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
