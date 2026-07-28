"use client";

import type { ProductTableColumnId } from "@/lib/product-table-columns";

type ResizableHeaderCellProps = {
  columnId: ProductTableColumnId;
  label: string;
  resizable: boolean;
  className?: string;
  onResizeStart: (columnId: ProductTableColumnId, startX: number) => void;
  children?: React.ReactNode;
};

export default function ResizableHeaderCell({
  columnId,
  label,
  resizable,
  className = "",
  onResizeStart,
  children,
}: ResizableHeaderCellProps) {
  return (
    <th className={`relative select-none ${className}`}>
      <div className="flex items-center pr-2">
        {children ?? (
          <span className="truncate">{label}</span>
        )}
      </div>

      {resizable ? (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`${label} 열 너비 조절`}
          className="group absolute right-0 top-0 z-10 flex h-full w-3 cursor-col-resize items-stretch justify-center"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onResizeStart(columnId, event.clientX);
          }}
        >
          <div className="my-1.5 w-px bg-zinc-300 transition group-hover:w-0.5 group-hover:bg-blue-400 dark:bg-zinc-500 dark:group-hover:bg-blue-400" />
        </div>
      ) : null}
    </th>
  );
}
