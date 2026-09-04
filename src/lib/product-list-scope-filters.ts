import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildKeyStockBrandOptions,
  buildKeyStockCategoryOptions,
  type KeyStockFilterOptionRow,
} from "@/lib/key-stock-loader";

export type ProductListScopeFilters = {
  category?: string;
  brand?: string;
};

function normalizeCategory(value: string | null | undefined) {
  return value?.trim() || "미분류";
}

function normalizeBrand(value: string | null | undefined) {
  return value?.trim() || "미지정";
}

export function normalizeProductListScopeFilters(
  input: ProductListScopeFilters = {},
): ProductListScopeFilters {
  return {
    category: input.category?.trim() ?? "",
    brand: input.brand?.trim() ?? "",
  };
}

export function hasProductListScopeFilters(filters: ProductListScopeFilters) {
  return Boolean(filters.category || filters.brand);
}

export function applyProductListScopeFilters(
  // Supabase query builder chaining causes excessively deep generic instantiation.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filters: ProductListScopeFilters,
) {
  let builder = query;
  const category = filters.category?.trim();
  const brand = filters.brand?.trim();

  if (category) {
    if (category === "미분류") {
      builder = builder.or("category.is.null,category.eq.");
    } else {
      builder = builder.eq("category", category);
    }
  }

  if (brand) {
    if (brand === "미지정") {
      builder = builder.or("brand.is.null,brand.eq.");
    } else {
      builder = builder.eq("brand", brand);
    }
  }

  return builder;
}

export async function fetchProductListFilterOptions(supabase: SupabaseClient) {
  const rows: KeyStockFilterOptionRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("category, brand")
      .range(offset, offset + 999);

    if (error || !data?.length) break;

    for (const row of data) {
      rows.push({
        category: normalizeCategory(row.category),
        brand: normalizeBrand(row.brand),
      });
    }

    if (data.length < 1000) break;
    offset += 1000;
  }

  return {
    categories: buildKeyStockCategoryOptions(rows),
    rows,
  };
}

export function buildProductListBrandOptions(
  rows: KeyStockFilterOptionRow[],
  categoryFilter = "",
) {
  return buildKeyStockBrandOptions(rows, categoryFilter);
}
