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
    </th>
  );
}
