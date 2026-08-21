"use client";

import type {
  CategoryShareEntry,
  QuoteConversionInsights,
  SalesComparisonInsights,
} from "@/lib/dashboard-insights";
import { formatManwonLabel } from "@/lib/sales-analytics";
import { formatKRW } from "@/lib/sales-calculator";

type DashboardInsightsPanelProps = {
  comparison: SalesComparisonInsights;
  quoteConversion?: QuoteConversionInsights | null;
  categoryShare: {
    monthLabel: string;
    entries: CategoryShareEntry[];
    totalSales: number;
  };
  layout?: "grid" | "stack";
};

const cardClass =
  "rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

function ChangeBadge({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  if (value === null) {
    return (
      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        <span className="font-medium text-zinc-600 dark:text-zinc-300">
          {label}
        </span>
        <span className="ml-1.5">비교 데이터 없음</span>
      </div>
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
    <div className={`text-xs ${colorClass}`}>
      <span className="font-medium text-zinc-600 dark:text-zinc-300">
        {label}
      </span>
      <span className="ml-1.5 font-semibold tabular-nums">
        {isUp ? "▲" : isDown ? "▼" : "—"}{" "}
        {value > 0 ? "+" : ""}
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

function ComparisonCard({ data }: { data: SalesComparisonInsights }) {
  return (
    <section className={cardClass}>
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        전월 대비 · 전년 동월
      </h3>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        {data.monthLabel} 월초~오늘 누적 (동일 일수 기준)
      </p>

      <div className="mt-4 space-y-4">
        {[data.sales, data.margin].map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-800/40"
          >
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {metric.label}
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
              {formatKRW(metric.current)}
              <span className="ml-1 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                원
              </span>
            </p>
            <div className="mt-2 space-y-1">
              <ChangeBadge
                label="전월"
                value={metric.changeVsPreviousMonth}
              />
              <ChangeBadge
                label="전년 동월"
                value={metric.changeVsSameMonthLastYear}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuoteConversionCard({ data }: { data: QuoteConversionInsights }) {
  return (
    <section className={cardClass}>
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        견적 → 매출 전환
      </h3>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        {data.monthLabel} 작성 견적 기준
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 text-center dark:border-zinc-800 dark:bg-zinc-800/40">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">견적</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
            {data.quoteCount}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 text-center dark:border-zinc-800 dark:bg-zinc-800/40">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">전환</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-blue-700 dark:text-blue-300">
            {data.convertedCount}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 text-center dark:border-zinc-800 dark:bg-zinc-800/40">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">전환율</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
            {data.conversionRate === null
              ? "—"
              : `${data.conversionRate.toFixed(1)}%`}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        이번 달 작성된 견적 중 매출로 전환된 건수와 비율입니다.
      </p>
    </section>
  );
}

const CATEGORY_COLORS = [
  "bg-blue-500 dark:bg-blue-400",
  "bg-violet-500 dark:bg-violet-400",
  "bg-emerald-500 dark:bg-emerald-400",
  "bg-amber-500 dark:bg-amber-400",
  "bg-rose-500 dark:bg-rose-400",
  "bg-cyan-500 dark:bg-cyan-400",
  "bg-orange-500 dark:bg-orange-400",
  "bg-indigo-500 dark:bg-indigo-400",
];

function CategoryShareCard({
  monthLabel,
  entries,
  totalSales,
}: {
  monthLabel: string;
  entries: CategoryShareEntry[];
  totalSales: number;
}) {
  return (
    <section className={cardClass}>
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        구분별 비중
      </h3>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
        {monthLabel} 매출 구성
      </p>

      {entries.length === 0 || totalSales === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          이번 달 매출 데이터가 없습니다.
        </p>
      ) : (
        <div className="mt-4 space-y-2.5">
          {entries.map((entry, index) => (
            <div key={entry.key}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span
                  className="truncate font-medium text-zinc-800 dark:text-zinc-200"
                  title={entry.key}
                >
                  {entry.key}
                </span>
                <span className="shrink-0 tabular-nums text-zinc-600 dark:text-zinc-300">
                  {entry.sharePercent}%
                  <span className="ml-1 text-zinc-400 dark:text-zinc-500">
                    ({formatManwonLabel(entry.sales)}만)
                  </span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full ${
                    CATEGORY_COLORS[index % CATEGORY_COLORS.length]
                  }`}
                  style={{ width: `${Math.max(entry.sharePercent, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function DashboardInsightsPanel({
  comparison,
  quoteConversion,
  categoryShare,
  layout = "grid",
}: DashboardInsightsPanelProps) {
  const showQuote = quoteConversion != null;
  const columnCount = showQuote ? 3 : 2;

  return (
    <div
      className={
        layout === "stack"
          ? "flex flex-col gap-4"
          : `grid gap-4 ${
              columnCount === 3 ? "lg:grid-cols-3" : "md:grid-cols-2"
            }`
      }
    >
      <ComparisonCard data={comparison} />
      <CategoryShareCard
        monthLabel={categoryShare.monthLabel}
        entries={categoryShare.entries}
        totalSales={categoryShare.totalSales}
      />
      {showQuote ? <QuoteConversionCard data={quoteConversion} /> : null}
    </div>
  );
}
