import type { Product } from "@/types/product";
import type { SaleProductOption } from "@/types/sale";

export function productToSaleProductOption(product: Product): SaleProductOption {
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
  };
}
