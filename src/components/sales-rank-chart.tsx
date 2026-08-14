"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  formatManwonLabel,
  toManwon,
  type SalesRankEntry,
} from "@/lib/sales-analytics";

type SalesRankChartProps = {
  title: string;
  entries: SalesRankEntry[];
  dimensionLabel: string;
  monthLabel: string;
  headerAction?: ReactNode;
};

const LABEL_WIDTH = 88;
const VALUE_WIDTH = 44;

export default function SalesRankChart({
  title,
  entries,
  dimensionLabel,
  monthLabel,
  headerAction,
}: SalesRankChartProps) {
  const layout = useMemo(() => {
    const maxManwon = Math.max(
      1,
      ...entries.flatMap((e) => [toManwon(e.sales), toManwon(e.margin)]),
    );

    return entries.map((entry, index) => {
      const salesManwon = toManwon(entry.sales);
      const marginManwon = toManwon(entry.margin);
      return {
        ...entry,
        rank: index + 1,
        salesPercent: (salesManwon / maxManwon) * 100,
        marginPercent: (marginManwon / maxManwon) * 100,
      };
    });
  }, [entries]);

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {monthLabel} · {dimensionLabel} 기준 Top 7
          </p>
        </div>
        {headerAction ? (
          <div className="ml-auto shrink-0">{headerAction}</div>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
          이번 달 해당 기준 매출이 없습니다.
        </p>
      ) : (
        <div className="space-y-3">
          {layout.map((row) => (
            <div key={row.key} className="grid grid-cols-[auto_1fr] gap-3">
              <div
                className="flex items-start gap-2 pt-1"
                style={{ width: LABEL_WIDTH }}
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {row.rank}
                </span>
                <span
                  className="line-clamp-2 text-xs font-medium leading-snug text-zinc-800 dark:text-zinc-200"
                  title={row.key}
                >
                  {row.key}
                </span>
              </div>

              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="relative h-4 flex-1 min-w-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded bg-blue-500 dark:bg-blue-400"
                      style={{
                        width: `${row.sales > 0 ? Math.max(row.salesPercent, 2) : 0}%`,
                      }}
                    />
                  </div>
                  <span
                    className="shrink-0 text-[11px] font-semibold tabular-nums text-blue-700 dark:text-blue-300"
                    style={{ width: VALUE_WIDTH }}
                  >
                    {formatManwonLabel(row.sales)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative h-4 flex-1 min-w-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded bg-emerald-500 dark:bg-emerald-400"
                      style={{
                        width: `${row.margin > 0 ? Math.max(row.marginPercent, 2) : 0}%`,
                      }}
                    />
                  </div>
                  <span
                    className="shrink-0 text-[11px] font-semibold tabular-nums text-emerald-700 dark:text-emerald-300"
                    style={{ width: VALUE_WIDTH }}
                  >
                    {formatManwonLabel(row.margin)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-3 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-4 rounded-sm bg-blue-500 dark:bg-blue-400" />
              매출
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-4 rounded-sm bg-emerald-500 dark:bg-emerald-400" />
              마진
            </span>
            <span>(만원)</span>
          </div>
        </div>
      )}
    </div>
  );
}
