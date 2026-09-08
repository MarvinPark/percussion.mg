"use client";

import { useEffect, useState } from "react";
import ProductListSearch from "@/components/product-list-search";
import SalesAnalyticsPeriodControls from "@/components/sales-analytics-period-controls";
import SalesProductTrendChart from "@/components/sales-product-trend-chart";
import { loadProductSalesTrend } from "@/app/(main)/dashboard/actions";
import {
  getDefaultDateRange,
  type SalesPeriodGranularity,
  type SalesProductPeriodBucket,
} from "@/lib/sales-analytics";
import type { SaleProductOption } from "@/types/sale";

const sectionClass =
  "rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

type ProductSalesTrendSectionProps = {
  slotIndex?: number;
  showSectionTitle?: boolean;
};

export default function ProductSalesTrendSection({
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
  const [loaded, setLoaded] = useState<{
    key: string;
    buckets: SalesProductPeriodBucket[];
    error: string | null;
  } | null>(null);

  const productId = selectedProduct?.id ?? null;
  const { start, end } = dateRange;
  const requestKey = productId
    ? `${productId}|${granularity}|${start}|${end}`
    : null;

  useEffect(() => {
    if (!productId || !requestKey) return;

    let cancelled = false;

    loadProductSalesTrend({ productId, granularity, start, end })
      .then((result) => {
        if (cancelled) return;
        setLoaded({
          key: requestKey,
          buckets: result.buckets,
          error: result.error,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setLoaded({
          key: requestKey,
          buckets: [],
          error: "제품 판매 추이를 불러오지 못했습니다.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey, productId, granularity, start, end]);

  // 현재 요청과 도착한 응답을 key로 맞춰, 조건이 바뀌면 이전 결과를 보여주지 않습니다.
  const isCurrent = loaded !== null && loaded.key === requestKey;
  const trendBuckets = isCurrent ? loaded.buckets : [];
  const loadError = isCurrent ? loaded.error : null;
  const isLoading = requestKey !== null && !isCurrent;

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
      ) : loadError ? (
        <p className="py-8 text-center text-sm text-red-600 dark:text-red-400">
          {loadError}
        </p>
      ) : isLoading ? (
        <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          판매 추이를 불러오는 중입니다…
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
