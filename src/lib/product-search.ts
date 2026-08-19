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

export type SmartstoreOrderLinkHint = {
  productName: string;
  productOption: string;
  sellerProductCode: string;
};

function tokenizeSearchText(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s/·\-_,.+()[\]{}]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function scoreSaleProductQueryMatch(
  product: Pick<
    SaleProductOption,
    "sku" | "category" | "model_name" | "product_name" | "keywords" | "supplier"
  >,
  query: string,
): number {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return 0;

  const haystack = saleProductSearchHaystack(product);
  let score = 0;

  if (product.sku?.trim().toLowerCase() === normalized) score += 100;
  if (haystack.includes(normalized)) score += 50;

  for (const token of tokenizeSearchText(normalized)) {
    if (haystack.includes(token)) score += 10;
  }

  return score;
}

function scoreSaleProductOrderSimilarity(
  product: Pick<
    SaleProductOption,
    "sku" | "category" | "model_name" | "product_name" | "keywords" | "supplier"
  >,
  hint: SmartstoreOrderLinkHint,
): number {
  let score = 0;
  const sellerCode = hint.sellerProductCode.trim().toLowerCase();
  if (sellerCode && product.sku?.trim().toLowerCase() === sellerCode) {
    score += 200;
  }

  const orderHaystack =
    `${hint.productName} ${hint.productOption}`.trim().toLowerCase();
  const productHaystack = saleProductSearchHaystack(product);
  const productTokens = [
    product.product_name,
    product.model_name,
    product.sku ?? "",
  ]
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length >= 2);

  for (const token of tokenizeSearchText(orderHaystack)) {
    if (productHaystack.includes(token)) score += 12;
  }

  for (const token of productTokens) {
    if (token.length >= 3 && orderHaystack.includes(token)) score += 18;
  }

  return score;
}

export function searchSaleProductsForOrderLink(
  products: SaleProductOption[],
  query: string,
  hint?: SmartstoreOrderLinkHint,
  limit = 12,
): { matches: SaleProductOption[]; similar: SaleProductOption[] } {
  const normalized = query.trim();
  if (!normalized) {
    return { matches: [], similar: [] };
  }

  const scored = products.map((product) => {
    const queryScore = scoreSaleProductQueryMatch(product, normalized);
    const orderScore = hint ? scoreSaleProductOrderSimilarity(product, hint) : 0;
    return {
      product,
      queryScore,
      totalScore: queryScore + Math.round(orderScore * 0.35),
      orderScore,
    };
  });

  const matches = scored
    .filter((entry) => entry.queryScore > 0)
    .sort(
      (a, b) =>
        b.totalScore - a.totalScore ||
        a.product.product_name.localeCompare(b.product.product_name, "ko"),
    )
    .slice(0, limit)
    .map((entry) => entry.product);

  const matchIds = new Set(matches.map((product) => product.id));
  const similar = hint
    ? scored
        .filter(
          (entry) =>
            entry.orderScore > 0 &&
            entry.queryScore === 0 &&
            !matchIds.has(entry.product.id),
        )
        .sort(
          (a, b) =>
            b.orderScore - a.orderScore ||
            a.product.product_name.localeCompare(b.product.product_name, "ko"),
        )
        .slice(0, 5)
        .map((entry) => entry.product)
    : [];

  return { matches, similar };
}
