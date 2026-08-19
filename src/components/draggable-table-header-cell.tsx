"use client";

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
  onResizeStart?: (columnId: T, startX: number) => void;
  children?: React.ReactNode;
};

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
  onResizeStart,
  children,
}: DraggableTableHeaderCellProps<T>) {
  const dragStateClass = isDragging
    ? "opacity-50"
    : isDragOver
      ? "bg-blue-50 dark:bg-blue-950/40"
      : "";

  const alignClass =
    align === "center"
      ? "text-center"
      : align === "right"
        ? "text-right"
        : "text-left";

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

  return (
    <th
      className={`relative select-none align-middle ${alignClass} ${dragStateClass} ${className}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-center pr-2">
        {children ?? (
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
            onResizeStart?.(columnId, event.clientX);
          }}
        >
          <div className="my-1.5 w-px bg-zinc-300 transition group-hover:w-0.5 group-hover:bg-blue-400 dark:bg-zinc-500 dark:group-hover:bg-blue-400" />
        </div>
      ) : null}
    </th>
  );
}
