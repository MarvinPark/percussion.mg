import type { QuoteListItem } from "@/components/quotes-list";

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function buildProductSkuMap(
  products: { id: string; sku?: string }[],
): Map<string, string> {
  return new Map(
    products
      .filter((product) => product.sku?.trim())
      .map((product) => [product.id, product.sku!.trim()]),
  );
}

export function matchesQuotesTextSearch(
  quote: QuoteListItem,
  query: string,
  productSkuById: Map<string, string>,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const parts = [quote.customer_name];

  for (const item of quote.quote_items) {
    parts.push(item.product_name, item.model_name);
    if (item.product_id) {
      const sku = productSkuById.get(item.product_id);
      if (sku) parts.push(sku);
    }
  }

  const haystack = parts.map(normalize).filter(Boolean).join(" ");
  return haystack.includes(q);
}

export function filterQuotesBySeller(
  quotes: QuoteListItem[],
  seller: string,
): QuoteListItem[] {
  if (!seller.trim()) return quotes;
  return quotes.filter(
    (quote) => (quote.created_by_name ?? "미지정") === seller,
  );
}

export function filterQuotesByTextQuery(
  quotes: QuoteListItem[],
  query: string,
  productSkuById: Map<string, string>,
): QuoteListItem[] {
  const q = query.trim();
  if (!q) return quotes;
  return quotes.filter((quote) =>
    matchesQuotesTextSearch(quote, q, productSkuById),
  );
}

export function filterQuotes(
  quotes: QuoteListItem[],
  options: {
    seller?: string;
    textQuery?: string;
    productSkuById: Map<string, string>;
  },
): QuoteListItem[] {
  let result = quotes;
  if (options.seller?.trim()) {
    result = filterQuotesBySeller(result, options.seller);
  }
  if (options.textQuery?.trim()) {
    result = filterQuotesByTextQuery(
      result,
      options.textQuery,
      options.productSkuById,
    );
  }
  return result;
}

export function getUniqueQuoteSellerNames(quotes: QuoteListItem[]): string[] {
  const names = new Set<string>();
  for (const quote of quotes) {
    names.add(quote.created_by_name?.trim() || "미지정");
  }
  return [...names].sort((a, b) => a.localeCompare(b, "ko"));
}

export function formatQuoteDropdownLine(
  quote: QuoteListItem,
  productSkuById: Map<string, string>,
) {
  const parts = [quote.customer_name];

  for (const item of quote.quote_items) {
    parts.push(item.product_name, item.model_name);
    if (item.product_id) {
      const sku = productSkuById.get(item.product_id);
      if (sku) parts.push(sku);
    }
  }

  const uniqueParts = [...new Set(parts.map((value) => value?.trim()).filter(Boolean))];
  return uniqueParts.length > 0 ? uniqueParts.join(" · ") : "-";
}

export function getQuoteSearchSelectionValue(
  quote: QuoteListItem,
  productSkuById: Map<string, string>,
) {
  return (
    quote.customer_name?.trim() ||
    quote.quote_items.find((item) => item.product_name?.trim())?.product_name?.trim() ||
    quote.quote_items.find((item) => item.model_name?.trim())?.model_name?.trim() ||
    quote.quote_items
      .map((item) => (item.product_id ? productSkuById.get(item.product_id) : ""))
      .find((sku) => sku?.trim())?.trim() ||
    ""
  );
}
