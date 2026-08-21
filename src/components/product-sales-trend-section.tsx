"use client";

import { useMemo, useState } from "react";
import ProductListSearch from "@/components/product-list-search";
import SalesAnalyticsPeriodControls from "@/components/sales-analytics-period-controls";
import SalesProductTrendChart from "@/components/sales-product-trend-chart";
import {
  aggregateProductSalesByPeriod,
  getDefaultDateRange,
  type SalesAnalyticsRow,
  type SalesPeriodGranularity,
} from "@/lib/sales-analytics";
import type { SaleProductOption } from "@/types/sale";

const sectionClass =
  "rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

type ProductSalesTrendSectionProps = {
  rows: SalesAnalyticsRow[];
  slotIndex?: number;
  showSectionTitle?: boolean;
};

export default function ProductSalesTrendSection({
  rows,
  slotIndex,
  showSectionTitle = true,
}: ProductSalesTrendSectionProps) {
  const [granularity, setGranularity] =
    useState<SalesPeriodGranularity>("month");
  const [dateRange, setDateRange] = useState(() =>
    getDefaultDateRange("month"),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] =
    useState<SaleProductOption | null>(null);

  const trendBuckets = useMemo(() => {
    if (!selectedProduct) return [];
    return aggregateProductSalesByPeriod(
      rows,
      selectedProduct.id,
      granularity,
      dateRange.start,
      dateRange.end,
    );
  }, [
    rows,
    selectedProduct,
    granularity,
    dateRange.start,
    dateRange.end,
  ]);

  function handleGranularityChange(next: SalesPeriodGranularity) {
    setGranularity(next);
    setDateRange(getDefaultDateRange(next));
  }

  function handleSelectProduct(product: SaleProductOption) {
    setSelectedProduct(product);
    setSearchQuery(product.model_name || product.sku || "");
  }

  return (
    <section className={sectionClass}>
      <div className="mb-4 flex flex-col gap-3">
        <div
          className={`flex flex-col gap-2 sm:flex-row sm:items-center ${
            showSectionTitle ? "sm:justify-between" : "sm:justify-start"
          }`}
        >
          {showSectionTitle ? (
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {slotIndex ? `제품판매현황 ${slotIndex}` : "제품판매현황"}
              <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                제품별 매출·매입·마진·수량 추이
              </span>
            </h3>
          ) : null}

          <SalesAnalyticsPeriodControls
            granularity={granularity}
            dateRange={dateRange}
            onGranularityChange={handleGranularityChange}
            onDateRangeChange={setDateRange}
          />
        </div>

        <ProductListSearch
          compact
          query={searchQuery}
          onQueryChange={(value) => {
            setSearchQuery(value);
            if (
              selectedProduct &&
              value.trim() !==
                (selectedProduct.model_name || selectedProduct.sku || "").trim()
            ) {
              setSelectedProduct(null);
            }
          }}
          onConfirm={() => undefined}
          onSelectProduct={handleSelectProduct}
        />
      </div>

      {!selectedProduct ? (
        <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          제품을 검색해 선택하면 판매 현황을 확인할 수 있습니다.
        </p>
      ) : (
        <div className="mt-1 w-full">
          <SalesProductTrendChart
            buckets={trendBuckets}
            granularity={granularity}
          />
        </div>
      )}
    </section>
  );
}
