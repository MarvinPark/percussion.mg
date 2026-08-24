"use client";

import { Fragment } from "react";
import DraggableTableHeaderCell from "@/components/draggable-table-header-cell";
import { useConfigurableTableColumns } from "@/hooks/use-configurable-table-columns";
import { isReorderableConfigurableColumn } from "@/lib/configurable-table-columns";
import {
  getStockHistoryColumnOrderStorageKey,
  getStockHistoryColumnWidthStorageKey,
  STOCK_HISTORY_TABLE_COLUMNS,
  type StockHistoryTableColumnId,
} from "@/lib/stock-history-table-columns";
import {
  getTableHeaderPaddingClass,
  getTableRowPaddingClass,
} from "@/lib/table-row-preferences";
import {
  movementTypeLabel,
  type StockMovementWithProduct,
} from "@/types/stock-movement";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function typeBadgeClass(type: string) {
  if (type === "in") {
    return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300";
  }
  if (type === "out") {
    return "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300";
  }
  return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300";
}

type StockHistoryListProps = {
  userId: string;
  movements: StockMovementWithProduct[];
  rowFontSize?: number;
  emptyMessage?: string;
};

const tableClassName = "w-full table-fixed text-sm";

export default function StockHistoryList({
  userId,
  movements,
  rowFontSize = 12,
  emptyMessage,
}: StockHistoryListProps) {
  const rowPaddingClass = getTableRowPaddingClass(rowFontSize);
  const headerPaddingClass = getTableHeaderPaddingClass(rowFontSize);
  const cellClass = `max-w-0 truncate whitespace-nowrap px-4 text-zinc-900 dark:text-zinc-100 ${rowPaddingClass}`;
  const headerClass = `whitespace-nowrap px-4 ${headerPaddingClass} text-xs font-semibold`;
  const subFontSize = Math.max(8, rowFontSize - 2);

  const {
    orderedColumns,
    widths,
    startResize,
    tableMinWidth,
    draggingColumnId,
    dragOverColumnId,
    handleColumnDragStart,
    handleColumnDragEnd,
    handleColumnDragOver,
    handleColumnDrop,
    fixedStart,
    fixedEnd,
  } = useConfigurableTableColumns(
    userId,
    getStockHistoryColumnOrderStorageKey(userId),
    getStockHistoryColumnWidthStorageKey(userId),
    STOCK_HISTORY_TABLE_COLUMNS,
  );

  function getHeaderDragProps(columnId: StockHistoryTableColumnId) {
    if (!isReorderableConfigurableColumn(columnId, fixedStart, fixedEnd)) {
      return {};
    }

    return {
      reorderable: true,
      isDragging: draggingColumnId === columnId,
      isDragOver: dragOverColumnId === columnId,
      onColumnDragStart: handleColumnDragStart,
      onColumnDragEnd: handleColumnDragEnd,
      onColumnDragOver: handleColumnDragOver,
      onColumnDrop: handleColumnDrop,
    };
  }

  function renderCell(
    columnId: StockHistoryTableColumnId,
    item: StockMovementWithProduct,
  ) {
    switch (columnId) {
      case "date":
        return <td className={cellClass}>{formatDate(item.created_at)}</td>;
      case "modified_by":
        return (
          <td className={cellClass}>{item.modified_by_name ?? "-"}</td>
        );
      case "product":
        return (
          <td className={`px-4 ${rowPaddingClass} text-zinc-900 dark:text-zinc-100`}>
            <p className="truncate">
              {item.products?.product_name ?? "삭제된 제품"}
            </p>
            <p
              className="truncate text-zinc-600 dark:text-zinc-400"
              style={{ fontSize: `${subFontSize}px` }}
            >
              {item.products?.model_name}
            </p>
          </td>
        );
      case "supplier":
        return (
          <td className={cellClass}>{item.products?.supplier ?? "-"}</td>
        );
      case "type":
        return (
          <td className={`px-4 ${rowPaddingClass}`}>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass(item.movement_type)}`}
            >
              {movementTypeLabel[item.movement_type]}
            </span>
          </td>
        );
      case "quantity":
        return (
          <td className={`${cellClass} font-medium`}>{item.quantity}개</td>
        );
      case "stock_change":
        return (
          <td className={cellClass}>
            {item.stock_before} → {item.stock_after}
          </td>
        );
      case "note":
        return (
          <td
            className={`max-w-0 truncate px-4 ${rowPaddingClass} text-zinc-700 dark:text-zinc-300`}
          >
            {item.note ?? "-"}
          </td>
        );
      default:
        return null;
    }
  }

  const colGroup = (
    <colgroup>
      {orderedColumns.map((column) => (
        <col key={column.id} style={{ width: `${widths[column.id]}px` }} />
      ))}
    </colgroup>
  );

  return (
    <>
      <div className="space-y-3 md:hidden">
        {movements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            {emptyMessage ?? "표시할 변동 기록이 없습니다."}
          </div>
        ) : (
          movements.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {item.products?.product_name ?? "삭제된 제품"}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {formatDate(item.created_at)}
                    {item.modified_by_name ? (
                      <span className="ml-2">{item.modified_by_name}</span>
                    ) : null}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeBadgeClass(item.movement_type)}`}
                >
                  {movementTypeLabel[item.movement_type]}
                </span>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                    수량
                  </dt>
                  <dd className="text-zinc-900 dark:text-zinc-100">
                    {item.quantity}개
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                    재고 변화
                  </dt>
                  <dd className="text-zinc-900 dark:text-zinc-100">
                    {item.stock_before} → {item.stock_after}
                  </dd>
                </div>
                {item.note ? (
                  <div className="col-span-2">
                    <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                      메모
                    </dt>
                    <dd className="text-zinc-900 dark:text-zinc-100">
                      {item.note}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ))
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-zinc-200 bg-white md:block dark:border-zinc-700 dark:bg-zinc-900">
        <table className={tableClassName} style={{ minWidth: tableMinWidth }}>
          {colGroup}
          <thead
            className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            style={{ fontSize: `${rowFontSize}px` }}
          >
            <tr>
              {orderedColumns.map((column) => (
                <DraggableTableHeaderCell
                  key={column.id}
                  columnId={column.id}
                  label={column.label}
                  align={column.align ?? "left"}
                  className={headerClass}
                  resizable={column.resizable}
                  onResizeStart={startResize}
                  {...getHeaderDragProps(column.id)}
                />
              ))}
            </tr>
          </thead>
          <tbody style={{ fontSize: `${rowFontSize}px` }}>
            {movements.length === 0 ? (
              <tr>
                <td
                  colSpan={orderedColumns.length}
                  className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  {emptyMessage ?? "표시할 변동 기록이 없습니다."}
                </td>
              </tr>
            ) : (
              movements.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  {orderedColumns.map((column) => (
                    <Fragment key={column.id}>
                      {renderCell(column.id, item)}
                    </Fragment>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
