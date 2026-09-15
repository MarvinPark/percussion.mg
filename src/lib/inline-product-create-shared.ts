import type { QuoteProductOption } from "@/types/quote";
import type { SaleProductOption } from "@/types/sale";

export type InlineProductCreateInput = {
  product_name: string;
  model_name: string;
  sku: string;
  supplier: string;
  sale_price: number;
  purchase_price: number;
  stock_quantity?: number;
  category?: string;
  brand?: string;
  color?: string;
  product_option?: string;
  size?: string;
};

const INSERTED_PRODUCT_SELECT =
  "id, product_name, model_name, sku, supplier, category, brand, keywords, color, product_option, size, sale_price, purchase_price, stock_quantity, stock_yangjae, stock_uiwang";

export type InsertedProductRecord = {
  id: string;
  product_name: string;
  model_name: string;
  sku: string;
  supplier: string;
  category: string | null;
  brand: string | null;
  keywords: string | null;
  color: string | null;
  product_option: string | null;
  size: string | null;
  sale_price: number;
  purchase_price: number;
  stock_quantity: number;
  stock_yangjae: number;
  stock_uiwang: number;
};

export function toInlineCreatedProduct(
  row: InsertedProductRecord,
): InlineCreatedProduct {
  return {
    id: row.id,
    product_name: row.product_name,
    model_name: row.model_name,
    sku: row.sku,
    supplier: row.supplier,
    category: row.category,
    brand: row.brand,
    keywords: row.keywords,
    color: row.color,
    product_option: row.product_option,
    size: row.size,
    sale_price: row.sale_price,
    purchase_price: row.purchase_price,
    stock_quantity: row.stock_quantity,
    stock_yangjae: row.stock_yangjae,
    stock_uiwang: row.stock_uiwang,
  };
}

export { INSERTED_PRODUCT_SELECT };

export type InlineCreatedProduct = {
  id: string;
  product_name: string;
  model_name: string;
  sku: string;
  supplier: string;
  category: string | null;
  brand: string | null;
  keywords: string | null;
  color: string | null;
  product_option: string | null;
  size: string | null;
  sale_price: number;
  purchase_price: number;
  stock_quantity: number;
  stock_yangjae: number;
  stock_uiwang: number;
};

export function toSaleProductOption(
  product: InlineCreatedProduct,
): SaleProductOption {
  return {
    id: product.id,
    product_name: product.product_name,
    model_name: product.model_name,
    sku: product.sku,
    category: product.category,
    brand: product.brand,
    keywords: product.keywords,
    supplier: product.supplier,
    sale_price: product.sale_price,
    purchase_price: product.purchase_price,
    stock_quantity: product.stock_quantity,
    stock_yangjae: product.stock_yangjae,
    stock_uiwang: product.stock_uiwang,
    reserved_quantity: 0,
  };
}

export function toQuoteProductOption(
  product: InlineCreatedProduct,
): QuoteProductOption {
  return {
    id: product.id,
    product_name: product.product_name,
    model_name: product.model_name,
    sku: product.sku,
    supplier: product.supplier,
    category: product.category,
    brand: product.brand,
    color: product.color,
    product_option: product.product_option,
    size: product.size,
    sale_price: product.sale_price,
    purchase_price: product.purchase_price,
    stock_quantity: product.stock_quantity,
    stock_yangjae: product.stock_yangjae,
    stock_uiwang: product.stock_uiwang,
    reserved_quantity: 0,
  };
}
