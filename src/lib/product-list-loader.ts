import type { SupabaseClient } from "@supabase/supabase-js";
import { PRODUCT_LIST_SELECT } from "@/lib/product-list-select";
import {
  DEFAULT_PRODUCT_LIST_SORT,
  type ProductListSort,
} from "@/lib/product-list-sort";
import type { Product } from "@/types/product";

export const PRODUCT_PAGE_SIZE = 10;
export const PRODUCT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export type ProductPageSize =
  (typeof PRODUCT_PAGE_SIZE_OPTIONS)[number];

export function parseProductPageSize(
  value: string | undefined,
): ProductPageSize {
  const parsed = Number(value);
  if (
    PRODUCT_PAGE_SIZE_OPTIONS.includes(parsed as ProductPageSize)
  ) {
    return parsed as ProductPageSize;
  }
  return PRODUCT_PAGE_SIZE;
}

const PRODUCT_PAGE_SIZE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function getProductPageSizeStorageKey(userId: string) {
  return `pc-product-page-size-${userId}`;
}

export function loadSavedProductPageSize(
  userId: string,
): ProductPageSize | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(getProductPageSizeStorageKey(userId));
    if (!raw) return null;
    const parsed = Number(raw);
    if (PRODUCT_PAGE_SIZE_OPTIONS.includes(parsed as ProductPageSize)) {
      return parsed as ProductPageSize;
    }
  } catch {
    return null;
  }

  return null;
}

export function saveProductPageSize(
  userId: string,
  pageSize: ProductPageSize,
) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(getProductPageSizeStorageKey(userId), String(pageSize));
  } catch {
    // ignore quota / private mode
  }

  document.cookie = `${getProductPageSizeStorageKey(userId)}=${pageSize}; path=/; max-age=${PRODUCT_PAGE_SIZE_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function readProductPageSizeCookie(
  cookieValue: string | undefined,
): ProductPageSize | null {
  if (!cookieValue) return null;

  const parsed = Number(cookieValue);
  if (PRODUCT_PAGE_SIZE_OPTIONS.includes(parsed as ProductPageSize)) {
    return parsed as ProductPageSize;
  }

  return null;
}

export type ProductListStats = {
  totalCount: number;
  totalStockQuantity: number;
};

export type ProductPageResult = {
  products: Product[];
  totalCount: number;
  error: string | null;
};

function escapeIlike(value: string) {
  return value.replace(/[%_\\]/g, "\\$&");
}

export function applyProductSearchFilter<T extends { or: (filters: string) => T }>(
  query: T,
  searchQuery: string,
) {
  const pattern = `%${escapeIlike(searchQuery.trim())}%`;

  return query.or(
    [
      `supplier.ilike.${pattern}`,
      `category.ilike.${pattern}`,
      `brand.ilike.${pattern}`,
      `product_name.ilike.${pattern}`,
      `model_name.ilike.${pattern}`,
      `sku.ilike.${pattern}`,
      `keywords.ilike.${pattern}`,
    ].join(","),
  );
}

async function fetchStatsViaRpc(
  supabase: SupabaseClient,
  searchQuery?: string,
): Promise<ProductListStats | null> {
  const { data, error } = await supabase.rpc("get_product_list_stats", {
    search_query: searchQuery?.trim() || null,
  });

  if (error || !data?.[0]) return null;

  return {
    totalCount: Number(data[0].total_count) || 0,
    totalStockQuantity: Number(data[0].total_stock_quantity) || 0,
  };
}

async function fetchStatsFallback(
  supabase: SupabaseClient,
  searchQuery?: string,
): Promise<ProductListStats> {
  let builder = supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  if (searchQuery?.trim()) {
    builder = applyProductSearchFilter(builder, searchQuery);
  }

  const { count } = await builder;

  return {
    totalCount: count ?? 0,
    totalStockQuantity: 0,
  };
}

export async function fetchProductListStats(
  supabase: SupabaseClient,
  searchQuery?: string,
): Promise<ProductListStats> {
  const rpcStats = await fetchStatsViaRpc(supabase, searchQuery);
  if (rpcStats) return rpcStats;

  return fetchStatsFallback(supabase, searchQuery);
}

export async function fetchProductsPage(
  supabase: SupabaseClient,
  options: {
    page: number;
    pageSize?: number;
    searchQuery?: string;
    sort?: ProductListSort;
  },
): Promise<ProductPageResult> {
  const pageSize = options.pageSize ?? PRODUCT_PAGE_SIZE;
  const page = Math.max(1, options.page);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const searchQuery = options.searchQuery?.trim() ?? "";
  const sort = options.sort ?? DEFAULT_PRODUCT_LIST_SORT;

  let builder = supabase
    .from("products")
    .select(PRODUCT_LIST_SELECT, { count: "exact" });

  if (sort.column) {
    builder = builder
      .order(sort.column, { ascending: sort.direction === "asc" })
      .order("created_at", { ascending: false });
  } else {
    builder = builder.order("created_at", { ascending: false });
  }

  if (searchQuery) {
    builder = applyProductSearchFilter(builder, searchQuery);
  }

  const { data, count, error } = await builder.range(from, to);

  if (error) {
    return { products: [], totalCount: 0, error: "제품 목록을 불러오지 못했습니다." };
  }

  return {
    products: (data as Product[]) ?? [],
    totalCount: count ?? 0,
    error: null,
  };
}

export async function searchProductsForDropdown(
  supabase: SupabaseClient,
  searchQuery: string,
  limit = 40,
): Promise<Product[]> {
  const query = searchQuery.trim();
  if (!query) return [];

  let builder = supabase
    .from("products")
    .select(PRODUCT_LIST_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  builder = applyProductSearchFilter(builder, query);

  const { data } = await builder;
  return (data as Product[]) ?? [];
}
