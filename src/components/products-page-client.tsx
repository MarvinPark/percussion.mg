"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadProductsListView } from "@/app/(main)/products/actions";
import type { ProductInlineField } from "@/app/(main)/products/actions";
import KeyStockFilterCombobox from "@/components/key-stock-filter-combobox";
import ProductListSearch from "@/components/product-list-search";
import ProductsWorkspace from "@/components/products-workspace";
import type { KeyStockFilterOptionRow } from "@/lib/key-stock-loader";
import type {
  ProductListStats,
  ProductPageSize,
} from "@/lib/product-list-loader";
import {
  buildProductListBrandOptions,
  PRODUCT_PAGE_SIZE,
  PRODUCT_SEARCH_MIN_LENGTH,
  saveProductPageSize,
} from "@/lib/product-list-loader";
import {
  cycleProductListSort,
  productListSortToSearchParams,
  type ProductListSort,
  type ProductSortColumn,
} from "@/lib/product-list-sort";
import { applyProductInlineFieldUpdate } from "@/lib/product-inline-update";
import type { ProductReservationsByProductId } from "@/lib/product-reservations";
import type { Product } from "@/types/product";
import type { SaleProductOption } from "@/types/sale";

const VISIBLE_PAGE_COUNT = 10;

type DraftSyncMode = false | "scope" | "all";

const pageButtonClass =
  "inline-flex h-8 min-w-8 items-center justify-center rounded border px-2 text-sm font-medium";

const arrowButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const compactFilterInputClass =
  "h-[24px] w-24 rounded border border-zinc-300 bg-white px-2 py-0.5 text-[11px] leading-none text-zinc-900 placeholder:text-[11px] placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 sm:w-28";

function clampPageWindowStart(start: number, totalPages: number) {
  if (totalPages <= VISIBLE_PAGE_COUNT) return 1;
  const maxStart = totalPages - VISIBLE_PAGE_COUNT + 1;
  return Math.max(1, Math.min(start, maxStart));
}

function buildProductsUrl(
  page: number,
  searchQuery: string,
  pageSize: ProductPageSize,
  sort: ProductListSort,
  categoryFilter: string,
  brandFilter: string,
) {
  const params = new URLSearchParams();
  if (searchQuery) params.set("q", searchQuery);
  if (categoryFilter) params.set("category", categoryFilter);
  if (brandFilter) params.set("brand", brandFilter);
  if (page > 1) params.set("page", String(page));
  if (pageSize !== 10) params.set("limit", String(pageSize));
  const sortParams = productListSortToSearchParams(sort);
  if (sortParams.sort) params.set("sort", sortParams.sort);
  if (sortParams.order) params.set("order", sortParams.order);
  const query = params.toString();
  return query ? `/products?${query}` : "/products";
}

function readProductListParamsFromLocation() {
  if (typeof window === "undefined") {
    return {
      searchQuery: "",
      categoryFilter: "",
      brandFilter: "",
    };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    searchQuery: params.get("q")?.trim() ?? "",
    categoryFilter: params.get("category")?.trim() ?? "",
    brandFilter: params.get("brand")?.trim() ?? "",
  };
}

type ProductsPageClientProps = {
  userId: string;
  products: Product[];
  reservationsByProductId?: ProductReservationsByProductId;
  listStats: ProductListStats;
  currentPage: number;
  totalPages: number;
  searchQuery: string;
  categoryFilter: string;
  brandFilter: string;
  filterCategories: string[];
  filterOptionRows: KeyStockFilterOptionRow[];
  pageSize: ProductPageSize;
  sort: ProductListSort;
  readOnly?: boolean;
  initialLoadError?: string | null;
};

