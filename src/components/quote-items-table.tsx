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
  QUOTE_ITEMS_FIXED_START_COLUMN_IDS,
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
  onItemDrop: (index: number) => void;
  onMoveItemUp: (index: number) => void;
  onMoveItemDown: (index: number) => void;
  onFulfillmentChange: (index: number, location: FulfillmentLocation) => void;
  onPurchaseSourceChange: (index: number, value: string) => void;
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

type QuoteItemsTableBodyProps = Omit<
  QuoteItemsTableProps,
  "userId" | "draggingItemIndex" | "dragOverItemIndex" | "onItemDragStart" | "onItemDragEnd" | "onItemDragOver" | "onItemDrop"
>;

const mobileFieldLabelClass =
  "mb-1 block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400";

const mobileValueClass =
  "text-sm text-zinc-800 dark:text-zinc-200";

const mobileMetaClass =
  "text-sm text-zinc-600 dark:text-zinc-400";

function QuoteItemsMobileList({
  items,
  discountAmount,
  onDiscountChange,
  onMoveItemUp,
  onMoveItemDown,
  onFulfillmentChange,
  onPurchaseSourceChange,
  onProductNameChange,
  onQuantityChange,
  onSalePriceChange,
  onPurchasePriceChange,
  onRemoveItem,
}: QuoteItemsTableBodyProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 md:hidden">
        제품을 추가해 주세요.
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      {items.map((item, index) => (
        <article
          key={`${item.product_id}-${index}`}
          className="rounded-xl border border-zinc-200/80 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <div className="mb-3 flex items-start gap-2">
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => onMoveItemUp(index)}
                aria-label="위로 이동"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-[11px] text-zinc-600 disabled:opacity-30 dark:border-zinc-600 dark:text-zinc-400"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === items.length - 1}
                onClick={() => onMoveItemDown(index)}
                aria-label="아래로 이동"
                className="inline-flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-[11px] text-zinc-600 disabled:opacity-30 dark:border-zinc-600 dark:text-zinc-400"
              >
                ↓
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {item.model_name}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onRemoveItem(index)}
              className="shrink-0 text-xs font-medium text-red-600 hover:underline dark:text-red-400"
            >
              삭제
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={mobileFieldLabelClass}>제품 설명</label>
              <QuoteInlineTextCell
                value={item.product_name}
                placeholder="제품 설명"
                onChange={(value) => onProductNameChange(index, value)}
              />
            </div>

            <div>
              <label className={mobileFieldLabelClass}>출고지</label>
              <QuoteInlineSelectCell
                value={item.fulfillment_location}
                options={FULFILLMENT_LOCATIONS}
                onChange={(location) =>
                  onFulfillmentChange(index, location as FulfillmentLocation)
                }
              />
            </div>

            <div>
              <label className={mobileFieldLabelClass}>공급처</label>
              <p className={`${mobileMetaClass} truncate`}>
                {item.supplier || "-"}
              </p>
            </div>

            <div className="col-span-2">
              <label className={mobileFieldLabelClass}>매입처</label>
              <QuoteInlineTextCell
                value={item.purchase_source}
                placeholder="매입처"
                onChange={(value) => onPurchaseSourceChange(index, value)}
              />
            </div>

            <div>
              <label className={mobileFieldLabelClass}>수량</label>
              <QuoteInlineNumberCell
                value={item.quantity}
                onChange={(quantity) => onQuantityChange(index, quantity)}
              />
            </div>

            <div>
              <label className={mobileFieldLabelClass}>판매단가</label>
              <QuoteInlinePriceCell
                value={item.sale_unit_price}
                onChange={(saleUnitPrice) =>
                  onSalePriceChange(index, saleUnitPrice)
                }
              />
            </div>

            <div>
              <label className={mobileFieldLabelClass}>매입가</label>
              <QuoteInlinePriceCell
                value={item.purchase_price}
                onChange={(purchasePrice) =>
                  onPurchasePriceChange(index, purchasePrice)
                }
              />
            </div>

            <div>
              <label className={mobileFieldLabelClass}>마진</label>
              <p className={`${mobileValueClass} font-semibold text-green-700 dark:text-green-300`}>
                {formatKRW(item.margin)}
              </p>
            </div>

            <div>
              <label className={mobileFieldLabelClass}>마진율</label>
              <p className={mobileValueClass}>
                {(item.margin_rate * 100).toFixed(1)}%
              </p>
            </div>

            <div className="col-span-2 border-t border-zinc-200 pt-2 dark:border-zinc-700">
              <div className="flex items-center justify-between gap-2">
                <span className={mobileFieldLabelClass}>총 판매가</span>
                <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatKRW(item.line_total)}원
                </span>
              </div>
            </div>
          </div>
        </article>
      ))}
      <article className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-700 dark:bg-zinc-900/80">
        <div className="mb-3">
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">할인</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={mobileFieldLabelClass}>할인 금액</label>
            <QuoteInlinePriceCell
              value={discountAmount}
              onChange={onDiscountChange}
            />
          </div>
          <div>
            <label className={mobileFieldLabelClass}>총 판매가</label>
            <p className="text-sm font-bold tabular-nums text-red-600 dark:text-red-400">
              {discountAmount > 0 ? `-${formatKRW(discountAmount)}` : formatKRW(0)}원
            </p>
          </div>
        </div>
      </article>
    </div>
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
  onMoveItemUp,
  onMoveItemDown,
  onFulfillmentChange,
  onPurchaseSourceChange,
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
          <td className={`${readOnlyCellClass} px-0.5 text-center`}>
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
          <td className={`${editableCellClass} text-center`}>
            <QuoteInlineSelectCell
              value={item.fulfillment_location}
              options={FULFILLMENT_LOCATIONS}
              onChange={(location) =>
                onFulfillmentChange(index, location as FulfillmentLocation)
              }
            />
          </td>
        );
      case "supplier":
        return (
          <td className={`${readOnlyCellClass} text-left`}>
            <span className="block w-full truncate">{item.supplier || "-"}</span>
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
      case "reorder":
        return <td className={readOnlyCellClass} />;
      case "fulfillment":
      case "supplier":
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
    <>
      <QuoteItemsMobileList
        items={items}
        discountAmount={discountAmount}
        onDiscountChange={onDiscountChange}
        onMoveItemUp={onMoveItemUp}
        onMoveItemDown={onMoveItemDown}
        onFulfillmentChange={onFulfillmentChange}
        onPurchaseSourceChange={onPurchaseSourceChange}
        onProductNameChange={onProductNameChange}
        onQuantityChange={onQuantityChange}
        onSalePriceChange={onSalePriceChange}
        onPurchasePriceChange={onPurchasePriceChange}
        onRemoveItem={onRemoveItem}
      />

      <section className="hidden overflow-x-auto md:block">
        <table className={tableClassName} style={{ minWidth: tableMinWidth }}>
        {colGroup}
        <thead>
          <tr>
            {orderedColumns.map((column, columnIndex) => {
              const showHeaderDivider =
                columnIndex < orderedColumns.length - 1;

              return column.id === "reorder" ? (
                <th
                  key={column.id}
                  className={`${headerCellClass} px-1 ${
                    showHeaderDivider ? headerCellDividerClass : ""
                  }`}
                  aria-label="순서"
                  style={{ width: `${widths[column.id]}px` }}
                />
              ) : (
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
                  onItemDrop(index);
                }}
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
    </>
  );
}
