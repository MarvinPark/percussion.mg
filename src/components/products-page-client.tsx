"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { loadProductsListView } from "@/app/(main)/products/actions";
import ProductListSearch from "@/components/product-list-search";
import ProductsWorkspace from "@/components/products-workspace";
import type {
  ProductListStats,
  ProductPageSize,
} from "@/lib/product-list-loader";
import { PRODUCT_PAGE_SIZE_OPTIONS } from "@/lib/product-list-loader";
import type { Product } from "@/types/product";

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
) {
  const params = new URLSearchParams();
  if (searchQuery) params.set("q", searchQuery);
  if (page > 1) params.set("page", String(page));
  if (pageSize !== 10) params.set("limit", String(pageSize));
  const query = params.toString();
  const nextUrl = query ? `/products?${query}` : "/products";
  window.history.replaceState(null, "", nextUrl);
}

type ProductsPageClientProps = {
  userId: string;
  products: Product[];
  listStats: ProductListStats;
  currentPage: number;
  totalPages: number;
  searchQuery: string;
  pageSize: ProductPageSize;
  readOnly?: boolean;
};

export default function ProductsPageClient({
  userId,
  products: initialProducts,
  listStats: initialListStats,
  currentPage: initialCurrentPage,
  totalPages: initialTotalPages,
  searchQuery: initialSearchQuery,
  pageSize: initialPageSize,
  readOnly = false,
}: ProductsPageClientProps) {
  const [isPending, startTransition] = useTransition();
  const [products, setProducts] = useState(initialProducts);
  const [listStats, setListStats] = useState(initialListStats);
  const [currentPage, setCurrentPage] = useState(initialCurrentPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [draftQuery, setDraftQuery] = useState(initialSearchQuery);
  const [pageWindowStart, setPageWindowStart] = useState(1);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(
    () => new Set(),
  );

  const isSearchActive = searchQuery.length > 0;

  useEffect(() => {
    setProducts(initialProducts);
    setListStats(initialListStats);
    setCurrentPage(initialCurrentPage);
    setTotalPages(initialTotalPages);
    setSearchQuery(initialSearchQuery);
    setPageSize(initialPageSize);
    setDraftQuery(initialSearchQuery);
  }, [
    initialProducts,
    initialListStats,
    initialCurrentPage,
    initialTotalPages,
    initialSearchQuery,
    initialPageSize,
  ]);

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
    ? `검색 ${listStats.totalCount.toLocaleString("ko-KR")}건 · 총 수량 ${listStats.totalStockQuantity.toLocaleString("ko-KR")}개`
    : `총 ${listStats.totalCount.toLocaleString("ko-KR")}건 · 총 수량 ${listStats.totalStockQuantity.toLocaleString("ko-KR")}개`;

  const loadView = useCallback(
    (page: number, query: string, nextPageSize: ProductPageSize = pageSize) => {
    startTransition(async () => {
      const result = await loadProductsListView({
        page,
        searchQuery: query,
        pageSize: nextPageSize,
      });

      if ("error" in result && result.error) {
        return;
      }

      if (!result.products || !result.listStats) {
        return;
      }

      setProducts(result.products);
      setListStats(result.listStats);
      setCurrentPage(result.currentPage);
      setTotalPages(result.totalPages);
      setSearchQuery(result.searchQuery);
      setPageSize(result.pageSize ?? nextPageSize);
      setDraftQuery(result.searchQuery);
      syncProductsUrl(
        result.currentPage,
        result.searchQuery,
        result.pageSize ?? nextPageSize,
      );
    });
  },
    [pageSize],
  );

  const applySearch = useCallback(() => {
    loadView(1, draftQuery, pageSize);
  }, [draftQuery, loadView, pageSize]);

  const handlePageSizeChange = useCallback(
    (nextPageSize: ProductPageSize) => {
      setPageSize(nextPageSize);
      loadView(1, searchQuery, nextPageSize);
    },
    [loadView, searchQuery],
  );

  const handleSelectProduct = useCallback(
    (product: Product) => {
      const value = product.sku || product.model_name;
      setDraftQuery(value);
      loadView(1, value, pageSize);
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
    [loadView, pageSize],
  );

  const pageSizeSelectClass =
    "h-8 rounded border border-zinc-300 bg-white px-2 text-sm text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200";

  return (
    <>
      <div className={isPending ? "opacity-60 transition-opacity" : ""}>
        <ProductsWorkspace
          userId={userId}
          products={products}
          readOnly={readOnly}
          externalHighlightedIds={highlightedIds}
          listSummary={listSummary}
          searchSlot={
            <div className="flex flex-wrap items-center gap-2">
              <ProductListSearch
                compact
                query={draftQuery}
                onQueryChange={setDraftQuery}
                onConfirm={applySearch}
                onSelectProduct={handleSelectProduct}
              />
              <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                <span className="shrink-0">표시</span>
                <select
                  value={pageSize}
                  disabled={isPending}
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
              disabled={!canShiftPageWindowLeft || isPending}
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
                  disabled={isPending}
                  onClick={() => loadView(page, searchQuery, pageSize)}
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
              disabled={!canShiftPageWindowRight || isPending}
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
