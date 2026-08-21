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

const CHART_HEIGHT = 260;
const SPARSE_MAX_BUCKETS = 8;
const PADDING = { top: 32, right: 12, bottom: 48, left: 12 };
const BAR_COUNT = 3;
const BAR_GAP = 3;

const METRIC_BARS = [
  {
    key: "sales",
    getValue: (bucket: SalesPeriodBucket) => bucket.sales,
    fillClass: "fill-blue-500 dark:fill-blue-400",
    textClass: "fill-blue-700 font-semibold dark:fill-blue-300",
    legendClass: "bg-blue-500 dark:bg-blue-400",
    label: "매출",
  },
  {
    key: "purchase",
    getValue: (bucket: SalesPeriodBucket) => bucket.purchase,
    fillClass: "fill-orange-500 dark:fill-orange-400",
    textClass: "fill-orange-700 font-semibold dark:fill-orange-300",
    legendClass: "bg-orange-500 dark:bg-orange-400",
    label: "매입",
  },
  {
    key: "margin",
    getValue: (bucket: SalesPeriodBucket) => bucket.margin,
    fillClass: "fill-emerald-500 dark:fill-emerald-400",
    textClass: "fill-emerald-700 font-semibold dark:fill-emerald-300",
    legendClass: "bg-emerald-500 dark:bg-emerald-400",
    label: "마진",
  },
] as const;

function getGroupWidth(granularity: SalesPeriodGranularity | undefined): number {
  if (granularity === "day") return 76;
  return 68;
}

function bucketHasData(bucket: SalesPeriodBucket): boolean {
  return bucket.sales > 0 || bucket.purchase > 0 || bucket.margin > 0;
}

/** Drop leading/trailing empty periods so sparse data fills the chart width. */
function trimEmptyEdgeBuckets(
  buckets: SalesPeriodBucket[],
): SalesPeriodBucket[] {
  if (buckets.length === 0) return buckets;

  let start = 0;
  let end = buckets.length - 1;

  while (start < end && !bucketHasData(buckets[start]!)) {
    start += 1;
  }
  while (end > start && !bucketHasData(buckets[end]!)) {
    end -= 1;
  }

  return buckets.slice(start, end + 1);
}

export default function SalesTrendChart({
  buckets,
  granularity,
}: SalesTrendChartProps) {
  const isDaily = granularity === "day";
  const xAxisFontSize = isDaily ? 14 : 13;
  const barLabelFontSize = isDaily ? 13 : 12;

  const displayBuckets = useMemo(
    () => trimEmptyEdgeBuckets(buckets),
    [buckets],
  );

  const layout = useMemo(() => {
    const count = Math.max(displayBuckets.length, 1);
    const groupUnit = getGroupWidth(granularity);
    const isSparse = count <= SPARSE_MAX_BUCKETS;
    const chartWidth = isSparse ? 640 : Math.max(640, count * groupUnit);
    const innerWidth = chartWidth - PADDING.left - PADDING.right;
    const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const maxManwon = Math.max(
      1,
      ...displayBuckets.flatMap((bucket) =>
        METRIC_BARS.map((metric) => toManwon(metric.getValue(bucket))),
      ),
    );

    const yTicks = 4;
    const tickStep = Math.ceil(maxManwon / yTicks);
    const yMax = tickStep * yTicks;

    const groupWidth = innerWidth / count;
    const totalGaps = BAR_GAP * (BAR_COUNT - 1);
    const availableWidth = groupWidth * 0.9;
    const barWidth = Math.min(
      isSparse ? 28 : 18,
      (availableWidth - totalGaps) / BAR_COUNT,
    );
    const groupBarWidth = barWidth * BAR_COUNT + totalGaps;

    const bars = displayBuckets.map((bucket, index) => {
      const centerX = PADDING.left + groupWidth * index + groupWidth / 2;
      const groupStartX = centerX - groupBarWidth / 2;

      const metrics = METRIC_BARS.map((metric, metricIndex) => {
        const amount = metric.getValue(bucket);
        const manwon = toManwon(amount);
        const height = (manwon / yMax) * innerHeight;
        const x = groupStartX + metricIndex * (barWidth + BAR_GAP);

        return {
          key: metric.key,
          amount,
          x,
          y: PADDING.top + innerHeight - height,
          height,
          fillClass: metric.fillClass,
          textClass: metric.textClass,
        };
      });

      return {
        ...bucket,
        centerX,
        metrics,
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
        aria-label="매출·매입·마진 추이 세로 막대 차트"
      >
        {layout.bars.map((bar) => (
          <g key={bar.key}>
            {bar.metrics.map((metric) =>
              metric.height > 0 ? (
                <g key={`${bar.key}-${metric.key}`}>
                  <rect
                    x={metric.x}
                    y={metric.y}
                    width={layout.barWidth}
                    height={metric.height}
                    rx={3}
                    className={metric.fillClass}
                  />
                  <text
                    x={metric.x + layout.barWidth / 2}
                    y={metric.y - 6}
                    textAnchor="middle"
                    fontSize={barLabelFontSize}
                    className={metric.textClass}
                  >
                    {formatManwonLabel(metric.amount)}
                  </text>
                </g>
              ) : null,
            )}

            <text
              x={bar.centerX}
              y={layout.innerBottom + 20}
              textAnchor="middle"
              fontSize={xAxisFontSize}
              className="fill-zinc-700 font-medium dark:fill-zinc-300"
            >
              {bar.label}
            </text>
          </g>
        ))}
      </svg>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
        {METRIC_BARS.map((metric) => (
          <span key={metric.key} className="inline-flex items-center gap-1.5">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-sm ${metric.legendClass}`}
            />
            {metric.label}
          </span>
        ))}
        <span className="text-zinc-400 dark:text-zinc-500">금액 단위: 만원</span>
      </div>
    </div>
  );
}
