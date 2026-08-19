"use client";

import { useEffect, useState } from "react";

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

type TablePaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
};

export default function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  ariaLabel = "목록 페이지",
}: TablePaginationProps) {
  const [pageWindowStart, setPageWindowStart] = useState(1);

  useEffect(() => {
    setPageWindowStart(clampPageWindowStart(currentPage, totalPages));
  }, [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  const visiblePageStart = clampPageWindowStart(pageWindowStart, totalPages);
  const visiblePageEnd = Math.min(
    totalPages,
    visiblePageStart + VISIBLE_PAGE_COUNT - 1,
  );
  const showPageArrows = totalPages > VISIBLE_PAGE_COUNT;
  const canShiftPageWindowLeft = visiblePageStart > 1;
  const canShiftPageWindowRight =
    visiblePageStart + VISIBLE_PAGE_COUNT - 1 < totalPages;

  return (
    <nav
      aria-label={ariaLabel}
      className="mt-4 flex flex-wrap items-center justify-center gap-1"
    >
      {showPageArrows ? (
        <button
          type="button"
          aria-label="이전 페이지 묶음"
          disabled={!canShiftPageWindowLeft || disabled}
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
              disabled={disabled}
              onClick={() => onPageChange(page)}
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
          disabled={!canShiftPageWindowRight || disabled}
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
  );
}
