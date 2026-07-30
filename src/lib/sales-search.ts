import type { SaleWithProduct } from "@/types/sale";

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function matchesSalesTextSearch(
  sale: SaleWithProduct,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    sale.customer_name,
    sale.products?.product_name,
    sale.products?.model_name,
    sale.products?.sku,
  ]
    .map(normalize)
    .filter(Boolean)
    .join(" ");

  return haystack.includes(q);
}

export function filterSalesBySeller(
  sales: SaleWithProduct[],
  seller: string,
): SaleWithProduct[] {
  if (!seller.trim()) return sales;
  return sales.filter(
    (sale) => (sale.created_by_name ?? "미지정") === seller,
  );
}

export function filterSalesByTextQuery(
  sales: SaleWithProduct[],
  query: string,
): SaleWithProduct[] {
  const q = query.trim();
  if (!q) return sales;
  return sales.filter((sale) => matchesSalesTextSearch(sale, q));
}

export function filterSales(
  sales: SaleWithProduct[],
  options: { seller?: string; textQuery?: string },
): SaleWithProduct[] {
  let result = sales;
  if (options.seller?.trim()) {
    result = filterSalesBySeller(result, options.seller);
  }
  if (options.textQuery?.trim()) {
    result = filterSalesByTextQuery(result, options.textQuery);
  }
  return result;
}

export function getUniqueSellerNames(sales: SaleWithProduct[]): string[] {
  const names = new Set<string>();
  for (const sale of sales) {
    names.add(sale.created_by_name?.trim() || "미지정");
  }
  return [...names].sort((a, b) => a.localeCompare(b, "ko"));
}
