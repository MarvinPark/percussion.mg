"use client";

import { useMemo, useState } from "react";
import SalesRankChart from "@/components/sales-rank-chart";
import SalesTrendChart from "@/components/sales-trend-chart";
import {
  aggregateSalesByPeriod,
  aggregateSalesRanking,
  getCurrentMonthRange,
  getDefaultDateRange,
  SALES_RANK_DIMENSION_LABELS,
  type SalesAnalyticsRow,
  type SalesPeriodGranularity,
  type SalesRankDimension,
} from "@/lib/sales-analytics";

type SalesAnalyticsDashboardProps = {
  rows: SalesAnalyticsRow[];
};

const PERIOD_OPTIONS: { value: SalesPeriodGranularity; label: string }[] = [
  { value: "day", label: "일간" },
  { value: "week", label: "주간" },
  { value: "month", label: "월간" },
];

const RANK_DIMENSIONS: SalesRankDimension[] = [
  "sale_category",
  "business_partner",
  "brand",
  "product",
];

function periodToggleClass(active: boolean) {
  return [
    "rounded-md px-2.5 py-1 text-xs font-semibold transition",
    active
      ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500"
      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
  ].join(" ");
}

function dimensionSelectClass() {
  return "rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200";
}

function DimensionSelect({
  value,
  onChange,
}: {
  value: SalesRankDimension;
  onChange: (value: SalesRankDimension) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
      기준
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SalesRankDimension)}
        className={dimensionSelectClass()}
      >
        {RANK_DIMENSIONS.map((dimension) => (
          <option key={dimension} value={dimension}>
            {SALES_RANK_DIMENSION_LABELS[dimension]}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatMonthLabel(start: string): string {
  const [y, m] = start.split("-");
  return `${y}년 ${Number(m)}월`;
}

export default function SalesAnalyticsDashboard({
  rows,
}: SalesAnalyticsDashboardProps) {
  const [granularity, setGranularity] =
    useState<SalesPeriodGranularity>("month");
  const [dateRange, setDateRange] = useState(() =>
    getDefaultDateRange("month"),
  );
  const [leftDimension, setLeftDimension] =
    useState<SalesRankDimension>("business_partner");
  const [rightDimension, setRightDimension] =
    useState<SalesRankDimension>("sale_category");

  const monthRange = useMemo(() => getCurrentMonthRange(), []);
  const monthLabel = formatMonthLabel(monthRange.start);

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

  const leftRanking = useMemo(
    () =>
      aggregateSalesRanking(
        rows,
        leftDimension,
        monthRange.start,
        monthRange.end,
      ),
    [rows, leftDimension, monthRange.start, monthRange.end],
  );

  const rightRanking = useMemo(
    () =>
      aggregateSalesRanking(
        rows,
        rightDimension,
        monthRange.start,
        monthRange.end,
      ),
    [rows, rightDimension, monthRange.start, monthRange.end],
  );

  function handleGranularityChange(next: SalesPeriodGranularity) {
    setGranularity(next);
    setDateRange(getDefaultDateRange(next));
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              매출현황
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              기간별 매출·마진 추이 (만원)
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="inline-flex self-end rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-800/80">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleGranularityChange(option.value)}
                  className={periodToggleClass(granularity === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                시작
                <input
                  type="date"
                  value={dateRange.start}
                  max={dateRange.end}
                  onChange={(event) =>
                    setDateRange((prev) => ({
                      ...prev,
                      start: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
                />
              </label>
              <label className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                종료
                <input
                  type="date"
                  value={dateRange.end}
                  min={dateRange.start}
                  onChange={(event) =>
                    setDateRange((prev) => ({
                      ...prev,
                      end: event.target.value,
                    }))
                  }
                  className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
                />
              </label>
            </div>
          </div>
        </div>

        <SalesTrendChart buckets={trendBuckets} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <SalesRankChart
          title="월간 매출순위 Top 7"
          entries={leftRanking}
          dimensionLabel={SALES_RANK_DIMENSION_LABELS[leftDimension]}
          monthLabel={monthLabel}
          headerAction={
            <DimensionSelect
              value={leftDimension}
              onChange={setLeftDimension}
            />
          }
        />

        <SalesRankChart
          title="월간 매출순위 Top 7"
          entries={rightRanking}
          dimensionLabel={SALES_RANK_DIMENSION_LABELS[rightDimension]}
          monthLabel={monthLabel}
          headerAction={
            <DimensionSelect
              value={rightDimension}
              onChange={setRightDimension}
            />
          }
        />
      </div>
    </div>
  );
}
