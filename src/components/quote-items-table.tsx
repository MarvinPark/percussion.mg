"use client";

import { Fragment } from "react";
import DraggableTableHeaderCell from "@/components/draggable-table-header-cell";
import {
  QUOTE_CELL_HEIGHT_CLASS,
  QUOTE_CELL_TEXT_CLASS,
  QuoteInlineNumberCell,
  QuoteInlinePriceCell,
  QuoteInlineSelectCell,
  QuoteInlineTextCell,
} from "@/components/quote-inline-cells";
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
  QUOTE_ITEMS_TABLE_COLUMNS,
  type QuoteItemsTableColumnId,
} from "@/lib/quote-items-table-columns";
import { formatKRW } from "@/lib/sales-calculator";
import type { QuoteItemInput } from "@/types/quote";

type QuoteItemsTableProps = {
  userId: string;
  items: QuoteItemInput[];
  discountAmount: number;
  onDiscountChange: (value: number) => void;
  draggingItemIndex: number | null;
  dragOverItemIndex: number | null;
  onItemDragStart: (index: number) => void;
  onItemDragEnd: () => void;
  onItemDragOver: (event: React.DragEvent, index: number) => void;
  onItemDrop: (fromIndex: number | null, toIndex: number) => void;
  onFulfillmentChange: (index: number, location: FulfillmentLocation) => void;
  onPurchaseSourceChange: (index: number, value: string) => void;
  onCategoryChange: (index: number, value: string) => void;
  onProductNameChange: (index: number, value: string) => void;
  onQuantityChange: (index: number, quantity: number) => void;
  onSalePriceChange: (index: number, saleUnitPrice: number) => void;
  onPurchasePriceChange: (index: number, purchasePrice: number) => void;
  onRemoveItem: (index: number) => void;
};

const tableClassName = `w-full table-fixed border-collapse ${QUOTE_CELL_TEXT_CLASS}`;

const rowDividerClass = "border-b border-slate-200 dark:border-slate-700";

const bodyRowClass = "bg-[#f1f5f9] dark:bg-slate-900/50";

const headerCellClass =
  "relative bg-slate-800 px-2 py-3 text-center text-xs font-bold tracking-wide text-white dark:bg-slate-900";

const headerCellDividerClass =
  "after:pointer-events-none after:absolute after:right-0 after:top-[15%] after:h-[70%] after:w-px after:bg-white/50 after:transition-[width,background-color] after:content-[''] hover:after:w-0.5 hover:after:bg-white/90";

const readOnlyCellClass = `px-2 py-1.5 align-middle ${QUOTE_CELL_HEIGHT_CLASS} ${QUOTE_CELL_TEXT_CLASS} ${rowDividerClass} text-slate-800 dark:text-slate-200`;

const editableCellClass = `px-1 py-1 align-middle ${QUOTE_CELL_HEIGHT_CLASS} ${rowDividerClass} bg-white dark:bg-slate-800/70`;

const deleteButtonClass =
  "inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60";

function ItemDragHandle({
  index,
  onItemDragStart,
  onItemDragEnd,
}: {
  index: number;
  onItemDragStart: (index: number) => void;
  onItemDragEnd: () => void;
}) {
  return (
    <span
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(index));
        onItemDragStart(index);
      }}
      onDragEnd={onItemDragEnd}
      className="inline-flex shrink-0 cursor-grab select-none px-0.5 text-zinc-400 active:cursor-grabbing dark:text-zinc-500"
      title="드래그하여 순서 변경"
      aria-label="순서 변경"
    >
      ⋮⋮
    </span>
  );
}

