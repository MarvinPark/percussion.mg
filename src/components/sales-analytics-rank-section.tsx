"use client";

import { useMemo, useState } from "react";
import SalesRankChart from "@/components/sales-rank-chart";
import {
  aggregateSalesRanking,
  getCurrentMonthRange,
  SALES_RANK_DIMENSION_LABELS,
  type SalesAnalyticsRow,
  type SalesRankDimension,
} from "@/lib/sales-analytics";

const RANK_DIMENSIONS: SalesRankDimension[] = [
  "sale_category",
  "business_partner",
  "brand",
  "product",
];

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

type SalesAnalyticsRankSectionProps = {
  rows: SalesAnalyticsRow[];
};

export default function SalesAnalyticsRankSection({
  rows,
}: SalesAnalyticsRankSectionProps) {
  const [leftDimension, setLeftDimension] =
    useState<SalesRankDimension>("business_partner");
  const [rightDimension, setRightDimension] =
    useState<SalesRankDimension>("sale_category");

  const monthRange = useMemo(() => getCurrentMonthRange(), []);
  const monthLabel = formatMonthLabel(monthRange.start);

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

  return (
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
  );
}
