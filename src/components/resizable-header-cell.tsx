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
  reorderable?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onColumnDragStart?: (columnId: ProductTableColumnId) => void;
  onColumnDragEnd?: () => void;
  onColumnDragOver?: (columnId: ProductTableColumnId) => void;
  onColumnDrop?: (columnId: ProductTableColumnId) => void;
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
  reorderable = false,
  isDragging = false,
  isDragOver = false,
  onColumnDragStart,
  onColumnDragEnd,
  onColumnDragOver,
  onColumnDrop,
}: ResizableHeaderCellProps) {
  const dragStateClass = isDragging
    ? "opacity-50"
    : isDragOver
      ? "bg-blue-50 dark:bg-blue-950/40"
      : "";

  function handleDragStart(event: React.DragEvent<HTMLElement>) {
    if (!reorderable) return;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", columnId);
    onColumnDragStart?.(columnId);
  }

  function handleDragOver(event: React.DragEvent<HTMLTableCellElement>) {
    if (!reorderable || !onColumnDragOver) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    onColumnDragOver(columnId);
  }

  function handleDrop(event: React.DragEvent<HTMLTableCellElement>) {
    if (!reorderable || !onColumnDrop) return;
    event.preventDefault();
    onColumnDrop(columnId);
  }

  const labelContent =
    children ??
    (sortable ? (
      <button
        type="button"
        draggable={reorderable}
        onDragStart={handleDragStart}
        onDragEnd={() => onColumnDragEnd?.()}
        onClick={onSortClick}
        className={`flex min-w-0 items-center truncate rounded px-0.5 text-left hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:text-blue-300 ${
          reorderable ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        title={
          sortDirection === "desc"
            ? "내림차순 (클릭: 올림차순)"
            : sortDirection === "asc"
              ? "올림차순 (클릭: 등록순)"
              : reorderable
                ? "드래그: 열 이동 · 클릭: 내림차순"
                : "등록순 (클릭: 내림차순)"
        }
      >
        <span className="truncate">{label}</span>
        {sortDirection ? <SortIndicator direction={sortDirection} /> : null}
      </button>
    ) : (
      <span
        draggable={reorderable}
        onDragStart={handleDragStart}
        onDragEnd={() => onColumnDragEnd?.()}
        className={`truncate ${reorderable ? "cursor-grab active:cursor-grabbing" : ""}`}
        title={reorderable ? "드래그하여 열 이동" : undefined}
      >
        {label}
      </span>
    ));

  return (
    <th
      className={`relative select-none align-middle ${dragStateClass} ${className}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-center pr-2">{labelContent}</div>

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
