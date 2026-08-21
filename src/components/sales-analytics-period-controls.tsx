"use client";

import { useId } from "react";
import type { SalesPeriodGranularity } from "@/lib/sales-analytics";

const PERIOD_OPTIONS: { value: SalesPeriodGranularity; label: string }[] = [
  { value: "day", label: "일간" },
  { value: "week", label: "주간" },
  { value: "month", label: "월간" },
];

function periodToggleClass(active: boolean) {
  return [
    "shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold transition",
    active
      ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500"
      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
  ].join(" ");
}

function formatShortIsoDate(iso: string) {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${year.slice(-2)}.${month}.${day}`;
}

function CompactDateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  const inputId = useId();

  return (
    <label
      htmlFor={inputId}
      className="inline-flex shrink-0 items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400"
    >
      <span>{label}</span>
      <span className="relative inline-block">
        <span className="rounded-md border border-zinc-300 bg-white px-1.5 py-0.5 font-medium tabular-nums text-[11px] text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200">
          {formatShortIsoDate(value)}
        </span>
        <input
          id={inputId}
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </span>
    </label>
  );
}

type SalesAnalyticsPeriodControlsProps = {
  granularity: SalesPeriodGranularity;
  dateRange: { start: string; end: string };
  onGranularityChange: (value: SalesPeriodGranularity) => void;
  onDateRangeChange: (range: { start: string; end: string }) => void;
};

export default function SalesAnalyticsPeriodControls({
  granularity,
  dateRange,
  onGranularityChange,
  onDateRangeChange,
}: SalesAnalyticsPeriodControlsProps) {
  return (
    <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto text-xs">
      <CompactDateField
        label="시작"
        value={dateRange.start}
        max={dateRange.end}
        onChange={(start) => onDateRangeChange({ ...dateRange, start })}
      />
      <CompactDateField
        label="종료"
        value={dateRange.end}
        min={dateRange.start}
        onChange={(end) => onDateRangeChange({ ...dateRange, end })}
      />
      <div className="inline-flex shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 dark:border-zinc-700 dark:bg-zinc-800/80">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onGranularityChange(option.value)}
            className={periodToggleClass(granularity === option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export { PERIOD_OPTIONS };
