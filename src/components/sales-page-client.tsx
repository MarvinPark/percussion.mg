"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SalesListSearch from "@/components/sales-list-search";
import SalesSellerFilter from "@/components/sales-seller-filter";
import SalesTable from "@/components/sales-table";
import TablePagination from "@/components/table-pagination";
import TableRowSizeControl from "@/components/table-row-size-control";
import {
  filterOtherSectionSalesByCategory,
  getOtherSectionCategoryOptions,
  groupSalesByCategorySection,
} from "@/lib/sales-category-sections";
import {
  loadSalesSectionOrder,
  saveSalesSectionOrder,
  sortSalesSections,
  type SalesSectionId,
} from "@/lib/sales-section-order-preferences";
import SalesSectionOrderControl from "@/components/sales-section-order-control";
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

const INITIAL_SECTION_PAGES = {
  online: 1,
  wholesale: 1,
  other: 1,
} as const;

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
  const [otherCategoryFilter, setOtherCategoryFilter] = useState("");
  const [currentPageBySection, setCurrentPageBySection] = useState<
    Record<string, number>
  >({ ...INITIAL_SECTION_PAGES });
  const [rowFontSize, setRowFontSize] = useState(DEFAULT_TABLE_ROW_FONT_SIZE);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});
  const [pageSizeBySection, setPageSizeBySection] = useState<
    Partial<Record<string, TablePageSize>>
  >({});
  const [sectionOrder, setSectionOrder] = useState<SalesSectionId[]>(() =>
    loadSalesSectionOrder(userId),
  );
  const [sectionOrderLoaded, setSectionOrderLoaded] = useState(false);

  useEffect(() => {
    setRowFontSize(loadTableRowFontSize("sales", userId));
    setSectionOrder(loadSalesSectionOrder(userId));
    setPreferencesLoaded(true);
    setSectionOrderLoaded(true);
  }, [userId]);

  useEffect(() => {
    if (!preferencesLoaded) return;
    saveTableRowFontSize("sales", userId, rowFontSize);
  }, [preferencesLoaded, rowFontSize, userId]);

  useEffect(() => {
    if (!sectionOrderLoaded) return;
    saveSalesSectionOrder(userId, sectionOrder);
  }, [sectionOrderLoaded, sectionOrder, userId]);

  useEffect(() => {
    setCurrentPageBySection({ ...INITIAL_SECTION_PAGES });
    setOtherCategoryFilter("");
  }, [sellerFilter, appliedQuery]);

  useEffect(() => {
    setCurrentPageBySection((current) => ({
      ...current,
      other: 1,
    }));
  }, [otherCategoryFilter]);

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
    () =>
      sortSalesSections(
        groupSalesByCategorySection(filteredSales),
        sectionOrder,
      ),
    [filteredSales, sectionOrder],
  );

  const otherCategoryOptions = useMemo(() => {
    const otherSection = salesSections.find((section) => section.id === "other");
    if (!otherSection) return [];
    return getOtherSectionCategoryOptions(otherSection.sales);
  }, [salesSections]);

  const paginatedSections = useMemo(
    () =>
      salesSections.map((section) => {
        const sectionPageSize =
          pageSizeBySection[section.id] ?? TABLE_PAGE_SIZE;
        const sectionCurrentPage = currentPageBySection[section.id] ?? 1;
        const sectionSales =
          section.id === "other"
            ? filterOtherSectionSalesByCategory(
                section.sales,
                otherCategoryFilter,
              )
            : section.sales;

        return {
          ...section,
          sales: sectionSales,
          pageSize: sectionPageSize,
          pagination: paginateItems(
            sectionSales,
            sectionCurrentPage,
            sectionPageSize,
          ),
        };
      }),
    [
      salesSections,
      currentPageBySection,
      pageSizeBySection,
      otherCategoryFilter,
    ],
  );

  const applySearch = useCallback(() => {
    setAppliedQuery(draftQuery);
    setCurrentPageBySection({ ...INITIAL_SECTION_PAGES });
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
      setCurrentPageBySection({ ...INITIAL_SECTION_PAGES });
    },
    [],
  );

  const handleReset = useCallback(() => {
    setSellerFilter("");
    setDraftQuery("");
    setAppliedQuery("");
    setOtherCategoryFilter("");
    setCurrentPageBySection({ ...INITIAL_SECTION_PAGES });
  }, []);

  const handlePageSizeChange = useCallback(
    (sectionId: string, nextPageSize: TablePageSize) => {
      setPageSizeBySection((current) => ({
        ...current,
        [sectionId]: nextPageSize,
      }));
      setCurrentPageBySection((current) => ({
        ...current,
        [sectionId]: 1,
      }));
    },
    [],
  );

  const handleSectionPageChange = useCallback(
    (sectionId: string, page: number) => {
      setCurrentPageBySection((current) => ({
        ...current,
        [sectionId]: page,
      }));
    },
    [],
  );

  const toggleSection = useCallback((sectionId: string) => {
    setCollapsedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }, []);

  const hasActiveFilter = Boolean(
    sellerFilter.trim() || appliedQuery.trim() || otherCategoryFilter.trim(),
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
          <SalesSectionOrderControl
            order={sectionOrder}
            onChange={setSectionOrder}
          />
          <TableRowSizeControl value={rowFontSize} onChange={setRowFontSize} />
        </div>
      </div>

      <div className="mt-4 space-y-6">
        {paginatedSections.map((section) => (
          <section key={section.id}>
            <SalesTable
              userId={userId}
              sales={section.pagination.items}
              sectionSales={section.sales}
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
              sectionCategoryFilter={
                section.id === "other" && otherCategoryOptions.length > 0
                  ? {
                      value: otherCategoryFilter,
                      options: otherCategoryOptions,
                      onChange: setOtherCategoryFilter,
                    }
                  : undefined
              }
            />
            <TablePagination
              currentPage={section.pagination.currentPage}
              totalPages={section.pagination.totalPages}
              onPageChange={(page) => handleSectionPageChange(section.id, page)}
              ariaLabel={`${section.label} 매출 목록 페이지`}
            />
          </section>
        ))}
      </div>
    </>
  );
}
