import type { ProductInlineField } from "@/app/(main)/products/actions";
import { parsePriceInput } from "@/lib/sales-calculator";
import type { Product } from "@/types/product";

/** 인라인 수정 후 목록 state를 즉시 반영합니다. (전체 새로고침 없음) */
export function applyProductInlineFieldUpdate(
  product: Product,
  field: ProductInlineField,
  rawValue: string,
): Product {
  const next = { ...product };

  switch (field) {
    case "supplier":
      next.supplier = rawValue.trim();
      break;
    case "category":
      next.category = rawValue.trim() || null;
      break;
    case "brand":
      next.brand = rawValue.trim() || null;
      break;
    case "product_name":
      next.product_name = rawValue.trim();
      break;
    case "model_name":
      next.model_name = rawValue.trim();
      break;
    case "sku":
      next.sku = rawValue.trim();
      break;
    case "stock_yangjae": {
      const value = Number(rawValue) || 0;
      next.stock_yangjae = value;
      next.stock_quantity = value + next.stock_uiwang;
      break;
    }
    case "stock_uiwang": {
      const value = Number(rawValue) || 0;
      next.stock_uiwang = value;
      next.stock_quantity = next.stock_yangjae + value;
      break;
    }
    case "reserved_quantity":
      break;
    case "stock_quantity":
      next.stock_quantity = Number(rawValue.replace(/,/g, "")) || 0;
      break;
    case "sale_price":
    case "purchase_price":
      next[field] = parsePriceInput(rawValue);
      break;
  }

  return next;
}
