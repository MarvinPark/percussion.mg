"use client";

import { useMemo } from "react";
import {
  formatManwonLabel,
  toManwon,
  type SalesPeriodGranularity,
  type SalesProductPeriodBucket,
} from "@/lib/sales-analytics";

type SalesProductTrendChartProps = {
  buckets: SalesProductPeriodBucket[];
  granularity?: SalesPeriodGranularity;
};

const CHART_HEIGHT = 260;
const SPARSE_MAX_BUCKETS = 8;
const PADDING = { top: 32, right: 14, bottom: 46, left: 14 };
const BAR_GAP = 3;
const GROUP_GAP = 10;

const AMOUNT_METRICS = [
  {
    key: "sales",
    getValue: (bucket: SalesProductPeriodBucket) => bucket.sales,
    fillClass: "fill-blue-500 dark:fill-blue-400",
    textClass: "fill-blue-700 font-semibold dark:fill-blue-300",
    legendClass: "bg-blue-500 dark:bg-blue-400",
    label: "매출",
    format: formatManwonLabel,
  },
  {
    key: "purchase",
    getValue: (bucket: SalesProductPeriodBucket) => bucket.purchase,
    fillClass: "fill-orange-500 dark:fill-orange-400",
    textClass: "fill-orange-700 font-semibold dark:fill-orange-300",
    legendClass: "bg-orange-500 dark:bg-orange-400",
    label: "매입",
    format: formatManwonLabel,
  },
  {
    key: "margin",
    getValue: (bucket: SalesProductPeriodBucket) => bucket.margin,
    fillClass: "fill-emerald-500 dark:fill-emerald-400",
    textClass: "fill-emerald-700 font-semibold dark:fill-emerald-300",
    legendClass: "bg-emerald-500 dark:bg-emerald-400",
    label: "마진",
    format: formatManwonLabel,
  },
] as const;

const QUANTITY_METRICS = [
  {
    key: "salesQuantity",
    getValue: (bucket: SalesProductPeriodBucket) => bucket.salesQuantity,
    fillClass: "fill-violet-500 dark:fill-violet-400",
    textClass: "fill-violet-700 font-semibold dark:fill-violet-300",
    legendClass: "bg-violet-500 dark:bg-violet-400",
    label: "매출수량",
    format: (value: number) => value.toLocaleString("ko-KR"),
  },
  {
    key: "purchaseQuantity",
    getValue: (bucket: SalesProductPeriodBucket) => bucket.purchaseQuantity,
    fillClass: "fill-rose-500 dark:fill-rose-400",
    textClass: "fill-rose-700 font-semibold dark:fill-rose-300",
    legendClass: "bg-rose-500 dark:bg-rose-400",
    label: "매입수량",
    format: (value: number) => value.toLocaleString("ko-KR"),
  },
] as const;

function getSparseBarWidth(bucketCount: number) {
  if (bucketCount <= 1) return 32;
  if (bucketCount <= 2) return 28;
  if (bucketCount <= 4) return 24;
  return 20;
}

function getSparseChartWidth(bucketCount: number) {
  const barCount = AMOUNT_METRICS.length + QUANTITY_METRICS.length;
  const barWidth = getSparseBarWidth(bucketCount);
  const groupContentWidth =
    barWidth * barCount + BAR_GAP * (barCount - 1) + GROUP_GAP + 32;
  const groupSpacing = bucketCount > 1 ? (bucketCount - 1) * 20 : 0;

  return (
    PADDING.left +
    PADDING.right +
    bucketCount * groupContentWidth +
    groupSpacing
  );
}

function getGroupWidth(granularity: SalesPeriodGranularity | undefined): number {
  if (granularity === "day") return 96;
  return 88;
}

function bucketHasData(bucket: SalesProductPeriodBucket): boolean {
  return (
    bucket.sales > 0 ||
    bucket.purchase > 0 ||
    bucket.margin > 0 ||
    bucket.salesQuantity > 0 ||
    bucket.purchaseQuantity > 0
  );
}

function trimEmptyEdgeBuckets(
  buckets: SalesProductPeriodBucket[],
): SalesProductPeriodBucket[] {
  if (buckets.length === 0) return buckets;

  let start = 0;
  let end = buckets.length - 1;

  while (start < end && !bucketHasData(buckets[start]!)) start += 1;
  while (end > start && !bucketHasData(buckets[end]!)) end -= 1;

  return buckets.slice(start, end + 1);
}

