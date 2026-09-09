import {
  isNonStockServiceItem,
  isStoreFulfillment,
} from "@/lib/quote-fulfillment";
import { availableProductStock } from "@/lib/product-stock-display";

export type SaleStockApprovalItem = {
  id: string;
  model_name: string;
  product_name: string;
  fulfillment_location: string;
  quantity: number;
  current_stock: number;
  stock_after: number;
};

export type SaleStockApprovalLineInput = {
  id: string;
  product_id: string;
  model_name: string;
  product_name: string;
  category?: string | null;
  quantity: number;
  fulfillment_location: string;
  purchase_quantity?: number;
  stock_yangjae?: number | null;
  stock_uiwang?: number | null;
  stock_quantity?: number | null;
  reserved_quantity?: number | null;
};

export function computeNegativeStockApprovals(
  lines: SaleStockApprovalLineInput[],
  nonStockCategories: readonly string[] = [],
): SaleStockApprovalItem[] {
  const runningStock = new Map<string, number>();
  const approvals: SaleStockApprovalItem[] = [];

  for (const line of lines) {
    if (!line.product_id) continue;
    if (!isStoreFulfillment(line.fulfillment_location)) continue;

    if (
      isNonStockServiceItem(
        {
          category: line.category,
          model_name: line.model_name,
          product_name: line.product_name,
        },
        nonStockCategories,
      )
    ) {
      continue;
    }

    if (!runningStock.has(line.product_id)) {
      runningStock.set(
        line.product_id,
        availableProductStock({
          stock_yangjae: line.stock_yangjae,
          stock_uiwang: line.stock_uiwang,
          stock_quantity: line.stock_quantity,
          reserved_quantity: line.reserved_quantity,
        }),
      );
    }

    const currentStock = runningStock.get(line.product_id) ?? 0;
    const purchaseQuantity = Math.max(
      0,
      Math.round(Number(line.purchase_quantity) || 0),
    );
    const quantity = Math.max(0, Math.round(Number(line.quantity) || 0));
    const stockAfter = currentStock + purchaseQuantity - quantity;

    runningStock.set(line.product_id, stockAfter);

    if (stockAfter < 0) {
      approvals.push({
        id: line.id,
        model_name: line.model_name?.trim() || "-",
        product_name: line.product_name?.trim() || "-",
        fulfillment_location: line.fulfillment_location,
        quantity,
        current_stock: currentStock,
        stock_after: stockAfter,
      });
    }
  }

  return approvals;
}
