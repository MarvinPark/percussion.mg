"use client";

import type { ProductTableColumnId } from "@/lib/product-table-columns";
import type { ProductSortDirection } from "@/lib/product-list-sort";

type ResizableHeaderCellProps = {
  columnId: ProductTableColumnId;
  label: string;
  resizable: boolean;
  className?: string;
  onResizeStart: (columnId: ProductTableColumnId, startX: number) => void;
  children?: React.ReactNode;
  sortable?: boolean;
  sortDirection?: ProductSortDirection | null;
  onSortClick?: () => void;
};

function SortIndicator({ direction }: { direction: ProductSortDirection }) {
  return (
    <span className="ml-0.5 text-[10px] leading-none text-blue-600 dark:text-blue-400">
      {direction === "desc" ? "▼" : "▲"}
    </span>
  );
}

export default function ResizableHeaderCell({
  columnId,
  label,
  resizable,
  className = "",
  onResizeStart,
  children,
  sortable = false,
  sortDirection = null,
  onSortClick,
}: ResizableHeaderCellProps) {
  return (
    <th className={`relative select-none align-middle ${className}`}>
      <div className="flex items-center pr-2">
        {children ??
          (sortable ? (
            <button
              type="button"
              onClick={onSortClick}
              className="flex min-w-0 items-center truncate rounded px-0.5 text-left hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:text-blue-300"
              title={
                sortDirection === "desc"
                  ? "내림차순 (클릭: 올림차순)"
                  : sortDirection === "asc"
                    ? "올림차순 (클릭: 등록순)"
                    : "등록순 (클릭: 내림차순)"
              }
            >
              <span className="truncate">{label}</span>
              {sortDirection ? <SortIndicator direction={sortDirection} /> : null}
            </button>
          ) : (
            <span className="truncate">{label}</span>
          ))}
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
