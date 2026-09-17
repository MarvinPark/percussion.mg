"use client";

type SortDirection = "asc" | "desc";

type DraggableTableHeaderCellProps<T extends string> = {
  columnId: T;
  label: string;
  className?: string;
  align?: "left" | "center" | "right";
  reorderable?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onColumnDragStart?: (columnId: T) => void;
  onColumnDragEnd?: () => void;
  onColumnDragOver?: (columnId: T) => void;
  onColumnDrop?: (columnId: T) => void;
  resizable?: boolean;
  resizeHandleVariant?: "default" | "light-divider";
  tone?: "default" | "dark";
  onResizeStart?: (columnId: T, startX: number) => void;
  sortable?: boolean;
  sortDirection?: SortDirection | null;
  onSortClick?: () => void;
  children?: React.ReactNode;
};

function SortIndicator({ direction }: { direction: SortDirection }) {
  return (
    <span className="ml-0.5 text-[10px] leading-none text-blue-600 dark:text-blue-400">
      {direction === "desc" ? "▼" : "▲"}
    </span>
  );
}

const resizeHandleOuterDefaultClass =
  "group absolute right-0 top-0 z-10 flex h-full w-3 cursor-col-resize items-stretch justify-center";

const resizeHandleOuterLightDividerClass =
  "group absolute inset-y-0 right-0 z-10 w-3 cursor-col-resize";

const resizeHandleInnerDefaultClass =
  "my-1.5 w-px bg-zinc-300 transition group-hover:w-0.5 group-hover:bg-blue-400 dark:bg-zinc-500 dark:group-hover:bg-blue-400";

const resizeHandleInnerLightDividerClass =
  "absolute right-0 top-[15%] h-[70%] w-px bg-white/85 transition-[width,background-color] group-hover:w-0.5 group-hover:bg-white dark:bg-white/30 dark:group-hover:bg-white/85";

export default function DraggableTableHeaderCell<T extends string>({
  columnId,
  label,
  className = "",
  align = "left",
  reorderable = false,
  isDragging = false,
  isDragOver = false,
  onColumnDragStart,
  onColumnDragEnd,
  onColumnDragOver,
  onColumnDrop,
  resizable = false,
  resizeHandleVariant = "default",
  tone = "default",
  onResizeStart,
  sortable = false,
  sortDirection = null,
  onSortClick,
  children,
}: DraggableTableHeaderCellProps<T>) {
  const dragStateClass = isDragging
    ? "opacity-50"
    : isDragOver
      ? tone === "dark"
        ? "bg-zinc-700"
        : "bg-blue-50 dark:bg-blue-950/40"
      : "";

  const alignClass =
    align === "center"
      ? "text-center"
      : align === "right"
        ? "text-right"
        : "text-left";

  const flexJustifyClass =
    align === "center"
      ? "justify-center"
      : align === "right"
        ? "justify-end"
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
        className={`inline-block truncate ${
          reorderable ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        title={reorderable ? "드래그하여 열 이동" : undefined}
      >
        {label}
      </span>
    ));

  return (
    <th
      className={`relative select-none align-middle ${alignClass} ${dragStateClass} ${className}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={`flex items-center pr-2 ${flexJustifyClass}`}>
        {labelContent}
      </div>

      {resizable ? (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={`${label} 열 너비 조절`}
          className={
            resizeHandleVariant === "light-divider"
              ? resizeHandleOuterLightDividerClass
              : resizeHandleOuterDefaultClass
          }
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onResizeStart?.(columnId, event.clientX);
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <div
            className={
              resizeHandleVariant === "light-divider"
                ? resizeHandleInnerLightDividerClass
                : resizeHandleInnerDefaultClass
            }
          />
        </div>
      ) : null}
    </th>
  );
}
