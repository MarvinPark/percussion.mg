"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SalesListSearch from "@/components/sales-list-search";
import SalesSellerFilter from "@/components/sales-seller-filter";
import SalesTable from "@/components/sales-table";
import TablePagination from "@/components/table-pagination";
import TableRowSizeControl from "@/components/table-row-size-control";
import {
  loadSalesPageSize,
  saveSalesPageSize,
} from "@/lib/sales-list-preferences";
import { groupSalesByCategorySection } from "@/lib/sales-category-sections";
import {
  filterSales,
  filterSalesBySeller,
  getUniqueSellerNames,
} from "@/lib/sales-search";
import {
  paginateItems,
  TABLE_PAGE_SIZE,
  type TablePageSize,
} from "@/lib/table-page-size";
import {
  DEFAULT_TABLE_ROW_FONT_SIZE,
  loadTableRowFontSize,
  saveTableRowFontSize,
} from "@/lib/table-row-preferences";
import type { PaymentMethod, SaleProductOption, SaleWithProduct } from "@/types/sale";

const buttonClass =
  "inline-flex h-[26px] shrink-0 items-center rounded border border-zinc-300 bg-white px-2 py-1 text-[12px] leading-none font-normal text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

export type StaffOption = {
  id: string;
  full_name: string;
};

type SalesPageClientProps = {
  userId: string;
  currentUserName: string;
  sales: SaleWithProduct[];
  products: SaleProductOption[];
  paymentMethods: PaymentMethod[];
  saleCategories: string[];
  staffOptions: StaffOption[];
  canManageSales?: boolean;
};