export default function ProductsPageClient({
  userId,
  products: initialProducts,
  reservationsByProductId: initialReservationsByProductId = {},
  listStats: initialListStats,
  currentPage: initialCurrentPage,
  totalPages: initialTotalPages,
  searchQuery: initialSearchQuery,
  categoryFilter: initialCategoryFilter,
  brandFilter: initialBrandFilter,
  filterCategories,
  filterOptionRows,
  pageSize: initialPageSize,
  sort: initialSort,
  readOnly = false,
  initialLoadError = null,
}: ProductsPageClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const loadRequestRef = useRef(0);
  const didHydrateFromUrlRef = useRef(false);
  const [products, setProducts] = useState(initialProducts);
  const [reservationsByProductId, setReservationsByProductId] = useState(
    initialReservationsByProductId,
  );
  const [listStats, setListStats] = useState(initialListStats);
  const [currentPage, setCurrentPage] = useState(initialCurrentPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter);
  const [brandFilter, setBrandFilter] = useState(initialBrandFilter);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sort, setSort] = useState(initialSort);
  const [draftQuery, setDraftQuery] = useState(initialSearchQuery);
  const [draftCategoryFilter, setDraftCategoryFilter] = useState(
    initialCategoryFilter,
  );
  const [draftBrandFilter, setDraftBrandFilter] = useState(initialBrandFilter);
  const [pageWindowStart, setPageWindowStart] = useState(1);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [loadError, setLoadError] = useState<string | null>(initialLoadError);
  const hasAppliedSavedPageSize = useRef(false);

  const isSearchActive = searchQuery.length > 0;
  const isScopeFilterActive =
    categoryFilter.length > 0 || brandFilter.length > 0;
  const isListFiltered = isSearchActive || isScopeFilterActive;

  const draftBrandOptions = useMemo(
    () => buildProductListBrandOptions(filterOptionRows, draftCategoryFilter),
    [draftCategoryFilter, filterOptionRows],
  );

  const syncProductsUrl = useCallback(
    (
      page: number,
      nextSearchQuery: string,
      nextPageSize: ProductPageSize,
      nextSort: ProductListSort,
      nextCategoryFilter: string,
      nextBrandFilter: string,
    ) => {
      router.replace(
        buildProductsUrl(
          page,
          nextSearchQuery,
          nextPageSize,
          nextSort,
          nextCategoryFilter,
          nextBrandFilter,
        ),
        { scroll: false },
      );
    },
    [router],
  );

  useEffect(() => {
    setPageWindowStart(clampPageWindowStart(currentPage, totalPages));
  }, [currentPage, totalPages]);

  // 전체 수정 후 돌아올 때 서버 props와 클라이언트 state를 맞춥니다.
  useEffect(() => {
    const urlParams = readProductListParamsFromLocation();
    if (
      urlParams.searchQuery !== searchQuery ||
      urlParams.categoryFilter !== categoryFilter ||
      urlParams.brandFilter !== brandFilter
    ) {
      return;
    }

    if (
      initialCurrentPage !== currentPage ||
      initialSearchQuery !== searchQuery ||
      initialCategoryFilter !== categoryFilter ||
      initialBrandFilter !== brandFilter ||
      initialPageSize !== pageSize
    ) {
      return;
    }

    setProducts(initialProducts);
    setReservationsByProductId(initialReservationsByProductId);
    setListStats(initialListStats);
    setTotalPages(initialTotalPages);
  }, [
    initialProducts,
    initialReservationsByProductId,
    initialListStats,
    initialTotalPages,
    initialCurrentPage,
    initialSearchQuery,
    initialCategoryFilter,
    initialBrandFilter,
    initialPageSize,
    currentPage,
    searchQuery,
    categoryFilter,
    brandFilter,
    pageSize,
  ]);

  const visiblePageStart = clampPageWindowStart(pageWindowStart, totalPages);
  const visiblePageEnd = Math.min(
    totalPages,
    visiblePageStart + VISIBLE_PAGE_COUNT - 1,
  );
  const showPageArrows = totalPages > VISIBLE_PAGE_COUNT;
  const canShiftPageWindowLeft = visiblePageStart > 1;
  const canShiftPageWindowRight =
    visiblePageStart + VISIBLE_PAGE_COUNT - 1 < totalPages;

  const listSummary = isListFiltered
    ? `${isSearchActive ? "검색" : "필터"} ${listStats.totalCount.toLocaleString("ko-KR")}건 · 총 수량 ${listStats.totalStockQuantity.toLocaleString("ko-KR")}개${isLoading ? " · 불러오는 중..." : ""}`
    : `총 ${listStats.totalCount.toLocaleString("ko-KR")}건 · 총 수량 ${listStats.totalStockQuantity.toLocaleString("ko-KR")}개${isLoading ? " · 불러오는 중..." : ""}`;

  const loadView = useCallback(
    (
      page: number,
      query: string,
      nextPageSize: ProductPageSize = pageSize,
      nextSort: ProductListSort = sort,
      nextCategoryFilter: string = categoryFilter,
      nextBrandFilter: string = brandFilter,
      syncDraft: DraftSyncMode = false,
    ) => {
      const requestId = ++loadRequestRef.current;
      setIsLoading(true);
      setLoadError(null);

      void loadProductsListView({
        page,
        searchQuery: query,
        pageSize: nextPageSize,
        sort: nextSort,
        categoryFilter: nextCategoryFilter,
        brandFilter: nextBrandFilter,
      })
        .then((result) => {
          if (requestId !== loadRequestRef.current) return;

          if ("error" in result && result.error) {
            setLoadError(result.error);
            return;
          }

          if (!result.products || !result.listStats) {
            setLoadError("제품 목록을 불러오지 못했습니다.");
            return;
          }

          const resolvedPageSize = (result.pageSize ?? nextPageSize) as ProductPageSize;

          setProducts(result.products);
          setReservationsByProductId(result.reservationsByProductId ?? {});
          setListStats(result.listStats);
          setCurrentPage(result.currentPage);
          setTotalPages(result.totalPages);
          setSearchQuery(result.searchQuery);
          setCategoryFilter(result.categoryFilter ?? nextCategoryFilter);
          setBrandFilter(result.brandFilter ?? nextBrandFilter);
          setPageSize(resolvedPageSize);
          setSort(nextSort);
          if (syncDraft === "scope" || syncDraft === "all") {
            setDraftCategoryFilter(result.categoryFilter ?? nextCategoryFilter);
            setDraftBrandFilter(result.brandFilter ?? nextBrandFilter);
          }
          if (syncDraft === "all") {
            setDraftQuery(result.searchQuery);
          }
          saveProductPageSize(userId, resolvedPageSize);
          syncProductsUrl(
            result.currentPage,
            result.searchQuery,
            resolvedPageSize,
            nextSort,
            result.categoryFilter ?? nextCategoryFilter,
            result.brandFilter ?? nextBrandFilter,
          );
        })
        .catch(() => {
          if (requestId !== loadRequestRef.current) return;
          setLoadError("제품 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        })
        .finally(() => {
          if (requestId === loadRequestRef.current) {
            setIsLoading(false);
          }
        });
    },
    [categoryFilter, brandFilter, pageSize, sort, syncProductsUrl, userId],
  );

  useEffect(() => {
    if (didHydrateFromUrlRef.current) return;
    didHydrateFromUrlRef.current = true;

    const urlParams = readProductListParamsFromLocation();
    const urlPage = Math.max(
      1,
      Number(new URLSearchParams(window.location.search).get("page")) ||
        initialCurrentPage,
    );
    const urlMismatch =
      urlParams.searchQuery !== initialSearchQuery ||
      urlParams.categoryFilter !== initialCategoryFilter ||
      urlParams.brandFilter !== initialBrandFilter ||
      urlPage !== initialCurrentPage;

    if (!urlMismatch) return;

    loadView(
      urlPage,
      urlParams.searchQuery,
      initialPageSize,
      initialSort,
      urlParams.categoryFilter,
      urlParams.brandFilter,
      "all",
    );
  }, [
    initialBrandFilter,
    initialCategoryFilter,
    initialCurrentPage,
    initialPageSize,
    initialSearchQuery,
    initialSort,
    loadView,
  ]);

  useEffect(() => {
    saveProductPageSize(userId, pageSize);
  }, [userId, pageSize]);

  useEffect(() => {
    if (hasAppliedSavedPageSize.current) return;
    hasAppliedSavedPageSize.current = true;

    saveProductPageSize(userId, initialPageSize);

    if (initialPageSize !== PRODUCT_PAGE_SIZE) {
      syncProductsUrl(
        initialCurrentPage,
        initialSearchQuery,
        initialPageSize,
        initialSort,
        initialCategoryFilter,
        initialBrandFilter,
      );
    }
  }, [
    initialBrandFilter,
    initialCategoryFilter,
    initialCurrentPage,
    initialPageSize,
    initialSearchQuery,
    initialSort,
    syncProductsUrl,
    userId,
  ]);

  const applyScopeFilters = useCallback(
    (nextCategoryFilter: string, nextBrandFilter: string) => {
      loadView(
        1,
        searchQuery,
        pageSize,
        sort,
        nextCategoryFilter,
        nextBrandFilter,
        "scope",
      );
    },
    [loadView, pageSize, searchQuery, sort],
  );

  const handleCategoryFilterChange = useCallback(
    (value: string) => {
      const currentBrand = draftBrandFilter || brandFilter;
      const nextBrandOptions = buildProductListBrandOptions(
        filterOptionRows,
        value,
      );
      const keptBrand =
        currentBrand && nextBrandOptions.includes(currentBrand)
          ? currentBrand
          : "";

      setDraftCategoryFilter(value);
      setDraftBrandFilter(keptBrand);
      applyScopeFilters(value, keptBrand);
    },
    [
      applyScopeFilters,
      brandFilter,
      draftBrandFilter,
      filterOptionRows,
    ],
  );

  const handleBrandFilterChange = useCallback(
    (value: string) => {
      const nextCategory = draftCategoryFilter || categoryFilter;
      setDraftBrandFilter(value);
      applyScopeFilters(nextCategory, value);
    },
    [applyScopeFilters, categoryFilter, draftCategoryFilter],
  );

  const applySearch = useCallback(() => {
    const trimmed = draftQuery.trim();
    if (trimmed.length > 0 && trimmed.length < PRODUCT_SEARCH_MIN_LENGTH) {
      setLoadError(`검색어는 ${PRODUCT_SEARCH_MIN_LENGTH}자 이상 입력해 주세요.`);
      return;
    }
    loadView(
      1,
      trimmed,
      pageSize,
      sort,
      draftCategoryFilter,
      draftBrandFilter,
      "all",
    );
  }, [
    draftBrandFilter,
    draftCategoryFilter,
    draftQuery,
    loadView,
    pageSize,
    sort,
  ]);

  const handlePageSizeChange = useCallback(
    (nextPageSize: ProductPageSize) => {
      setPageSize(nextPageSize);
      loadView(1, searchQuery, nextPageSize, sort);
    },
    [loadView, searchQuery, sort],
  );

  const handleSortColumn = useCallback(
    (column: ProductSortColumn) => {
      const nextSort = cycleProductListSort(sort, column);
      setSort(nextSort);
      loadView(1, searchQuery, pageSize, nextSort);
    },
    [loadView, pageSize, searchQuery, sort],
  );

  const handleSelectProduct = useCallback(
    (product: SaleProductOption) => {
      const value = product.sku || product.model_name;
      setDraftQuery(value);
      loadView(1, value, pageSize, sort, categoryFilter, brandFilter, "all");
      setHighlightedIds(new Set([product.id]));

      requestAnimationFrame(() => {
        document
          .getElementById(`product-row-${product.id}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });

      window.setTimeout(() => {
        setHighlightedIds(new Set());
      }, 2500);
    },
    [categoryFilter, brandFilter, loadView, pageSize, sort],
  );

  const handleProductRegistered = useCallback(
    (productId: string) => {
      loadView(currentPage, searchQuery, pageSize, sort);
      setHighlightedIds(new Set([productId]));

      requestAnimationFrame(() => {
        document
          .getElementById(`product-row-${productId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      });

      window.setTimeout(() => {
        setHighlightedIds(new Set());
      }, 2500);
    },
    [currentPage, loadView, pageSize, searchQuery, sort],
  );

  const reloadList = useCallback(() => {
    loadView(currentPage, searchQuery, pageSize, sort);
  }, [currentPage, loadView, pageSize, searchQuery, sort]);

  const syncListFromServer = useCallback(() => {
    void loadProductsListView({
      page: currentPage,
      searchQuery,
      pageSize,
      sort,
      categoryFilter,
      brandFilter,
    }).then((result) => {
      if ("error" in result && result.error) return;
      if (!result.products || !result.listStats) return;

      setProducts(result.products);
      setReservationsByProductId(result.reservationsByProductId ?? {});
      setListStats(result.listStats);
      setTotalPages(result.totalPages);
    });
  }, [
    brandFilter,
    categoryFilter,
    currentPage,
    pageSize,
    searchQuery,
    sort,
  ]);

  const handleProductFieldSaved = useCallback(
    (productId: string, field: ProductInlineField, value: string) => {
      setProducts((prev) =>
        prev.map((product) =>
          product.id === productId
            ? applyProductInlineFieldUpdate(product, field, value)
            : product,
        ),
      );
      // router.refresh()는 저장 직후 RSC 렌더 오류를 유발할 수 있어
      // 현재 페이지만 서버 액션으로 다시 읽습니다.
      syncListFromServer();
    },
    [syncListFromServer],
  );

  return (
    <>
      <div>
        <ProductsWorkspace
          userId={userId}
          products={products}
          reservationsByProductId={reservationsByProductId}
          readOnly={readOnly}
          sort={sort}
          onSortColumn={handleSortColumn}
          externalHighlightedIds={highlightedIds}
          listSummary={listSummary}
          searchQuery={searchQuery}
          emptyMessage={
            isListFiltered
              ? "검색 조건에 맞는 제품이 없습니다."
              : undefined
          }
          onProductRegistered={handleProductRegistered}
          onReloadList={reloadList}
          onProductFieldSaved={handleProductFieldSaved}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          searchSlot={
            <div className="flex flex-wrap items-center gap-1">
              <KeyStockFilterCombobox
                id="product_list_category_filter"
                value={draftCategoryFilter}
                options={filterCategories}
                emptyLabel="품목"
                placeholder="품목"
                onChange={handleCategoryFilterChange}
                className={compactFilterInputClass}
              />
              <KeyStockFilterCombobox
                id="product_list_brand_filter"
                value={draftBrandFilter}
                options={draftBrandOptions}
                emptyLabel="브랜드"
                placeholder="브랜드"
                onChange={handleBrandFilterChange}
                className={compactFilterInputClass}
              />
              <ProductListSearch
                compact
                liveSuggestions={false}
                query={draftQuery}
                onQueryChange={setDraftQuery}
                onConfirm={applySearch}
                onSelectProduct={handleSelectProduct}
              />
            </div>
          }
        />
        {loadError ? (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {loadError}
          </p>
        ) : null}
      </div>

      {totalPages > 1 ? (
        <nav
          aria-label="제품 목록 페이지"
          className="mt-4 flex flex-wrap items-center justify-center gap-1"
        >
          {showPageArrows ? (
            <button
              type="button"
              aria-label="이전 페이지 묶음"
              disabled={!canShiftPageWindowLeft}
              onClick={() =>
                setPageWindowStart((prev) =>
                  clampPageWindowStart(prev - VISIBLE_PAGE_COUNT, totalPages),
                )
              }
              className={arrowButtonClass}
            >
              ←
            </button>
          ) : null}

          {Array.from(
            { length: visiblePageEnd - visiblePageStart + 1 },
            (_, index) => {
              const page = visiblePageStart + index;
              const isActive = page === currentPage;

              return (
                <button
                  key={page}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => loadView(page, searchQuery, pageSize, sort)}
                  className={`${pageButtonClass} ${
                    isActive
                      ? "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  {page}
                </button>
              );
            },
          )}

          {showPageArrows ? (
            <button
              type="button"
              aria-label="다음 페이지 묶음"
              disabled={!canShiftPageWindowRight}
              onClick={() =>
                setPageWindowStart((prev) =>
                  clampPageWindowStart(prev + VISIBLE_PAGE_COUNT, totalPages),
                )
              }
              className={arrowButtonClass}
            >
              →
            </button>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
