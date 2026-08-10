import type { SupabaseClient } from "@supabase/supabase-js";
import { PRODUCT_LIST_SELECT } from "@/lib/product-list-select";
import type { Product } from "@/types/product";

const BATCH_SIZE = 1000;

export type ProductListStats = {
  totalCount: number;
  totalStockQuantity: number;
};

async function fetchProductStockRows(
  supabase: SupabaseClient,
  from: number,
  to: number,
) {
  return supabase
    .from("products")
    .select("stock_quantity")
    .order("id", { ascending: true })
    .range(from, to);
}

export async function fetchProductListStats(
  supabase: SupabaseClient,
): Promise<ProductListStats> {
  const { count, error: countError } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  if (countError) {
    return { totalCount: 0, totalStockQuantity: 0 };
  }

  let totalStockQuantity = 0;
  let offset = 0;

  while (true) {
    const { data, error } = await fetchProductStockRows(
      supabase,
      offset,
      offset + BATCH_SIZE - 1,
    );

    if (error || !data?.length) break;

    for (const row of data) {
      totalStockQuantity += Number(row.stock_quantity) || 0;
    }

    if (data.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  return {
    totalCount: count ?? 0,
    totalStockQuantity,
  };
}

export async function fetchAllProductsForList(
  supabase: SupabaseClient,
): Promise<{ products: Product[]; error: string | null }> {
  const products: Product[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_LIST_SELECT)
      .order("created_at", { ascending: false })
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      return { products: [], error: "제품 목록을 불러오지 못했습니다." };
    }

    if (!data?.length) break;

    products.push(...(data as Product[]));

    if (data.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  return { products, error: null };
}
