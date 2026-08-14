import type { Product } from "@/types/product";
import type { SaleProductOption } from "@/types/sale";

export function saleProductSearchHaystack(
  product: Pick<
    SaleProductOption,
    "sku" | "category" | "model_name" | "product_name" | "keywords" | "supplier"
  >,
): string {
  return [
    product.sku,
    product.category,
    product.model_name,
    product.product_name,
    product.keywords,
    product.supplier,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function matchesSaleProductSearch(
  product: Pick<
    SaleProductOption,
    "sku" | "category" | "model_name" | "product_name" | "keywords" | "supplier"
  >,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return saleProductSearchHaystack(product).includes(normalized);
}

export function productSearchHaystack(product: Product): string {
  return [
    product.supplier,
    product.category,
    product.brand,
    product.product_name,
    product.model_name,
    product.sku,
    product.keywords,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function matchesProductSearch(product: Product, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return productSearchHaystack(product).includes(normalized);
}

export function filterProducts(products: Product[], query: string): Product[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return products;
  return products.filter((product) => matchesProductSearch(product, normalized));
}
