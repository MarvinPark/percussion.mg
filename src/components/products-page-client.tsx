"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductListSearch from "@/components/product-list-search";
import ProductsWorkspace from "@/components/products-workspace";
import { filterProducts } from "@/lib/product-search";
import type { Product } from "@/types/product";
import type { ProductListStats } from "@/lib/product-list-loader";

const PAGE_SIZE = 10;
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

function ensurePageInWindow(
  page: number,
  windowStart: number,
  totalPages: number,
) {
  if (totalPages <= VISIBLE_PAGE_COUNT) return 1;

  if (page < windowStart) return page;
  if (page > windowStart + VISIBLE_PAGE_COUNT - 1) {
    return clampPageWindowStart(page - VISIBLE_PAGE_COUNT + 1, totalPages);
  }

  return windowStart;
}

type ProductsPageClientProps = {
  userId: string;
  products: Product[];
  listStats: ProductListStats;
  readOnly?: boolean;
};

export default function ProductsPageClient({
  userId,
  products,
  listStats,
  readOnly = false,
}: ProductsPageClientProps) {
  const [draftQuery, setDraftQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageWindowStart, setPageWindowStart] = useState(1);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(
    () => new Set(),
  );

  const isSearchActive = appliedQuery.trim().length > 0;

  const filteredProducts = useMemo(
    () => filterProducts(products, appliedQuery),
    [products, appliedQuery],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / PAGE_SIZE),
  );

  useEffect(() => {
    setCurrentPage(1);
    setPageWindowStart(1);
  }, [appliedQuery]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setPageWindowStart((prev) => ensurePageInWindow(currentPage, prev, totalPages));
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

  const displayProducts = useMemo(() => {
    if (isSearchActive) {
      return filteredProducts;
    }

    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, currentPage, isSearchActive]);

  const filteredCount = filteredProducts.length;
  const filteredStockQuantity = useMemo(
    () =>
      filteredProducts.reduce(
        (sum, product) => sum + (Number(product.stock_quantity) || 0),
        0,
      ),
    [filteredProducts],
  );

  const totalCount = isSearchActive ? filteredCount : listStats.totalCount;
  const totalStockQuantity = isSearchActive
    ? filteredStockQuantity
    : listStats.totalStockQuantity;

  const listSummary = isSearchActive
    ? `검색 ${filteredCount.toLocaleString("ko-KR")}건 · 총 수량 ${filteredStockQuantity.toLocaleString("ko-KR")}개`
    : `총 ${totalCount.toLocaleString("ko-KR")}건 · 총 수량 ${totalStockQuantity.toLocaleString("ko-KR")}개`;

  const applySearch = useCallback(() => {
    setAppliedQuery(draftQuery);
  }, [draftQuery]);

  const handleSelectProduct = useCallback((product: Product) => {
    const value = product.sku || product.model_name;
    setDraftQuery(value);
    setAppliedQuery(value);
    setHighlightedIds(new Set([product.id]));

    requestAnimationFrame(() => {
      document
        .getElementById(`product-row-${product.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    window.setTimeout(() => {
      setHighlightedIds(new Set());
    }, 2500);
  }, []);

  return (
    <>
      <ProductsWorkspace
        userId={userId}
        products={displayProducts}
        readOnly={readOnly}
        externalHighlightedIds={highlightedIds}
        listSummary={listSummary}
        searchSlot={
          <ProductListSearch
            compact
            products={products}
            query={draftQuery}
            onQueryChange={setDraftQuery}
            onConfirm={applySearch}
            onSelectProduct={handleSelectProduct}
          />
        }
      />

      {!isSearchActive && filteredProducts.length > 0 ? (
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
                  onClick={() => setCurrentPage(page)}
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
