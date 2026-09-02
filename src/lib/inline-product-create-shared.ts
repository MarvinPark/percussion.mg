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
    stock_floor3: 0,
    stock_b1: 0,
    stock_display: 0,
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
    stock_floor3: 0,
    stock_b1: 0,
    stock_display: 0,
    reserved_quantity: 0,
  };
}
