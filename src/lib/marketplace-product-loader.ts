import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductMatchCandidate } from "@/lib/marketplace-product-match";

const PRODUCT_MATCH_SELECT =
  "id, sku, product_name, model_name, brand, purchase_price, sale_price";

const PAGE_SIZE = 1000;

export async function loadAllProductMatchCandidates(
  supabase: SupabaseClient,
): Promise<ProductMatchCandidate[]> {
  const all: ProductMatchCandidate[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_MATCH_SELECT)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error("제품 목록을 불러오지 못했습니다.");
    }

    if (!data?.length) break;

    all.push(...(data as ProductMatchCandidate[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

export async function loadProductMatchCandidateById(
  supabase: SupabaseClient,
  productId: string,
): Promise<ProductMatchCandidate | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_MATCH_SELECT)
    .eq("id", productId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ProductMatchCandidate;
}

export async function resolveManualProductMatch(
  supabase: SupabaseClient,
  products: ProductMatchCandidate[],
  manualProductId: string,
): Promise<ProductMatchCandidate | null> {
  const cached = products.find((product) => product.id === manualProductId);
  if (cached) return cached;

  const fetched = await loadProductMatchCandidateById(supabase, manualProductId);
  if (fetched) {
    products.push(fetched);
  }
  return fetched;
}
