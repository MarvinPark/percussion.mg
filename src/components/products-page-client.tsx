"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ProductListSearch from "@/components/product-list-search";
import ProductsWorkspace from "@/components/products-workspace";
import type { ProductListStats } from "@/lib/product-list-loader";
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

function buildProductsPath(page: number, searchQuery: string) {
  const params = new URLSearchParams();
  if (searchQuery) params.set("q", searchQuery);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/products?${query}` : "/products";
}

type ProductsPageClientProps = {
  userId: string;
  products: Product[];
  listStats: ProductListStats;
  currentPage: number;
  totalPages: number;
  searchQuery: string;
  readOnly?: boolean;
};

export default function ProductsPageClient({
  userId,
  products,
  listStats,
  currentPage,
  totalPages,
  searchQuery,
  readOnly = false,
}: ProductsPageClientProps) {
  const router = useRouter();
  const [draftQuery, setDraftQuery] = useState(searchQuery);
  const [pageWindowStart, setPageWindowStart] = useState(1);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(
    () => new Set(),
  );

  const isSearchActive = searchQuery.length > 0;

  useEffect(() => {
    setDraftQuery(searchQuery);
  }, [searchQuery]);

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

  const navigate = useCallback(
    (page: number, query: string) => {
      router.push(buildProductsPath(page, query.trim()));
    },
    [router],
  );

  const applySearch = useCallback(() => {
    navigate(1, draftQuery);
  }, [draftQuery, navigate]);

  const handleSelectProduct = useCallback(
    (product: Product) => {
      const value = product.sku || product.model_name;
      setDraftQuery(value);
      navigate(1, value);
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
    [navigate],
  );

  const pageWindowStartValue = visiblePageStart;

  return (
    <>
      <ProductsWorkspace
        userId={userId}
        products={products}
        readOnly={readOnly}
        externalHighlightedIds={highlightedIds}
        listSummary={listSummary}
        searchSlot={
          <ProductListSearch
            compact
            query={draftQuery}
            onQueryChange={setDraftQuery}
            onConfirm={applySearch}
            onSelectProduct={handleSelectProduct}
          />
        }
      />

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
            { length: visiblePageEnd - pageWindowStartValue + 1 },
            (_, index) => {
              const page = pageWindowStartValue + index;
              const isActive = page === currentPage;

              return (
                <button
                  key={page}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => navigate(page, searchQuery)}
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
