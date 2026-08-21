"use client";

import { useMemo, useState } from "react";
import SalesAnalyticsPeriodControls from "@/components/sales-analytics-period-controls";
import SalesTrendChart from "@/components/sales-trend-chart";
import {
  aggregateSalesByPeriod,
  getDefaultDateRange,
  type SalesAnalyticsRow,
  type SalesPeriodGranularity,
} from "@/lib/sales-analytics";

const sectionClass =
  "rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

type SalesTrendSectionProps = {
  rows: SalesAnalyticsRow[];
  title: string;
  subtitle: string;
};

export default function SalesTrendSection({
  rows,
  title,
  subtitle,
}: SalesTrendSectionProps) {
  const [granularity, setGranularity] =
    useState<SalesPeriodGranularity>("month");
  const [dateRange, setDateRange] = useState(() =>
    getDefaultDateRange("month"),
  );

  const trendBuckets = useMemo(
    () =>
      aggregateSalesByPeriod(
        rows,
        granularity,
        dateRange.start,
        dateRange.end,
      ),
    [rows, granularity, dateRange.start, dateRange.end],
  );

  function handleGranularityChange(next: SalesPeriodGranularity) {
    setGranularity(next);
    setDateRange(getDefaultDateRange(next));
  }

  return (
    <section className={sectionClass}>
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
          <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </span>
        </h3>

        <SalesAnalyticsPeriodControls
          granularity={granularity}
          dateRange={dateRange}
          onGranularityChange={handleGranularityChange}
          onDateRangeChange={setDateRange}
        />
      </div>

      <SalesTrendChart buckets={trendBuckets} granularity={granularity} />
    </section>
  );
}
