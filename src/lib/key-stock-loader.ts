import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "@/types/product";

export type KeyStockFilterOptionRow = {
  category: string;
  brand: string;
};

function normalizeCategory(value: string | null | undefined) {
  return value?.trim() || "미분류";
}

function normalizeBrand(value: string | null | undefined) {
  return value?.trim() || "미지정";
}

export function productFilterRows(products: Product[]): KeyStockFilterOptionRow[] {
  return products.map((product) => ({
    category: normalizeCategory(product.category),
    brand: normalizeBrand(product.brand),
  }));
}

export async function fetchAllKeyStockProducts(
  supabase: SupabaseClient,
): Promise<Product[]> {
  const products: Product[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_key_stock", true)
      .order("category", { ascending: true })
      .order("brand", { ascending: true })
      .order("model_name", { ascending: true })
      .range(offset, offset + 999);

    if (error || !data?.length) break;

    products.push(...(data as Product[]));
    if (data.length < 1000) break;
    offset += 1000;
  }

  return products;
}

export function buildKeyStockCategoryOptions(rows: KeyStockFilterOptionRow[]) {
  return [...new Set(rows.map((row) => row.category))].sort((a, b) =>
    a.localeCompare(b, "ko"),
  );
}

export function buildKeyStockBrandOptions(
  rows: KeyStockFilterOptionRow[],
  categoryFilter = "",
) {
  const normalizedCategory = categoryFilter.trim().toLowerCase();
  const filtered = normalizedCategory
    ? rows.filter(
        (row) => row.category.trim().toLowerCase() === normalizedCategory,
      )
    : rows;

  return [...new Set(filtered.map((row) => row.brand))].sort((a, b) =>
    a.localeCompare(b, "ko"),
  );
}