export default function QuoteItemsTable({
  userId,
  items,
  discountAmount,
  onDiscountChange,
  draggingItemIndex,
  dragOverItemIndex,
  onItemDragStart,
  onItemDragEnd,
  onItemDragOver,
  onItemDrop,
  onFulfillmentChange,
  onPurchaseSourceChange,
  onCategoryChange,
  onProductNameChange,
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
      case "fulfillment":
        return (
          <td className={`${editableCellClass} text-center`}>
            <div className="flex items-center justify-center gap-1">
              <ItemDragHandle
                index={index}
                onItemDragStart={onItemDragStart}
                onItemDragEnd={onItemDragEnd}
              />
              <div className="min-w-0 flex-1">
                <QuoteInlineSelectCell
                  value={item.fulfillment_location}
                  options={FULFILLMENT_LOCATIONS}
                  onChange={(location) =>
                    onFulfillmentChange(index, location as FulfillmentLocation)
                  }
                />
              </div>
            </div>
          </td>
        );
      case "supplier":
        return (
          <td className={`${readOnlyCellClass} text-left`}>
            <span className="block w-full truncate">{item.supplier || "-"}</span>
          </td>
        );
      case "category":
        return (
          <td className={editableCellClass}>
            <QuoteInlineTextCell
              value={item.category}
              placeholder="품목"
              align="left"
              onChange={(value) => onCategoryChange(index, value)}
            />
          </td>
        );
      case "purchase_source":
        return (
          <td className={editableCellClass}>
            <QuoteInlineTextCell
              value={item.purchase_source}
              placeholder="매입처"
              align="left"
              onChange={(value) => onPurchaseSourceChange(index, value)}
            />
          </td>
        );
      case "model_name":
        return (
          <td className={`${readOnlyCellClass} text-left font-medium`}>
            <span className="block w-full truncate">{item.model_name}</span>
          </td>
        );
      case "product_name":
        return (
          <td className={editableCellClass}>
            <QuoteInlineTextCell
              value={item.product_name}
              placeholder="제품 설명"
              align="left"
              onChange={(value) => onProductNameChange(index, value)}
            />
          </td>
        );
      case "quantity":
        return (
          <td className={editableCellClass}>
            <QuoteInlineNumberCell
              value={item.quantity}
              align="right"
              onChange={(quantity) => onQuantityChange(index, quantity)}
            />
          </td>
        );
      case "unit_sale_price":
        return (
          <td className={editableCellClass}>
            <QuoteInlinePriceCell
              value={item.sale_unit_price}
              align="right"
              onChange={(saleUnitPrice) => onSalePriceChange(index, saleUnitPrice)}
            />
          </td>
        );
      case "line_total":
        return (
          <td className={`${readOnlyCellClass} text-right font-bold tabular-nums`}>
            {formatKRW(item.line_total)}
          </td>
        );
      case "purchase_price":
        return (
          <td className={editableCellClass}>
            <QuoteInlinePriceCell
              value={item.purchase_price}
              align="right"
              onChange={(purchasePrice) =>
                onPurchasePriceChange(index, purchasePrice)
              }
            />
          </td>
        );
      case "margin":
        return (
          <td
            className={`${readOnlyCellClass} text-right font-semibold tabular-nums ${
              item.margin >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {formatKRW(item.margin)}
          </td>
        );
      case "margin_rate":
        return (
          <td className={`${readOnlyCellClass} text-right tabular-nums`}>
            {(item.margin_rate * 100).toFixed(1)}%
          </td>
        );
      case "actions":
        return (
          <td className={`${readOnlyCellClass} text-center`}>
            <button
              type="button"
              onClick={() => onRemoveItem(index)}
              className={deleteButtonClass}
            >
              삭제
            </button>
          </td>
        );
      default:
        return null;
    }
  }

  function renderDiscountCell(columnId: QuoteItemsTableColumnId) {
    switch (columnId) {
      case "fulfillment":
      case "supplier":
      case "category":
      case "purchase_source":
      case "product_name":
        return (
          <td className={`${readOnlyCellClass} text-zinc-400 dark:text-zinc-500`}>-</td>
        );
      case "model_name":
        return (
          <td className={`${readOnlyCellClass} font-medium`}>
            할인
          </td>
        );
      case "quantity":
        return (
          <td className={`${readOnlyCellClass} text-zinc-400 dark:text-zinc-500`}>
            -
          </td>
        );
      case "unit_sale_price":
        return (
          <td className={editableCellClass}>
            <QuoteInlinePriceCell
              value={discountAmount}
              align="right"
              onChange={onDiscountChange}
            />
          </td>
        );
      case "line_total":
        return (
          <td className={`${readOnlyCellClass} text-right font-bold tabular-nums text-red-600 dark:text-red-400`}>
            {discountAmount > 0 ? `-${formatKRW(discountAmount)}` : formatKRW(0)}
          </td>
        );
      case "purchase_price":
      case "margin":
      case "margin_rate":
        return (
          <td className={`${readOnlyCellClass} text-zinc-400 dark:text-zinc-500`}>-</td>
        );
      case "actions":
        return <td className={readOnlyCellClass} />;
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
    <section className="overflow-x-auto overscroll-x-contain touch-pan-x">
      <table className={tableClassName} style={{ minWidth: tableMinWidth }}>
        {colGroup}
        <thead>
          <tr>
            {orderedColumns.map((column, columnIndex) => {
              const showHeaderDivider =
                columnIndex < orderedColumns.length - 1;

              return (
                <DraggableTableHeaderCell
                  key={column.id}
                  columnId={column.id}
                  label={column.label}
                  align="center"
                  tone="dark"
                  className={`${headerCellClass} ${
                    showHeaderDivider && !column.resizable
                      ? headerCellDividerClass
                      : ""
                  }`}
                  resizable={column.resizable}
                  resizeHandleVariant={
                    column.resizable ? "light-divider" : "default"
                  }
                  onResizeStart={startResize}
                  {...getHeaderDragProps(column.id)}
                />
              );
            })}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr className={bodyRowClass}>
              <td
                colSpan={orderedColumns.length}
                className={`${readOnlyCellClass} px-4 py-10 text-center text-sm text-slate-500`}
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
                  const raw = event.dataTransfer.getData("text/plain");
                  const parsed = Number.parseInt(raw, 10);
                  const fromIndex = Number.isNaN(parsed)
                    ? draggingItemIndex
                    : parsed;
                  onItemDrop(fromIndex, index);
                }}
                onDragEnd={onItemDragEnd}
                className={`${bodyRowClass} transition-colors hover:bg-[#e8edf3] dark:hover:bg-slate-800/70 ${
                  draggingItemIndex === index ? "opacity-50" : ""
                } ${
                  dragOverItemIndex === index
                    ? "!bg-blue-50 dark:!bg-blue-950/30"
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
          {items.length > 0 ? (
            <tr className={`${bodyRowClass} font-medium`}>
              {orderedColumns.map((column) => (
                <Fragment key={`discount-${column.id}`}>
                  {renderDiscountCell(column.id)}
                </Fragment>
              ))}
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}
