"use client";

import { useMemo } from "react";
import {
  formatManwonLabel,
  toManwon,
  type SalesPeriodBucket,
  type SalesPeriodGranularity,
} from "@/lib/sales-analytics";

type SalesTrendChartProps = {
  buckets: SalesPeriodBucket[];
  granularity?: SalesPeriodGranularity;
};

const CHART_HEIGHT = 180;
const BAR_WIDTH = 22;
const SPARSE_BAR_WIDTH = 48;
const SPARSE_MAX_BUCKETS = 8;
const PADDING = { top: 24, right: 12, bottom: 40, left: 12 };

function getGroupWidth(granularity: SalesPeriodGranularity | undefined): number {
  if (granularity === "day") return 64;
  return 56;
}

function bucketHasData(bucket: SalesPeriodBucket): boolean {
  return bucket.sales > 0 || bucket.margin > 0;
}

/** Drop leading/trailing empty periods so sparse data fills the chart width. */
function trimEmptyEdgeBuckets(
  buckets: SalesPeriodBucket[],
): SalesPeriodBucket[] {
  if (buckets.length === 0) return buckets;

  let start = 0;
  let end = buckets.length - 1;

  while (
    start < end &&
    !bucketHasData(buckets[start]!)
  ) {
    start += 1;
  }
  while (
    end > start &&
    !bucketHasData(buckets[end]!)
  ) {
    end -= 1;
  }

  return buckets.slice(start, end + 1);
}

export default function SalesTrendChart({
  buckets,
  granularity,
}: SalesTrendChartProps) {
  const isDaily = granularity === "day";
  const xAxisFontSize = isDaily ? 12 : 11;
  const barLabelFontSize = isDaily ? 12 : 11;

  const displayBuckets = useMemo(
    () => trimEmptyEdgeBuckets(buckets),
    [buckets],
  );

  const layout = useMemo(() => {
    const count = Math.max(displayBuckets.length, 1);
    const groupUnit = getGroupWidth(granularity);
    const isSparse = count <= SPARSE_MAX_BUCKETS;
    const chartWidth = isSparse
      ? 640
      : Math.max(640, count * groupUnit);
    const innerWidth = chartWidth - PADDING.left - PADDING.right;
    const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const maxManwon = Math.max(
      1,
      ...displayBuckets.flatMap((b) => [toManwon(b.sales), toManwon(b.margin)]),
    );

    const yTicks = 4;
    const tickStep = Math.ceil(maxManwon / yTicks);
    const yMax = tickStep * yTicks;

    const groupWidth = innerWidth / count;
    const maxBarWidth = isSparse ? SPARSE_BAR_WIDTH : BAR_WIDTH;
    const barWidth = Math.min(maxBarWidth, groupWidth * 0.36);
    const barGap = 4;

    const bars = displayBuckets.map((bucket, index) => {
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
      isSparse,
    };
  }, [displayBuckets, granularity]);

  if (!buckets.some(bucketHasData)) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        선택한 기간에 매출 데이터가 없습니다.
      </p>
    );
  }

  return (
    <div className={layout.isSparse ? undefined : "overflow-x-auto"}>
      <svg
        width={layout.isSparse ? "100%" : layout.chartWidth}
        height={layout.chartHeight}
        viewBox={`0 0 ${layout.chartWidth} ${layout.chartHeight}`}
        preserveAspectRatio={layout.isSparse ? "xMidYMid meet" : undefined}
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
                  y={bar.salesY - 6}
                  textAnchor="middle"
                  fontSize={barLabelFontSize}
                  className="fill-blue-700 font-semibold dark:fill-blue-300"
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
                  y={bar.marginY - 6}
                  textAnchor="middle"
                  fontSize={barLabelFontSize}
                  className="fill-emerald-700 font-semibold dark:fill-emerald-300"
                >
                  {formatManwonLabel(bar.margin)}
                </text>
              </>
            ) : null}

            <text
              x={bar.centerX}
              y={layout.innerBottom + 16}
              textAnchor="middle"
              fontSize={xAxisFontSize}
              className="fill-zinc-600 dark:fill-zinc-400"
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