export default function SalesPageClient({
  userId,
  currentUserName,
  sales,
  products,
  paymentMethods,
  saleCategories,
  staffOptions,
  canManageSales = true,
}: SalesPageClientProps) {
  const [sellerFilter, setSellerFilter] = useState(currentUserName);
  const [draftQuery, setDraftQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [pageSize, setPageSize] = useState<TablePageSize>(TABLE_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSizeLoaded, setPageSizeLoaded] = useState(false);
  const [rowFontSize, setRowFontSize] = useState(DEFAULT_TABLE_ROW_FONT_SIZE);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});
  const [pageSizeBySection, setPageSizeBySection] = useState<
    Partial<Record<string, TablePageSize>>
  >({});

  useEffect(() => {
    setPageSize(loadSalesPageSize(userId));
    setRowFontSize(loadTableRowFontSize("sales", userId));
    setPageSizeLoaded(true);
    setPreferencesLoaded(true);
  }, [userId]);

  useEffect(() => {
    if (!pageSizeLoaded) return;
    saveSalesPageSize(userId, pageSize);
  }, [pageSizeLoaded, pageSize, userId]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    saveTableRowFontSize("sales", userId, rowFontSize);
  }, [preferencesLoaded, rowFontSize, userId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [sellerFilter, appliedQuery]);

  const sellerOptions = useMemo(() => getUniqueSellerNames(sales), [sales]);

  const sellerScopedSales = useMemo(
    () => filterSalesBySeller(sales, sellerFilter),
    [sales, sellerFilter],
  );

  const filteredSales = useMemo(
    () =>
      filterSales(sales, {
        seller: sellerFilter,
        textQuery: appliedQuery,
      }),
    [sales, sellerFilter, appliedQuery],
  );

  const salesSections = useMemo(
    () => groupSalesByCategorySection(filteredSales),
    [filteredSales],
  );

  const paginatedSections = useMemo(
    () =>
      salesSections.map((section) => {
        const sectionPageSize = pageSizeBySection[section.id] ?? pageSize;
        return {
          ...section,
          pageSize: sectionPageSize,
          pagination: paginateItems(
            section.sales,
            currentPage,
            sectionPageSize,
          ),
        };
      }),
    [salesSections, currentPage, pageSize, pageSizeBySection],
  );

  const visibleSections = useMemo(
    () => paginatedSections.filter((section) => section.sales.length > 0),
    [paginatedSections],
  );

  const pagination = useMemo(() => {
    const totalPages = Math.max(
      1,
      ...paginatedSections.map((section) => section.pagination.totalPages),
    );
    const current = Math.min(currentPage, totalPages);
    return { currentPage: current, totalPages };
  }, [paginatedSections, currentPage]);

  useEffect(() => {
    if (currentPage !== pagination.currentPage) {
      setCurrentPage(pagination.currentPage);
    }
  }, [currentPage, pagination.currentPage]);

  const applySearch = useCallback(() => {
    setAppliedQuery(draftQuery);
    setCurrentPage(1);
  }, [draftQuery]);

  const handleSelectSale = useCallback(
    (sale: SaleWithProduct) => {
      const value =
        sale.customer_name?.trim() ||
        sale.products?.product_name?.trim() ||
        sale.products?.model_name?.trim() ||
        sale.products?.sku?.trim() ||
        "";
      setDraftQuery(value);
      setAppliedQuery(value);
      setCurrentPage(1);
    },
    [],
  );

  const handleReset = useCallback(() => {
    setSellerFilter("");
    setDraftQuery("");
    setAppliedQuery("");
    setCurrentPage(1);
  }, []);

  const handlePageSizeChange = useCallback((sectionId: string, nextPageSize: TablePageSize) => {
    setPageSizeBySection((current) => ({
      ...current,
      [sectionId]: nextPageSize,
    }));
    setCurrentPage(1);
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }, []);

  const hasActiveFilter = Boolean(
    sellerFilter.trim() || appliedQuery.trim(),
  );

  const emptyMessage =
    hasActiveFilter || draftQuery.trim()
      ? "검색 조건에 맞는 판매 기록이 없습니다."
      : undefined;

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-2">
          <SalesSellerFilter
            value={sellerFilter}
            options={sellerOptions}
            onChange={setSellerFilter}
            showAllOption
            allOptionLabel="전체보기"
          />

          <SalesListSearch
            sales={sellerScopedSales}
            query={draftQuery}
            onQueryChange={setDraftQuery}
            onConfirm={applySearch}
            onSelectSale={handleSelectSale}
          />

          <button type="button" onClick={applySearch} className={buttonClass}>
            확인
          </button>

          <button
            type="button"
            onClick={handleReset}
            className={buttonClass}
            disabled={
              !sellerFilter.trim() && !draftQuery.trim() && !appliedQuery.trim()
            }
          >
            전체보기
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TableRowSizeControl value={rowFontSize} onChange={setRowFontSize} />
        </div>
      </div>

      {visibleSections.length === 0 ? (
        <SalesTable
          userId={userId}
          sales={[]}
          products={products}
          paymentMethods={paymentMethods}
          saleCategories={saleCategories}
          staffOptions={staffOptions}
          rowFontSize={rowFontSize}
          canManageSales={canManageSales}
          emptyMessage={emptyMessage}
          className="mt-4"
        />
      ) : (
        <div className="mt-4 space-y-4">
          {visibleSections.map((section) => (
            <SalesTable
              key={section.id}
              userId={userId}
              sales={section.pagination.items}
              products={products}
              paymentMethods={paymentMethods}
              saleCategories={saleCategories}
              staffOptions={staffOptions}
              rowFontSize={rowFontSize}
              canManageSales={canManageSales}
              sectionTitle={section.label}
              sectionTotalCount={section.sales.length}
              sectionCollapsed={collapsedSections[section.id] ?? false}
              onSectionToggle={() => toggleSection(section.id)}
              pageSize={section.pageSize}
              onPageSizeChange={(nextPageSize) =>
                handlePageSizeChange(section.id, nextPageSize)
              }
              emptyMessage={emptyMessage}
            />
          ))}
        </div>
      )}

      <TablePagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={setCurrentPage}
        ariaLabel="매출 목록 페이지"
      />
    </>
  );
}
