"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadProductsListView } from "@/app/(main)/products/actions";
import type { ProductInlineField } from "@/app/(main)/products/actions";
import ProductListSearch from "@/components/product-list-search";
import ProductsWorkspace from "@/components/products-workspace";
import type {
  ProductListStats,
  ProductPageSize,
} from "@/lib/product-list-loader";
import {
  PRODUCT_PAGE_SIZE,
  PRODUCT_PAGE_SIZE_OPTIONS,
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

const pageButtonClass =
  "inline-flex h-8 min-w-8 items-center justify-center rounded border px-2 text-sm font-medium";

const arrowButtonClass =
  "inline-flex h-8 w-8 items-center justify-center rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

function clampPageWindowStart(start: number, totalPages: number) {
  if (totalPages <= VISIBLE_PAGE_COUNT) return 1;
  const maxStart = totalPages - VISIBLE_PAGE_COUNT + 1;
  return Math.max(1, Math.min(start, maxStart));
}

function syncProductsUrl(
  page: number,
  searchQuery: string,
  pageSize: ProductPageSize,
  sort: ProductListSort,
) {
  const params = new URLSearchParams();
  if (searchQuery) params.set("q", searchQuery);
  if (page > 1) params.set("page", String(page));
  if (pageSize !== 10) params.set("limit", String(pageSize));
  const sortParams = productListSortToSearchParams(sort);
  if (sortParams.sort) params.set("sort", sortParams.sort);
  if (sortParams.order) params.set("order", sortParams.order);
  const query = params.toString();
  const nextUrl = query ? `/products?${query}` : "/products";
  window.history.replaceState(null, "", nextUrl);
}

type ProductsPageClientProps = {
  userId: string;
  products: Product[];
  reservationsByProductId?: ProductReservationsByProductId;
  listStats: ProductListStats;
  currentPage: number;
  totalPages: number;
  searchQuery: string;
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
  pageSize: initialPageSize,
  sort: initialSort,
  readOnly = false,
  initialLoadError = null,
}: ProductsPageClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const loadRequestRef = useRef(0);
  const [products, setProducts] = useState(initialProducts);
  const [reservationsByProductId, setReservationsByProductId] = useState(
    initialReservationsByProductId,
  );
  const [listStats, setListStats] = useState(initialListStats);
  const [currentPage, setCurrentPage] = useState(initialCurrentPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sort, setSort] = useState(initialSort);
  const [draftQuery, setDraftQuery] = useState(initialSearchQuery);
  const [pageWindowStart, setPageWindowStart] = useState(1);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [loadError, setLoadError] = useState<string | null>(initialLoadError);
  const hasAppliedSavedPageSize = useRef(false);

  const isSearchActive = searchQuery.length > 0;

  useEffect(() => {
    setPageWindowStart(clampPageWindowStart(currentPage, totalPages));
  }, [currentPage, totalPages]);

  const visiblePageStart = clampPageWindowStart(pageWindowStart, totalPages);
  const visiblePageEnd = Math.min(
    totalPages,
    visiblePageStart + VISIBLE_PAGE_COUNT - 1,
  );
  const showPageArrows = totalPages > VISIBLE_PAGE_COUNT;
  const canShiftPageWindowLeft = visiblePageStart > 1;
  const canShiftPageWindowRight =
    visiblePageStart + VISIBLE_PAGE_COUNT - 1 < totalPages;

  const listSummary = isSearchActive
    ? `검색 ${listStats.totalCount.toLocaleString("ko-KR")}건 · 총 수량 ${listStats.totalStockQuantity.toLocaleString("ko-KR")}개${isLoading ? " · 불러오는 중..." : ""}`
    : `총 ${listStats.totalCount.toLocaleString("ko-KR")}건 · 총 수량 ${listStats.totalStockQuantity.toLocaleString("ko-KR")}개${isLoading ? " · 불러오는 중..." : ""}`;

  const loadView = useCallback(
    (
      page: number,
      query: string,
      nextPageSize: ProductPageSize = pageSize,
      nextSort: ProductListSort = sort,
    ) => {
      const requestId = ++loadRequestRef.current;
      setIsLoading(true);
      setLoadError(null);

      void loadProductsListView({
        page,
        searchQuery: query,
        pageSize: nextPageSize,
        sort: nextSort,
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
          setPageSize(resolvedPageSize);
          setSort(nextSort);
          setDraftQuery(result.searchQuery);
          saveProductPageSize(userId, resolvedPageSize);
          syncProductsUrl(
            result.currentPage,
            result.searchQuery,
            resolvedPageSize,
            nextSort,
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
    [pageSize, sort, userId],
  );

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
      );
    }
  }, [
    initialCurrentPage,
    initialPageSize,
    initialSearchQuery,
    initialSort,
    userId,
  ]);

  const applySearch = useCallback(() => {
    const trimmed = draftQuery.trim();
    if (trimmed.length > 0 && trimmed.length < PRODUCT_SEARCH_MIN_LENGTH) {
      setLoadError(`검색어는 ${PRODUCT_SEARCH_MIN_LENGTH}자 이상 입력해 주세요.`);
      return;
    }
    loadView(1, draftQuery, pageSize, sort);
  }, [draftQuery, loadView, pageSize, sort]);

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
      loadView(1, value, pageSize, sort);
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
    [loadView, pageSize, sort],
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

  const handleProductFieldSaved = useCallback(
    (productId: string, field: ProductInlineField, value: string) => {
      setProducts((prev) =>
        prev.map((product) =>
          product.id === productId
            ? applyProductInlineFieldUpdate(product, field, value)
            : product,
        ),
      );
    },
    [],
  );

  const pageSizeSelectClass =
    "h-8 rounded border border-zinc-300 bg-white px-2 text-sm text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200";

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
            isSearchActive
              ? "검색 조건에 맞는 제품이 없습니다."
              : undefined
          }
          onProductRegistered={handleProductRegistered}
          onReloadList={reloadList}
          onProductFieldSaved={handleProductFieldSaved}
          searchSlot={
            <div className="flex flex-wrap items-center gap-2">
              <ProductListSearch
                compact
                liveSuggestions={false}
                query={draftQuery}
                onQueryChange={setDraftQuery}
                onConfirm={applySearch}
                onSelectProduct={handleSelectProduct}
              />
              <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                <span className="shrink-0">표시</span>
                <select
                  value={pageSize}
                  onChange={(event) =>
                    handlePageSizeChange(
                      Number(event.target.value) as ProductPageSize,
                    )
                  }
                  className={pageSizeSelectClass}
                  aria-label="페이지당 표시 개수"
                >
                  {PRODUCT_PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
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
