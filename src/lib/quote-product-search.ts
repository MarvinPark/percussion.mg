import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyProductSearchFilter,
  normalizeProductSearchQuery,
} from "@/lib/product-list-loader";
import type { QuoteProductOption } from "@/types/quote";

export const QUOTE_PRODUCT_SELECT =
  "id, product_name, model_name, sku, supplier, category, brand, color, product_option, size, sale_price, purchase_price";

export async function searchQuoteProducts(
  supabase: SupabaseClient,
  searchQuery: string,
  limit = 20,
): Promise<QuoteProductOption[]> {
  const normalized = normalizeProductSearchQuery(searchQuery);
  if (normalized.error) return [];
  const query = normalized.searchQuery;
  if (!query) return [];

  let builder = supabase
    .from("products")
    .select(QUOTE_PRODUCT_SELECT)
    .order("model_name", { ascending: true })
    .limit(limit);

  builder = applyProductSearchFilter(builder, query);

  const { data } = await builder;
  return (data as QuoteProductOption[]) ?? [];
}

export async function findQuoteProductByQuery(
  supabase: SupabaseClient,
  searchQuery: string,
): Promise<QuoteProductOption | null> {
  const query = searchQuery.trim();
  if (!query) return null;

  const normalized = query.toLowerCase();

  const { data: byModel } = await supabase
    .from("products")
    .select(QUOTE_PRODUCT_SELECT)
    .ilike("model_name", query)
    .limit(5);

  const modelMatch = (byModel as QuoteProductOption[] | null)?.find(
    (product) => (product.model_name || "").trim().toLowerCase() === normalized,
  );
  if (modelMatch) return modelMatch;

  const { data: bySku } = await supabase
    .from("products")
    .select(QUOTE_PRODUCT_SELECT)
    .ilike("sku", query)
    .limit(5);

  const skuMatch = (bySku as QuoteProductOption[] | null)?.find(
    (product) => product.sku.trim().toLowerCase() === normalized,
  );
  if (skuMatch) return skuMatch;

  const results = await searchQuoteProducts(supabase, query, 1);
  return results[0] ?? null;
}

export async function fetchAllProductSkus(
  supabase: SupabaseClient,
): Promise<{ id: string; sku: string | null }[]> {
  const rows: { id: string; sku: string | null }[] = [];
  let offset = 0;

  while (true) {
    const { data } = await supabase
      .from("products")
      .select("id, sku")
      .order("id", { ascending: true })
      .range(offset, offset + 999);

    if (!data?.length) break;

    rows.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }

  return rows;
}
