import type { SupabaseClient } from "@supabase/supabase-js";
import { PRODUCT_LIST_SELECT } from "@/lib/product-list-select";
import {
  DEFAULT_PRODUCT_LIST_SORT,
  type ProductListSort,
} from "@/lib/product-list-sort";
import {
  buildProductSearchOrFilter,
  normalizeProductSearchQuery,
  toPostgrestIlikePattern,
} from "@/lib/postgrest-search-filter";
import {
  applyProductListScopeFilters,
  hasProductListScopeFilters,
  normalizeProductListScopeFilters,
  type ProductListScopeFilters,
} from "@/lib/product-list-scope-filters";

export {
  PRODUCT_SEARCH_MIN_LENGTH,
  normalizeProductSearchQuery,
} from "@/lib/postgrest-search-filter";
export type { ProductListScopeFilters } from "@/lib/product-list-scope-filters";
export {
  fetchProductListFilterOptions,
  buildProductListBrandOptions,
} from "@/lib/product-list-scope-filters";
import type { Product } from "@/types/product";
import { SALE_PRODUCT_OPTION_SELECT } from "@/types/sale";

export const PRODUCT_PAGE_SIZE = 10;
export const PRODUCT_PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100, 200] as const;

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

export type ProductsListViewResult = {
  products: Product[];
  listStats: ProductListStats;
  error: string | null;
  searchError?: string | null;
};

export function applyProductSearchFilter<T extends { or: (filters: string) => T }>(
  query: T,
  searchQuery: string,
) {
  return query.or(buildProductSearchOrFilter(searchQuery));
}

export { toPostgrestIlikePattern };

async function fetchStatsViaRpc(
  supabase: SupabaseClient,
  searchQuery?: string,
  scopeFilters?: ProductListScopeFilters,
): Promise<ProductListStats | null> {
  if (hasProductListScopeFilters(scopeFilters ?? {})) {
    return null;
  }

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
  scopeFilters?: ProductListScopeFilters,
): Promise<ProductListStats> {
  let builder = supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  if (searchQuery?.trim()) {
    builder = applyProductSearchFilter(builder, searchQuery);
  }

  builder = applyProductListScopeFilters(builder, scopeFilters ?? {});

  const { count } = await builder;

  return {
    totalCount: count ?? 0,
    totalStockQuantity: 0,
  };
}

export async function fetchProductListStats(
  supabase: SupabaseClient,
  searchQuery?: string,
  scopeFilters?: ProductListScopeFilters,
): Promise<ProductListStats> {
  const rpcStats = await fetchStatsViaRpc(supabase, searchQuery, scopeFilters);
  if (rpcStats) return rpcStats;

  return fetchStatsFallback(supabase, searchQuery, scopeFilters);
}

export async function fetchProductsPage(
  supabase: SupabaseClient,
  options: {
    page: number;
    pageSize?: number;
    searchQuery?: string;
    sort?: ProductListSort;
    /** false면 count 집계 생략 (통계 RPC와 중복 조회 방지) */
    includeCount?: boolean;
    scopeFilters?: ProductListScopeFilters;
  },
): Promise<ProductPageResult> {
  const pageSize = options.pageSize ?? PRODUCT_PAGE_SIZE;
  const page = Math.max(1, options.page);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const searchQuery = options.searchQuery?.trim() ?? "";
  const sort = options.sort ?? DEFAULT_PRODUCT_LIST_SORT;
  const includeCount = options.includeCount ?? true;
  const scopeFilters = normalizeProductListScopeFilters(options.scopeFilters);

  let builder = includeCount
    ? supabase.from("products").select(PRODUCT_LIST_SELECT, { count: "exact" })
    : supabase.from("products").select(PRODUCT_LIST_SELECT);

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

  builder = applyProductListScopeFilters(builder, scopeFilters);

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

/** 통계 1회 + 목록(count 생략) 병렬 조회 */
export async function fetchProductsListView(
  supabase: SupabaseClient,
  options: {
    page: number;
    pageSize?: number;
    searchQuery?: string;
    sort?: ProductListSort;
    scopeFilters?: ProductListScopeFilters;
  },
): Promise<ProductsListViewResult> {
  const normalized = normalizeProductSearchQuery(options.searchQuery ?? "");
  const scopeFilters = normalizeProductListScopeFilters(options.scopeFilters);

  if (normalized.error) {
    return {
      products: [],
      listStats: { totalCount: 0, totalStockQuantity: 0 },
      error: null,
      searchError: normalized.error,
    };
  }

  const searchQuery = normalized.searchQuery;
  const page = Math.max(1, options.page);
  const pageSize = options.pageSize ?? PRODUCT_PAGE_SIZE;

  const [listStats, pageData] = await Promise.all([
    fetchProductListStats(supabase, searchQuery || undefined, scopeFilters),
    fetchProductsPage(supabase, {
      page,
      pageSize,
      searchQuery,
      sort: options.sort,
      includeCount: false,
      scopeFilters,
    }),
  ]);

  if (pageData.error) {
    return {
      products: [],
      listStats: { totalCount: 0, totalStockQuantity: 0 },
      error: pageData.error,
    };
  }

  return {
    products: pageData.products,
    listStats,
    error: null,
  };
}

export async function fetchAllProducts(
  supabase: SupabaseClient,
): Promise<{ products: Product[]; error: string | null }> {
  const products: Product[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: true })
      .range(offset, offset + 999);

    if (error) {
      return {
        products: [],
        error: "제품 목록을 불러오지 못했습니다.",
      };
    }

    if (!data?.length) break;

    products.push(...(data as Product[]));
    if (data.length < 1000) break;
    offset += 1000;
  }

  return { products, error: null };
}

export async function fetchProductsForExport(
  supabase: SupabaseClient,
  options: {
    searchQuery?: string;
    sort?: ProductListSort;
  },
): Promise<{ products: Product[]; error: string | null }> {
  const searchQuery = options.searchQuery?.trim() ?? "";
  const sort = options.sort ?? DEFAULT_PRODUCT_LIST_SORT;
  const products: Product[] = [];
  let offset = 0;

  while (true) {
    let builder = supabase.from("products").select("*");

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

    const { data, error } = await builder.range(offset, offset + 999);

    if (error) {
      return {
        products: [],
        error: "제품 목록을 불러오지 못했습니다.",
      };
    }

    if (!data?.length) break;

    products.push(...(data as Product[]));
    if (data.length < 1000) break;
    offset += 1000;
  }

  return {
    products,
    error: null,
  };
}

export async function searchProductsForDropdown(
  supabase: SupabaseClient,
  searchQuery: string,
  limit = 40,
): Promise<Product[]> {
  const normalized = normalizeProductSearchQuery(searchQuery);
  if (normalized.error) return [];
  const query = normalized.searchQuery;
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

export async function searchSaleProductsForDropdown(
  supabase: SupabaseClient,
  searchQuery: string,
  limit = 40,
) {
  const normalized = normalizeProductSearchQuery(searchQuery);
  if (normalized.error) return [];
  const query = normalized.searchQuery;
  if (!query) return [];

  let builder = supabase
    .from("products")
    .select(SALE_PRODUCT_OPTION_SELECT)
    .order("product_name", { ascending: true })
    .limit(limit);

  builder = applyProductSearchFilter(builder, query);

  const { data } = await builder;
  return data ?? [];
}
