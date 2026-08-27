"use client";

import {
  clampTableRowFontSize,
  MAX_TABLE_ROW_FONT_SIZE,
  MIN_TABLE_ROW_FONT_SIZE,
} from "@/lib/table-row-preferences";

export const fontControlBoxClass =
  "inline-flex h-[26px] shrink-0 items-center overflow-hidden rounded border border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900";

export const fontControlButtonClass =
  "inline-flex h-[26px] min-w-[26px] items-center justify-center px-1 text-[11px] leading-none text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-zinc-800";

type TableRowSizeControlProps = {
  value: number;
  onChange: (nextValue: number) => void;
};

export default function TableRowSizeControl({
  value,
  onChange,
}: TableRowSizeControlProps) {
  return (
    <div className={fontControlBoxClass} title="행 간격">
      <button
        type="button"
        aria-label="행 간격 줄이기"
        disabled={value <= MIN_TABLE_ROW_FONT_SIZE}
        onClick={() =>
          onChange(clampTableRowFontSize(value - 1))
        }
        className={`${fontControlButtonClass} border-r border-zinc-300 dark:border-zinc-600`}
      >
        -
      </button>
      <button
        type="button"
        aria-label="행 간격 키우기"
        disabled={value >= MAX_TABLE_ROW_FONT_SIZE}
        onClick={() =>
          onChange(clampTableRowFontSize(value + 1))
        }
        className={fontControlButtonClass}
      >
        +
      </button>
    </div>
  );
}
