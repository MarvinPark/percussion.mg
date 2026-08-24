"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductListSearch from "@/components/product-list-search";
import StockHistoryList from "@/components/stock-history-list";
import TablePagination from "@/components/table-pagination";
import TablePageSizeSelect from "@/components/table-page-size-select";
import TableRowSizeControl from "@/components/table-row-size-control";
import {
  loadStockHistoryPageSize,
  saveStockHistoryPageSize,
} from "@/lib/stock-history-list-preferences";
import { filterStockMovements } from "@/lib/stock-movement-search";
import {
  DEFAULT_TABLE_ROW_FONT_SIZE,
  loadTableRowFontSize,
  saveTableRowFontSize,
} from "@/lib/table-row-preferences";
import {
  paginateItems,
  TABLE_PAGE_SIZE,
  type TablePageSize,
} from "@/lib/table-page-size";
import type { SaleProductOption } from "@/types/sale";
import type { StockMovementWithProduct } from "@/types/stock-movement";

const buttonClass =
  "inline-flex h-[26px] shrink-0 items-center rounded border border-zinc-300 bg-white px-2 py-1 text-[12px] leading-none font-normal text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

type StockHistoryListPageClientProps = {
  userId: string;
  movements: StockMovementWithProduct[];
};

export default function StockHistoryListPageClient({
  userId,
  movements,
}: StockHistoryListPageClientProps) {
  const [draftQuery, setDraftQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [pageSize, setPageSize] = useState<TablePageSize>(TABLE_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowFontSize, setRowFontSize] = useState(DEFAULT_TABLE_ROW_FONT_SIZE);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    setPageSize(loadStockHistoryPageSize(userId));
    setRowFontSize(loadTableRowFontSize("stock-history", userId));
    setPreferencesLoaded(true);
  }, [userId]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    saveStockHistoryPageSize(userId, pageSize);
  }, [preferencesLoaded, pageSize, userId]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    saveTableRowFontSize("stock-history", userId, rowFontSize);
  }, [preferencesLoaded, rowFontSize, userId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [appliedQuery]);

  const filteredMovements = useMemo(
    () => filterStockMovements(movements, appliedQuery),
    [movements, appliedQuery],
  );

  const pagination = useMemo(
    () => paginateItems(filteredMovements, currentPage, pageSize),
    [filteredMovements, currentPage, pageSize],
  );

  useEffect(() => {
    setCurrentPage((page) =>
      page > pagination.totalPages ? pagination.totalPages : page,
    );
  }, [pagination.totalPages]);

  const applySearch = useCallback(() => {
    setAppliedQuery(draftQuery);
    setCurrentPage(1);
  }, [draftQuery]);

  const handleReset = useCallback(() => {
    setDraftQuery("");
    setAppliedQuery("");
    setCurrentPage(1);
  }, []);

  const handleSelectProduct = useCallback((product: SaleProductOption) => {
    const value =
      product.sku?.trim() ||
      product.model_name?.trim() ||
      product.product_name?.trim() ||
      "";
    setDraftQuery(value);
    setAppliedQuery(value);
    setCurrentPage(1);
  }, []);

  function handlePageSizeChange(nextPageSize: TablePageSize) {
    setPageSize(nextPageSize);
    setCurrentPage(1);
  }

  const hasActiveFilter = Boolean(appliedQuery.trim() || draftQuery.trim());
  const listSummary =
    appliedQuery.trim() && filteredMovements.length !== movements.length
      ? `검색 ${filteredMovements.length}건 · 전체 ${movements.length}건`
      : `전체 ${movements.length}건`;

  const emptyMessage =
    appliedQuery.trim() && filteredMovements.length === 0
      ? "검색 조건에 맞는 변동 기록이 없습니다."
      : undefined;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-2">
          <ProductListSearch
            compact
            query={draftQuery}
            onQueryChange={setDraftQuery}
            onConfirm={applySearch}
            onSelectProduct={handleSelectProduct}
          />

          <button
            type="button"
            onClick={handleReset}
            disabled={!hasActiveFilter}
            className={buttonClass}
          >
            전체보기
          </button>

          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {listSummary}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TablePageSizeSelect
            value={pageSize}
            onChange={handlePageSizeChange}
            compact
          />
          <TableRowSizeControl value={rowFontSize} onChange={setRowFontSize} />
        </div>
      </div>

      <StockHistoryList
        userId={userId}
        movements={pagination.items}
        rowFontSize={rowFontSize}
        emptyMessage={emptyMessage}
      />

      <TablePagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={setCurrentPage}
        ariaLabel="재고 변동 이력 페이지"
      />
    </>
  );
}
