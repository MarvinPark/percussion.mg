"use client";

import { useCallback, useMemo, useState } from "react";
import SalesListSearch from "@/components/sales-list-search";
import SalesSellerFilter from "@/components/sales-seller-filter";
import SalesTable from "@/components/sales-table";
import {
  filterSales,
  filterSalesBySeller,
  getUniqueSellerNames,
} from "@/lib/sales-search";
import type { PaymentMethod, SaleProductOption, SaleWithProduct } from "@/types/sale";

const buttonClass =
  "inline-flex h-[26px] shrink-0 items-center rounded border border-zinc-300 bg-white px-2 py-1 text-[12px] leading-none font-normal text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const fontControlBoxClass =
  "inline-flex h-[26px] shrink-0 items-center overflow-hidden rounded border border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900";

const fontControlButtonClass =
  "inline-flex h-[26px] w-[26px] items-center justify-center text-[11px] leading-none text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-zinc-800";

const MIN_ROW_FONT_SIZE = 9;
const MAX_ROW_FONT_SIZE = 16;
const DEFAULT_ROW_FONT_SIZE = 12;

type SalesPageClientProps = {
  sales: SaleWithProduct[];
  products: SaleProductOption[];
  paymentMethods: PaymentMethod[];
  canManageSales?: boolean;
};

export default function SalesPageClient({
  sales,
  products,
  paymentMethods,
  canManageSales = true,
}: SalesPageClientProps) {
  const [sellerFilter, setSellerFilter] = useState("");
  const [draftQuery, setDraftQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [rowFontSize, setRowFontSize] = useState(DEFAULT_ROW_FONT_SIZE);

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

  const applySearch = useCallback(() => {
    setAppliedQuery(draftQuery);
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
    },
    [],
  );

  const handleReset = useCallback(() => {
    setSellerFilter("");
    setDraftQuery("");
    setAppliedQuery("");
  }, []);

  const hasActiveFilter = Boolean(
    sellerFilter.trim() || appliedQuery.trim(),
  );

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-2">
          <SalesSellerFilter
            value={sellerFilter}
            options={sellerOptions}
            onChange={setSellerFilter}
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

        <div className={fontControlBoxClass}>
          <button
            type="button"
            aria-label="행 글자 크기 줄이기"
            disabled={rowFontSize <= MIN_ROW_FONT_SIZE}
            onClick={() =>
              setRowFontSize((size) => Math.max(MIN_ROW_FONT_SIZE, size - 1))
            }
            className={`${fontControlButtonClass} border-r border-zinc-300 dark:border-zinc-600`}
          >
            -
          </button>
          <button
            type="button"
            aria-label="행 글자 크기 키우기"
            disabled={rowFontSize >= MAX_ROW_FONT_SIZE}
            onClick={() =>
              setRowFontSize((size) => Math.min(MAX_ROW_FONT_SIZE, size + 1))
            }
            className={fontControlButtonClass}
          >
            +
          </button>
        </div>
      </div>

      <SalesTable
        sales={filteredSales}
        products={products}
        paymentMethods={paymentMethods}
        rowFontSize={rowFontSize}
        canManageSales={canManageSales}
        emptyMessage={
          hasActiveFilter || draftQuery.trim()
            ? "검색 조건에 맞는 판매 기록이 없습니다."
            : undefined
        }
      />
    </>
  );
}
