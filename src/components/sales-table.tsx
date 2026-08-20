"use client";

import { Fragment, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSale, updateSalePurchasePrice } from "@/app/(main)/sales/actions";
import DeleteConfirmDialog from "@/components/delete-confirm-dialog";
import DraggableTableHeaderCell from "@/components/draggable-table-header-cell";
import PriceInput from "@/components/price-input";
import SaleEditModal from "@/components/sale-edit-modal";
import { useSalesColumnWidths } from "@/hooks/use-sales-column-widths";
import { useTableColumnOrder } from "@/hooks/use-table-column-order";
import { formatKRW } from "@/lib/sales-calculator";
import { displaySaleCategory } from "@/lib/sale-categories";
import {
  getDefaultSalesColumnOrder,
  getSalesBaseColumns,
  getSalesColumnOrderStorageKey,
  isReorderableSalesColumn,
  SALES_FIXED_END_COLUMN_IDS,
  type SalesTableColumnId,
} from "@/lib/sales-table-columns";
import {
  getTableHeaderPaddingClass,
  getTableRowPaddingClass,
} from "@/lib/table-row-preferences";
import type { PaymentMethod, SaleProductOption, SaleWithProduct } from "@/types/sale";
import type { StaffOption } from "@/components/sales-page-client";

function formatDateCompact(value: string) {
  const date = new Date(value);
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

const actionButtonClass =
  "rounded border border-zinc-300 px-1.5 py-0.5 leading-none font-normal text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800";

const deleteButtonClass =
  "rounded bg-red-600 px-1.5 py-0.5 leading-none font-normal text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400";

const inlineInputClass =
  "w-full min-w-[4.5rem] rounded border border-blue-500 bg-white px-1.5 py-0.5 text-right text-inherit outline-none ring-1 ring-blue-500 dark:border-blue-400 dark:bg-zinc-900";

const editableCellClass =
  "max-w-0 cursor-text whitespace-nowrap px-3 leading-tight hover:bg-blue-50/60 dark:hover:bg-blue-950/20";

const tableClassName = "w-full table-fixed text-sm";

type SalesTableProps = {
  userId: string;
  sales: SaleWithProduct[];
  products: SaleProductOption[];
  paymentMethods: PaymentMethod[];
  saleCategories: string[];
  staffOptions: StaffOption[];
  rowFontSize?: number;
  emptyMessage?: string;
  canManageSales?: boolean;
};

export default function SalesTable({
  userId,
  sales,
  products,
  paymentMethods,
  saleCategories,
  staffOptions,
  rowFontSize = 12,
  emptyMessage,
  canManageSales = true,
}: SalesTableProps) {
  const router = useRouter();
  const [editingSale, setEditingSale] = useState<SaleWithProduct | null>(null);
  const [deletingSale, setDeletingSale] = useState<SaleWithProduct | null>(null);
  const [editingPurchasePriceSaleId, setEditingPurchasePriceSaleId] = useState<
    string | null
  >(null);
  const [draftPurchasePrice, setDraftPurchasePrice] = useState(0);
  const skipPurchasePriceBlurRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isSavingPurchasePrice, startPurchasePriceTransition] = useTransition();

  const baseColumns = useMemo(
    () => getSalesBaseColumns(canManageSales),
    [canManageSales],
  );
  const defaultOrder = useMemo(
    () => getDefaultSalesColumnOrder(canManageSales),
    [canManageSales],
  );
  const {
    orderedColumns,
    draggingColumnId,
    dragOverColumnId,
    handleColumnDragStart,
    handleColumnDragEnd,
    handleColumnDragOver,
    handleColumnDrop,
  } = useTableColumnOrder(
    getSalesColumnOrderStorageKey(userId),
    defaultOrder,
    baseColumns,
    { fixedEnd: SALES_FIXED_END_COLUMN_IDS },
  );
  const { widths, startResize } = useSalesColumnWidths(userId);

  const subFontSize = Math.max(8, rowFontSize - 2);
  const actionFontSize = Math.max(9, rowFontSize - 1);
  const cellPaddingClass = getTableRowPaddingClass(rowFontSize);
  const headerPaddingClass = getTableHeaderPaddingClass(rowFontSize);
  const cellClass = `max-w-0 whitespace-nowrap px-3 ${cellPaddingClass} leading-tight`;
  const headerClass = `whitespace-nowrap px-3 ${headerPaddingClass} text-xs font-semibold`;
  const tableMinWidth = orderedColumns.reduce(
    (sum, column) => sum + widths[column.id],
    0,
  );
  const tableStyle = { minWidth: tableMinWidth };

  const colGroup = (
    <colgroup>
      {orderedColumns.map((column) => (
        <col key={column.id} style={{ width: `${widths[column.id]}px` }} />
      ))}
    </colgroup>
  );

  function getHeaderDragProps(columnId: SalesTableColumnId) {
    if (!isReorderableSalesColumn(columnId)) {
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

  function renderSaleCell(columnId: SalesTableColumnId, sale: SaleWithProduct) {
    switch (columnId) {
      case "seller":
        return (
          <td className={`${cellClass} text-zinc-900 dark:text-zinc-100`}>
            {sale.created_by_name ?? "-"}
          </td>
        );
      case "category":
        return (
          <td className={`${cellClass} text-zinc-900 dark:text-zinc-100`}>
            {displaySaleCategory(sale.sale_category)}
          </td>
        );
      case "date":
        return (
          <td className={`${cellClass} text-zinc-900 dark:text-zinc-100`}>
            {formatDateCompact(sale.sold_at)}
          </td>
        );
      case "product":
        return (
          <td className={`${cellClass} text-zinc-900 dark:text-zinc-100`}>
            <p className="truncate font-medium">{sale.products?.model_name ?? "-"}</p>
            {sale.products?.product_name ? (
              <p
                className="truncate text-zinc-500 dark:text-zinc-400"
                style={{ fontSize: `${subFontSize}px` }}
              >
                {sale.products.product_name}
              </p>
            ) : null}
          </td>
        );
      case "quantity":
        return (
          <td className={`${cellClass} text-zinc-900 dark:text-zinc-100`}>
            {sale.quantity}개
          </td>
        );
      case "purchase_price":
        return (
          <td
            className={`${
              canManageSales ? editableCellClass : cellClass
            } text-zinc-900 dark:text-zinc-100`}
            title={canManageSales ? "더블클릭하여 매입가 수정" : undefined}
            onDoubleClick={(event) => {
              if (!canManageSales) return;
              event.stopPropagation();
              beginPurchasePriceEdit(sale);
            }}
          >
            {canManageSales && editingPurchasePriceSaleId === sale.id ? (
              <PriceInput
                autoFocus
                value={draftPurchasePrice}
                disabled={isSavingPurchasePrice}
                onChange={setDraftPurchasePrice}
                onBlur={() => {
                  if (skipPurchasePriceBlurRef.current) {
                    skipPurchasePriceBlurRef.current = false;
                    return;
                  }
                  savePurchasePrice(sale.id, draftPurchasePrice);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    skipPurchasePriceBlurRef.current = true;
                    cancelPurchasePriceEdit();
                  }
                }}
                className={inlineInputClass}
                aria-label={`${sale.products?.model_name ?? "매출"} 매입가`}
              />
            ) : (
              <span className="block truncate text-right tabular-nums">
                {formatKRW(sale.unit_purchase_price)}원
              </span>
            )}
          </td>
        );
      case "total_amount":
        return (
          <td className={`${cellClass} font-medium text-zinc-900 dark:text-zinc-100`}>
            {formatKRW(sale.total_amount)}원
          </td>
        );
      case "fee":
        return (
          <td className={`${cellClass} text-orange-700 dark:text-orange-300`}>
            -{formatKRW(sale.payment_fee_amount)}원
          </td>
        );
      case "margin":
        return (
          <td className={`${cellClass} font-semibold text-green-700 dark:text-green-300`}>
            {formatKRW(sale.margin_amount)}원
          </td>
        );
      case "customer":
        return (
          <td className={`${cellClass} text-zinc-700 dark:text-zinc-300`}>
            <p className="truncate">{sale.customer_name ?? "-"}</p>
            {sale.business_partner ? (
              <p
                className="truncate text-zinc-500 dark:text-zinc-400"
                style={{ fontSize: `${subFontSize}px` }}
              >
                {sale.business_partner}
              </p>
            ) : null}
          </td>
        );
      case "payment":
        return (
          <td className={`${cellClass} text-zinc-700 dark:text-zinc-300`}>
            {sale.payment_method}
          </td>
        );
      case "actions":
        return (
          <td className={`${cellPaddingClass} whitespace-nowrap px-3 leading-tight`}>
            <div
              className="flex items-center justify-end gap-1"
              onDoubleClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setEditingSale(sale);
                }}
                className={actionButtonClass}
                style={{ fontSize: `${actionFontSize}px` }}
              >
                수정
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setDeletingSale(sale);
                }}
                className={deleteButtonClass}
                style={{ fontSize: `${actionFontSize}px` }}
                aria-label="삭제"
              >
                -
              </button>
            </div>
          </td>
        );
      default:
        return null;
    }
  }

  function beginPurchasePriceEdit(sale: SaleWithProduct) {
    setEditingPurchasePriceSaleId(sale.id);
    setDraftPurchasePrice(Number(sale.unit_purchase_price) || 0);
  }

  function cancelPurchasePriceEdit() {
    setEditingPurchasePriceSaleId(null);
  }

  function savePurchasePrice(saleId: string, nextValue: number) {
    const unitPurchasePrice = Math.max(0, Math.round(nextValue));
    setEditingPurchasePriceSaleId(null);
    setError(null);

    startPurchasePriceTransition(async () => {
      const result = await updateSalePurchasePrice(saleId, unitPurchasePrice);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDeleteConfirm() {
    if (!deletingSale) return;

    setError(null);
    startDeleteTransition(async () => {
      const result = await deleteSale(deletingSale.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDeletingSale(null);
      if (editingSale?.id === deletingSale.id) {
        setEditingSale(null);
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <table className={tableClassName} style={tableStyle}>
          {colGroup}
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
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
            {sales.length === 0 ? (
              <tr>
                <td
                  colSpan={orderedColumns.length}
                  className="px-3 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  {emptyMessage ?? "표시할 판매 기록이 없습니다."}
                </td>
              </tr>
            ) : null}
            {sales.map((sale) => (
              <tr
                key={sale.id}
                onDoubleClick={canManageSales ? () => setEditingSale(sale) : undefined}
                title={canManageSales ? "더블클릭하여 수정" : undefined}
                className={`border-b border-zinc-100 transition last:border-0 dark:border-zinc-800 ${
                  canManageSales
                    ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    : ""
                }`}
              >
                {orderedColumns.map((column) => (
                  <Fragment key={column.id}>
                    {renderSaleCell(column.id, sale)}
                  </Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {editingSale ? (
        <SaleEditModal
          sale={editingSale}
          products={products}
          paymentMethods={paymentMethods}
          saleCategories={saleCategories}
          staffOptions={staffOptions}
          onClose={() => setEditingSale(null)}
        />
      ) : null}

      {deletingSale ? (
        <DeleteConfirmDialog
          count={1}
          onCancel={() => {
            if (!isDeleting) setDeletingSale(null);
          }}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </>
  );
}
