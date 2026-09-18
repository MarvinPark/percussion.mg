import type { Product } from "@/types/product";
import type { SaleProductOption } from "@/types/sale";
import { matchesTokenSearch } from "@/lib/text-search";

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
  if (!query.trim()) return true;
  return matchesTokenSearch(saleProductSearchHaystack(product), query);
}

export function formatLinkedProductDisplayLabel(
  product:
    | Partial<{
        brand: string | null;
        model_name: string | null;
        sku: string | null;
      }>
    | null
    | undefined,
): string {
  if (!product) return "";

  return [product.brand, product.model_name, product.sku]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(" · ");
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
  if (!query.trim()) return true;
  return matchesTokenSearch(productSearchHaystack(product), query);
}

export function filterProducts(products: Product[], query: string): Product[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return products;
  return products.filter((product) => matchesProductSearch(product, normalized));
}
