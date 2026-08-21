"use client";

import ProductSalesTrendSection from "@/components/product-sales-trend-section";
import type { SalesAnalyticsRow } from "@/lib/sales-analytics";

const PRODUCT_SLOT_COUNT = 3;

type ProductSalesTrendDashboardProps = {
  rows: SalesAnalyticsRow[];
};

export default function ProductSalesTrendDashboard({
  rows,
}: ProductSalesTrendDashboardProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          제품판매현황
        </h3>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          제품별 매출·매입·마진·수량 추이
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: PRODUCT_SLOT_COUNT }, (_, index) => (
          <div
            key={index + 1}
            className={index > 0 ? "hidden lg:block" : undefined}
          >
            <ProductSalesTrendSection
              rows={rows}
              slotIndex={index + 1}
              showSectionTitle={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
