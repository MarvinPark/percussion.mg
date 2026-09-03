"use client";

import { Fragment } from "react";
import DraggableTableHeaderCell from "@/components/draggable-table-header-cell";
import PriceInput from "@/components/price-input";
import { useConfigurableTableColumns } from "@/hooks/use-configurable-table-columns";
import { isReorderableConfigurableColumn } from "@/lib/configurable-table-columns";
import {
  FULFILLMENT_LOCATIONS,
  type FulfillmentLocation,
} from "@/lib/quote-fulfillment";
import {
  getQuoteItemsColumnOrderStorageKey,
  getQuoteItemsColumnWidthStorageKey,
  QUOTE_ITEMS_FIXED_END_COLUMN_IDS,
  QUOTE_ITEMS_FIXED_START_COLUMN_IDS,
  QUOTE_ITEMS_TABLE_COLUMNS,
  type QuoteItemsTableColumnId,
} from "@/lib/quote-items-table-columns";
import { formatKRW } from "@/lib/sales-calculator";
import type { QuoteItemInput } from "@/types/quote";

type QuoteItemsTableProps = {
  userId: string;
  items: QuoteItemInput[];
  mobileInputClass: string;
  draggingItemIndex: number | null;
  dragOverItemIndex: number | null;
  onItemDragStart: (index: number) => void;
  onItemDragEnd: () => void;
  onItemDragOver: (event: React.DragEvent, index: number) => void;
  onItemDrop: (index: number) => void;
  onMoveItemUp: (index: number) => void;
  onMoveItemDown: (index: number) => void;
  onFulfillmentChange: (index: number, location: FulfillmentLocation) => void;
  onPurchaseSourceChange: (index: number, value: string) => void;
  onQuantityChange: (index: number, quantity: number) => void;
  onSalePriceChange: (index: number, saleUnitPrice: number) => void;
  onPurchasePriceChange: (index: number, purchasePrice: number) => void;
  onRemoveItem: (index: number) => void;
};

const tableClassName = "w-full table-fixed text-xs whitespace-nowrap";

