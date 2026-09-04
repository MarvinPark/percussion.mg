"use client";

import { formatAccrualMonthLabel } from "@/lib/overhead-expenses";
import type { OverheadMetricComparison } from "@/lib/overhead-profit-insights";
import {
  formatKRW,
  marginAmountClass,
} from "@/lib/sales-calculator";

type OverheadProfitSummaryProps = {
  month: string;
  totalSales: number;
  totalProfit: number;
  overheadTotal: number;
  salesCount: number;
  salesComparison: OverheadMetricComparison;
  salesCountComparison: OverheadMetricComparison;
  operatingProfitComparison: OverheadMetricComparison;
};

function formatRate(value: number, base: number) {
  if (base <= 0) return "-";
  return `${((value / base) * 100).toFixed(1)}%`;
}

function ChangeBadge({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  if (value === null) {
    return (
      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
        {label} -
      </span>
    );
  }

  const isUp = value > 0;
  const isDown = value < 0;
  const colorClass = isUp
    ? "text-emerald-700 dark:text-emerald-300"
    : isDown
      ? "text-red-600 dark:text-red-400"
      : "text-zinc-500 dark:text-zinc-400";

  return (
    <span className={`text-[10px] font-semibold tabular-nums ${colorClass}`}>
      {label} {isUp ? "▲" : isDown ? "▼" : "—"}{" "}
      {value > 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

function ComparisonLine({ comparison }: { comparison: OverheadMetricComparison }) {
  return (
    <div className="mt-0.5 flex flex-wrap justify-end gap-x-2 gap-y-0.5">
      <ChangeBadge
        label="전월"
        value={comparison.changeVsPreviousMonth}
      />
      <ChangeBadge
        label="전년"
        value={comparison.changeVsSameMonthLastYear}
      />
    </div>
  );
}

function SummaryRow({
  label,
  amount,
  emphasize = false,
  rate,
  comparison,
}: {
  label: string;
  amount: number;
  emphasize?: boolean;
  rate?: string;
  comparison?: OverheadMetricComparison;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-2 ${
        emphasize ? "border-t border-zinc-200 pt-2 dark:border-zinc-700" : ""
      }`}
    >
      <span
        className={`min-w-0 truncate ${
          emphasize
            ? "text-xs font-bold text-zinc-800 dark:text-zinc-100"
            : "text-[11px] font-medium text-zinc-500 dark:text-zinc-400"
        }`}
      >
        {label}
      </span>
      <div className="min-w-0 text-right">
        <p
          className={`whitespace-nowrap ${
            emphasize
              ? `text-base font-bold ${marginAmountClass(amount)}`
              : "text-xs font-semibold text-zinc-900 dark:text-zinc-100"
          }`}
        >
          {formatKRW(amount)}원
        </p>
        {rate ? (
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{rate}</p>
        ) : null}
        {comparison ? <ComparisonLine comparison={comparison} /> : null}
      </div>
    </div>
  );
}

function CountRow({
  label,
  count,
  comparison,
}: {
  label: string;
  count: number;
  comparison: OverheadMetricComparison;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="shrink-0 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <div className="min-w-0 text-right">
        <p className="whitespace-nowrap text-xs font-semibold text-zinc-900 dark:text-zinc-100">
          {formatKRW(count)}건
        </p>
        <ComparisonLine comparison={comparison} />
      </div>
    </div>
  );
}

export default function OverheadProfitSummary({
  month,
  totalSales,
  totalProfit,
  overheadTotal,
  salesCount,
  salesComparison,
  salesCountComparison,
  operatingProfitComparison,
}: OverheadProfitSummaryProps) {
  const operatingProfit = totalProfit - overheadTotal;

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
        영업이익
      </h3>
      <p className="mb-3 text-[11px] text-zinc-500 dark:text-zinc-400">
        {formatAccrualMonthLabel(`${month}-01`)} 결산
      </p>

      <div className="space-y-2">
        <SummaryRow
          label="총매출"
          amount={totalSales}
          comparison={salesComparison}
        />
        <CountRow
          label="매출 건수"
          count={salesCount}
          comparison={salesCountComparison}
        />
        <SummaryRow
          label="총이익"
          amount={totalProfit}
          rate={`마진율 ${formatRate(totalProfit, totalSales)}`}
        />
        <SummaryRow
          label="판관비"
          amount={overheadTotal}
          rate={`판관비율 ${formatRate(overheadTotal, totalSales)}`}
        />
        <SummaryRow
          label="영업이익"
          amount={operatingProfit}
          emphasize
          rate={`영업이익률 ${formatRate(operatingProfit, totalSales)}`}
          comparison={operatingProfitComparison}
        />
      </div>
    </section>
  );
}
