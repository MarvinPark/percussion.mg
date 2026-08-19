"use client";

import {
  TABLE_PAGE_SIZE_OPTIONS,
  type TablePageSize,
} from "@/lib/table-page-size";

const pageSizeSelectClass =
  "h-[26px] rounded border border-zinc-300 bg-white px-2 text-[12px] text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200";

type TablePageSizeSelectProps = {
  value: TablePageSize;
  onChange: (value: TablePageSize) => void;
  disabled?: boolean;
  compact?: boolean;
};

export default function TablePageSizeSelect({
  value,
  onChange,
  disabled = false,
  compact = false,
}: TablePageSizeSelectProps) {
  return (
    <label
      className={`flex items-center gap-1.5 ${
        compact
          ? "text-xs text-zinc-600 dark:text-zinc-400"
          : "text-sm text-zinc-600 dark:text-zinc-400"
      }`}
    >
      <span className="shrink-0">표시</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(Number(event.target.value) as TablePageSize)
        }
        className={compact ? pageSizeSelectClass : `${pageSizeSelectClass} h-8 text-sm`}
        aria-label="페이지당 표시 개수"
      >
        {TABLE_PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </label>
  );
}