export default function QuoteItemsTable({
  userId,
  items,
  mobileInputClass,
  draggingItemIndex,
  dragOverItemIndex,
  onItemDragStart,
  onItemDragEnd,
  onItemDragOver,
  onItemDrop,
  onMoveItemUp,
  onMoveItemDown,
  onFulfillmentChange,
  onPurchaseSourceChange,
  onQuantityChange,
  onSalePriceChange,
  onPurchasePriceChange,
  onRemoveItem,
}: QuoteItemsTableProps) {
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
    getQuoteItemsColumnOrderStorageKey(userId),
    getQuoteItemsColumnWidthStorageKey(userId),
    QUOTE_ITEMS_TABLE_COLUMNS,
    {
      fixedStart: QUOTE_ITEMS_FIXED_START_COLUMN_IDS,
      fixedEnd: QUOTE_ITEMS_FIXED_END_COLUMN_IDS,
    },
  );

  function getHeaderDragProps(columnId: QuoteItemsTableColumnId) {
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
    columnId: QuoteItemsTableColumnId,
    item: QuoteItemInput,
    index: number,
  ) {
    switch (columnId) {
      case "reorder":
        return (
          <td className="px-1 py-2 text-center">
            <div className="flex items-center justify-center gap-0.5">
              <div className="flex flex-col md:hidden">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => onMoveItemUp(index)}
                  aria-label="위로 이동"
                  className="inline-flex h-5 w-5 items-center justify-center rounded border border-zinc-300 text-[10px] text-zinc-600 disabled:opacity-30 dark:border-zinc-600 dark:text-zinc-400"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === items.length - 1}
                  onClick={() => onMoveItemDown(index)}
                  aria-label="아래로 이동"
                  className="inline-flex h-5 w-5 items-center justify-center rounded border border-zinc-300 text-[10px] text-zinc-600 disabled:opacity-30 dark:border-zinc-600 dark:text-zinc-400"
                >
                  ↓
                </button>
              </div>
              <span
                draggable
                onDragStart={() => onItemDragStart(index)}
                onDragEnd={onItemDragEnd}
                className="hidden cursor-grab select-none px-1 text-zinc-400 active:cursor-grabbing md:inline-flex dark:text-zinc-500"
                title="드래그하여 순서 변경"
                aria-label="순서 변경"
              >
                ⋮⋮
              </span>
            </div>
          </td>
        );
      case "fulfillment":
        return (
          <td className="px-2 py-2">
            <select
              value={item.fulfillment_location}
              onChange={(event) =>
                onFulfillmentChange(
                  index,
                  event.target.value as FulfillmentLocation,
                )
              }
              className={`${mobileInputClass} w-24 sm:w-20`}
            >
              {FULFILLMENT_LOCATIONS.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </td>
        );
      case "supplier":
        return (
          <td className="px-2 py-2 text-zinc-600 dark:text-zinc-400">
            {item.supplier || "-"}
          </td>
        );
      case "purchase_source":
        return (
          <td className="px-2 py-2">
            <input
              type="text"
              value={item.purchase_source}
              onChange={(event) =>
                onPurchaseSourceChange(index, event.target.value)
              }
              placeholder="매입처"
              className={`${mobileInputClass} w-28 sm:w-24`}
            />
          </td>
        );
      case "model_name":
        return (
          <td className="max-w-0 truncate px-2 py-2 font-medium">
            {item.model_name}
          </td>
        );
      case "product_name":
        return (
          <td className="max-w-0 truncate px-2 py-2">{item.product_name}</td>
        );
      case "quantity":
        return (
          <td className="px-2 py-2">
            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(event) =>
                onQuantityChange(index, Number(event.target.value) || 1)
              }
              className={`${mobileInputClass} w-32 text-center tabular-nums sm:w-16`}
            />
          </td>
        );
      case "unit_sale_price":
        return (
          <td className="px-2 py-2">
            <PriceInput
              min={0}
              value={item.sale_unit_price}
              onChange={(saleUnitPrice) => onSalePriceChange(index, saleUnitPrice)}
              className={`${mobileInputClass} w-32 sm:w-28`}
            />
          </td>
        );
      case "line_total":
        return (
          <td className="px-2 py-2 font-semibold">
            {formatKRW(item.line_total)}
          </td>
        );
      case "purchase_price":
        return (
          <td className="px-2 py-2">
            <PriceInput
              min={0}
              value={item.purchase_price}
              onChange={(purchasePrice) =>
                onPurchasePriceChange(index, purchasePrice)
              }
              className={`${mobileInputClass} w-32 sm:w-28`}
            />
          </td>
        );
      case "margin":
        return (
          <td className="px-2 py-2 font-semibold text-green-700 dark:text-green-300">
            {formatKRW(item.margin)}
          </td>
        );
      case "margin_rate":
        return (
          <td className="px-2 py-2">
            {(item.margin_rate * 100).toFixed(1)}%
          </td>
        );
      case "actions":
        return (
          <td className="px-2 py-2">
            <button
              type="button"
              onClick={() => onRemoveItem(index)}
              className="text-red-600 hover:underline"
            >
              삭제
            </button>
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
    <section className="-mx-1 overflow-x-auto rounded-xl border border-zinc-200 px-1 dark:border-zinc-700 sm:mx-0 sm:px-0">
      <table className={tableClassName} style={{ minWidth: tableMinWidth }}>
        {colGroup}
        <thead className="bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
          <tr>
            {orderedColumns.map((column) =>
              column.id === "reorder" ? (
                <th
                  key={column.id}
                  className="px-1 py-2"
                  aria-label="순서"
                  style={{ width: `${widths[column.id]}px` }}
                />
              ) : (
                <DraggableTableHeaderCell
                  key={column.id}
                  columnId={column.id}
                  label={column.label}
                  align={column.align ?? "left"}
                  className="px-2 py-2 font-semibold"
                  resizable={column.resizable}
                  onResizeStart={startResize}
                  {...getHeaderDragProps(column.id)}
                />
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={orderedColumns.length}
                className="px-4 py-8 text-center text-sm text-zinc-500"
              >
                제품을 추가해 주세요.
              </td>
            </tr>
          ) : (
            items.map((item, index) => (
              <tr
                key={`${item.product_id}-${index}`}
                onDragOver={(event) => onItemDragOver(event, index)}
                onDrop={(event) => {
                  event.preventDefault();
                  onItemDrop(index);
                }}
                className={`border-t border-zinc-200 dark:border-zinc-700 ${
                  draggingItemIndex === index ? "opacity-50" : ""
                } ${
                  dragOverItemIndex === index
                    ? "bg-blue-50 dark:bg-blue-950/30"
                    : ""
                }`}
              >
                {orderedColumns.map((column) => (
                  <Fragment key={column.id}>
                    {renderCell(column.id, item, index)}
                  </Fragment>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