export default function SalesProductTrendChart({
  buckets,
  granularity,
}: SalesProductTrendChartProps) {
  const isDaily = granularity === "day";
  const xAxisFontSize = isDaily ? 15 : 14;
  const barLabelFontSize = isDaily ? 14 : 13;

  const displayBuckets = useMemo(
    () => trimEmptyEdgeBuckets(buckets),
    [buckets],
  );

  const layout = useMemo(() => {
    const count = Math.max(displayBuckets.length, 1);
    const groupUnit = getGroupWidth(granularity);
    const isSparse = count <= SPARSE_MAX_BUCKETS;
    const chartWidth = isSparse
      ? getSparseChartWidth(count)
      : Math.max(640, count * groupUnit);
    const innerWidth = chartWidth - PADDING.left - PADDING.right;
    const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const maxManwon = Math.max(
      1,
      ...displayBuckets.flatMap((bucket) =>
        AMOUNT_METRICS.map((metric) => toManwon(metric.getValue(bucket))),
      ),
    );
    const maxQuantity = Math.max(
      1,
      ...displayBuckets.flatMap((bucket) =>
        QUANTITY_METRICS.map((metric) => metric.getValue(bucket)),
      ),
    );

    const yTicks = 4;
    const amountYMax = Math.ceil(maxManwon / yTicks) * yTicks;
    const quantityYMax = Math.ceil(maxQuantity / yTicks) * yTicks;

    const groupWidth = innerWidth / count;
    const barCount = AMOUNT_METRICS.length + QUANTITY_METRICS.length;
    const totalGaps = BAR_GAP * (barCount - 1) + GROUP_GAP;
    const availableWidth = groupWidth * 0.98;
    const maxBarWidth = isSparse ? getSparseBarWidth(count) : 14;
    const barWidth = Math.min(
      maxBarWidth,
      (availableWidth - totalGaps) / barCount,
    );
    const groupBarWidth =
      barWidth * barCount + BAR_GAP * (barCount - 1) + GROUP_GAP;

    const bars = displayBuckets.map((bucket, index) => {
      const centerX = PADDING.left + groupWidth * index + groupWidth / 2;
      const groupStartX = centerX - groupBarWidth / 2;

      const amountMetrics = AMOUNT_METRICS.map((metric, metricIndex) => {
        const amount = metric.getValue(bucket);
        const manwon = toManwon(amount);
        const height = (manwon / amountYMax) * innerHeight;
        const x = groupStartX + metricIndex * (barWidth + BAR_GAP);

        return {
          key: metric.key,
          amount,
          x,
          y: PADDING.top + innerHeight - height,
          height,
          fillClass: metric.fillClass,
          textClass: metric.textClass,
          format: metric.format,
        };
      });

      const quantityStartX =
        groupStartX +
        AMOUNT_METRICS.length * (barWidth + BAR_GAP) +
        GROUP_GAP;
      const quantityMetrics = QUANTITY_METRICS.map((metric, metricIndex) => {
        const amount = metric.getValue(bucket);
        const height = (amount / quantityYMax) * innerHeight;
        const x = quantityStartX + metricIndex * (barWidth + BAR_GAP);

        return {
          key: metric.key,
          amount,
          x,
          y: PADDING.top + innerHeight - height,
          height,
          fillClass: metric.fillClass,
          textClass: metric.textClass,
          format: metric.format,
        };
      });

      return {
        ...bucket,
        centerX,
        amountMetrics,
        quantityMetrics,
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
        선택한 기간에 판매 데이터가 없습니다.
      </p>
    );
  }

  return (
    <div className="w-full">
      <div
        className={
          layout.isSparse
            ? "w-full"
            : "overflow-x-auto"
        }
        style={
          layout.isSparse
            ? { aspectRatio: `${layout.chartWidth} / ${layout.chartHeight}` }
            : undefined
        }
      >
        <svg
          width={layout.isSparse ? "100%" : layout.chartWidth}
          height={layout.isSparse ? "100%" : layout.chartHeight}
          viewBox={`0 0 ${layout.chartWidth} ${layout.chartHeight}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="제품별 매출·매입·마진·수량 추이 세로 막대 차트"
          className={layout.isSparse ? "block h-full w-full" : undefined}
        >
          {layout.bars.map((bar) => (
            <g key={bar.key}>
              {[...bar.amountMetrics, ...bar.quantityMetrics].map((metric) =>
                metric.height > 0 ? (
                  <g key={`${bar.key}-${metric.key}`}>
                    <rect
                      x={metric.x}
                      y={metric.y}
                      width={layout.barWidth}
                      height={metric.height}
                      rx={4}
                      className={metric.fillClass}
                    />
                    <text
                      x={metric.x + layout.barWidth / 2}
                      y={metric.y - 6}
                      textAnchor="middle"
                      fontSize={barLabelFontSize}
                      className={metric.textClass}
                    >
                      {metric.format(metric.amount)}
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
      </div>

      <div className="mt-2 space-y-1.5">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
          <span className="font-medium text-zinc-500 dark:text-zinc-500">
            금액(만원)
          </span>
          {AMOUNT_METRICS.map((metric) => (
            <span key={metric.key} className="inline-flex items-center gap-1.5">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-sm ${metric.legendClass}`}
              />
              {metric.label}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
          <span className="font-medium text-zinc-500 dark:text-zinc-500">
            수량(개)
          </span>
          {QUANTITY_METRICS.map((metric) => (
            <span key={metric.key} className="inline-flex items-center gap-1.5">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-sm ${metric.legendClass}`}
              />
              {metric.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
