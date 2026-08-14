"use client";

import { useMemo } from "react";
import {
  formatManwonLabel,
  toManwon,
  type SalesPeriodBucket,
} from "@/lib/sales-analytics";

type SalesTrendChartProps = {
  buckets: SalesPeriodBucket[];
};

const CHART_HEIGHT = 150;
const BAR_WIDTH = 22;
const PADDING = { top: 20, right: 12, bottom: 32, left: 12 };

export default function SalesTrendChart({ buckets }: SalesTrendChartProps) {
  const layout = useMemo(() => {
    const count = Math.max(buckets.length, 1);
    const chartWidth = Math.max(640, count * 56);
    const innerWidth = chartWidth - PADDING.left - PADDING.right;
    const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const maxManwon = Math.max(
      1,
      ...buckets.flatMap((b) => [toManwon(b.sales), toManwon(b.margin)]),
    );

    const yTicks = 4;
    const tickStep = Math.ceil(maxManwon / yTicks);
    const yMax = tickStep * yTicks;

    const groupWidth = innerWidth / count;
    const barWidth = Math.min(BAR_WIDTH, groupWidth * 0.32);
    const barGap = 4;

    const bars = buckets.map((bucket, index) => {
      const centerX = PADDING.left + groupWidth * index + groupWidth / 2;
      const salesManwon = toManwon(bucket.sales);
      const marginManwon = toManwon(bucket.margin);
      const salesHeight = (salesManwon / yMax) * innerHeight;
      const marginHeight = (marginManwon / yMax) * innerHeight;
      const salesX = centerX - barWidth - barGap / 2;
      const marginX = centerX + barGap / 2;

      return {
        ...bucket,
        centerX,
        salesX,
        marginX,
        salesY: PADDING.top + innerHeight - salesHeight,
        marginY: PADDING.top + innerHeight - marginHeight,
        salesHeight,
        marginHeight,
      };
    });

    return {
      chartWidth,
      chartHeight: CHART_HEIGHT,
      barWidth,
      bars,
      innerBottom: PADDING.top + innerHeight,
    };
  }, [buckets]);

  if (buckets.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        선택한 기간에 매출 데이터가 없습니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${layout.chartWidth} ${layout.chartHeight}`}
        className="min-w-full"
        role="img"
        aria-label="매출·마진 추이 세로 막대 차트"
      >
        {layout.bars.map((bar) => (
          <g key={bar.key}>
            {bar.salesHeight > 0 ? (
              <>
                <rect
                  x={bar.salesX}
                  y={bar.salesY}
                  width={layout.barWidth}
                  height={bar.salesHeight}
                  rx={3}
                  className="fill-blue-500 dark:fill-blue-400"
                />
                <text
                  x={bar.salesX + layout.barWidth / 2}
                  y={bar.salesY - 4}
                  textAnchor="middle"
                  className="fill-blue-700 text-[9px] font-semibold dark:fill-blue-300"
                >
                  {formatManwonLabel(bar.sales)}
                </text>
              </>
            ) : null}

            {bar.marginHeight > 0 ? (
              <>
                <rect
                  x={bar.marginX}
                  y={bar.marginY}
                  width={layout.barWidth}
                  height={bar.marginHeight}
                  rx={3}
                  className="fill-emerald-500 dark:fill-emerald-400"
                />
                <text
                  x={bar.marginX + layout.barWidth / 2}
                  y={bar.marginY - 4}
                  textAnchor="middle"
                  className="fill-emerald-700 text-[9px] font-semibold dark:fill-emerald-300"
                >
                  {formatManwonLabel(bar.margin)}
                </text>
              </>
            ) : null}

            <text
              x={bar.centerX}
              y={layout.innerBottom + 12}
              textAnchor="middle"
              className="fill-zinc-600 text-[6px] dark:fill-zinc-400"
            >
              {bar.label}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-500 dark:bg-blue-400" />
          매출
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500 dark:bg-emerald-400" />
          마진
        </span>
        <span className="text-zinc-400 dark:text-zinc-500">금액 단위: 만원</span>
      </div>
    </div>
  );
}
