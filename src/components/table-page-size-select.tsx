"use client";

import {
  TABLE_PAGE_SIZE_OPTIONS,
  type TablePageSize,
} from "@/lib/table-page-size";

const pageSizeSelectClass =
  "h-[26px] rounded border border-zinc-300 bg-white px-2 text-[12px] text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200";

type TablePageSizeSelectProps<T extends number = TablePageSize> = {
  value: T;
  onChange: (value: T) => void;
  /** 미지정 시 공통 표(table-page-size) 옵션 사용 */
  options?: readonly T[];
  disabled?: boolean;
  compact?: boolean;
};

export default function TablePageSizeSelect<T extends number = TablePageSize>({
  value,
  onChange,
  options,
  disabled = false,
  compact = false,
}: TablePageSizeSelectProps<T>) {
  const sizeOptions = (options ?? TABLE_PAGE_SIZE_OPTIONS) as readonly T[];
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
        onChange={(event) => onChange(Number(event.target.value) as T)}
        className={compact ? pageSizeSelectClass : `${pageSizeSelectClass} h-8 text-sm`}
        aria-label="페이지당 표시 개수"
      >
        {sizeOptions.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </label>
  );
}
