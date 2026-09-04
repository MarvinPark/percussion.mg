"use client";

import {
  buildMonthButtonOptions,
  currentAccrualMonthValue,
  formatAccrualMonthLabel,
  formatMonthButtonLabel,
} from "@/lib/overhead-expenses";
import { formatKRW } from "@/lib/sales-calculator";
import type { OverheadGroupSummary } from "@/types/overhead";

const BAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-pink-500",
];

const monthButtonClass = (active: boolean) =>
  `shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-zinc-900 ${
    active
      ? "bg-blue-600 text-white dark:bg-blue-500"
      : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
  }`;

type OverheadGroupChartProps = {
  month: string;
  summaries: OverheadGroupSummary[];
  onMonthChange: (month: string) => void;
};

export default function OverheadGroupChart({
  month,
  summaries,
  onMonthChange,
}: OverheadGroupChartProps) {
  const currentMonth = currentAccrualMonthValue();
  const monthOptions = buildMonthButtonOptions(month, 6);
  const maxAmount = Math.max(...summaries.map((summary) => summary.total_amount), 1);
  const totalAmount = summaries.reduce(
    (sum, summary) => sum + summary.total_amount,
    0,
  );

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="relative z-10 bg-white dark:bg-zinc-900">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          판관비 구성
        </h3>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatAccrualMonthLabel(`${month}-01`)} · {formatKRW(totalAmount)}원
        </p>
        <div className="mt-2 flex max-w-full flex-wrap gap-1 overflow-hidden">
          <button
            type="button"
            onClick={() => onMonthChange(currentMonth)}
            className={monthButtonClass(month === currentMonth)}
          >
            이번달
          </button>
          {monthOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onMonthChange(option)}
              className={monthButtonClass(option === month)}
            >
              {formatMonthButtonLabel(option)}
            </button>
          ))}
        </div>
      </div>

      {summaries.length === 0 ? (
        <p className="mt-3 border-t border-zinc-100 pt-3 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          표시할 대분류가 없습니다.
        </p>
      ) : (
        <div className="mt-3 grid gap-2 border-t border-zinc-100 pt-3 sm:grid-cols-2 dark:border-zinc-800">
          {summaries.map((summary, index) => {
            const widthPercent = Math.max(
              (summary.total_amount / maxAmount) * 100,
              summary.total_amount > 0 ? 4 : 0,
            );
            const colorClass = BAR_COLORS[index % BAR_COLORS.length];
            const percentLabel =
              totalAmount > 0 && summary.total_amount > 0
                ? `${((summary.total_amount / totalAmount) * 100).toFixed(1)}%`
                : "0%";

            return (
              <div key={summary.group_name} className="min-w-0">
                <div className="mb-0.5 flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate font-medium text-zinc-700 dark:text-zinc-200">
                    {summary.group_name}
                  </span>
                  <span className="shrink-0 font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatKRW(summary.total_amount)}원
                    <span className="ml-1 font-normal text-zinc-400">
                      {percentLabel}
                    </span>
                  </span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                  aria-hidden
                >
                  <div
                    className={`h-full max-w-full rounded-full transition-[width] duration-300 ${colorClass}`}
                    style={{ width: `${widthPercent}%` }}
                    title={`${summary.group_name} ${formatKRW(summary.total_amount)}원`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
