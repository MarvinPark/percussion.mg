"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSale, deleteSales, updateSalePurchasePrice, updateSaleShippingCost } from "@/app/(main)/sales/actions";
import DeleteConfirmDialog from "@/components/delete-confirm-dialog";
import DraggableTableHeaderCell from "@/components/draggable-table-header-cell";
import PriceInput from "@/components/price-input";
import SaleEditModal from "@/components/sale-edit-modal";
import { useSalesColumnWidths } from "@/hooks/use-sales-column-widths";
import { useTableColumnOrder } from "@/hooks/use-table-column-order";
import { calculateSaleAmounts, formatKRW } from "@/lib/sales-calculator";
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

const bulkDeleteButtonClass =
  "inline-flex h-[26px] shrink-0 items-center rounded border border-red-300 bg-red-600 px-2 py-1 text-[12px] leading-none font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-red-500 dark:hover:bg-red-400";

const checkboxCellClass = "w-10 px-2 text-center";

const inlineInputClass =
  "w-full min-w-[4.5rem] rounded border border-blue-500 bg-white px-1.5 py-0.5 text-right text-inherit outline-none ring-1 ring-blue-500 dark:border-blue-400 dark:bg-zinc-900";

const editableCellClass =
  "max-w-0 cursor-text whitespace-nowrap px-3 leading-tight hover:bg-blue-50/60 dark:hover:bg-blue-950/20";

const tableClassName = "w-full table-fixed text-sm";

type SaleFieldOverrides = {
  unit_purchase_price?: number;
  shipping_cost?: number;
};

function getDisplayMargin(sale: SaleWithProduct) {
  return calculateSaleAmounts({
    quantity: sale.quantity,
    unitSalePrice: Number(sale.unit_sale_price) || 0,
    unitPurchasePrice: Number(sale.unit_purchase_price) || 0,
    feeRate: Number(sale.payment_fee_rate) || 0,
    shippingCost: Number(sale.shipping_cost) || 0,
  }).marginAmount;
}

function SaleInlinePriceCell({
  sale,
  field,
  disabled,
  inputClassName,
  ariaLabel,
  onDraftChange,
  onSave,
}: {
  sale: SaleWithProduct;
  field: "purchase_price" | "shipping_cost";
  disabled?: boolean;
  inputClassName: string;
  ariaLabel: string;
  onDraftChange?: (saleId: string, value: number) => void;
  onSave: (saleId: string, value: number) => Promise<{ error?: string } | void>;
}) {
  const initialValue =
    field === "purchase_price"
      ? Number(sale.unit_purchase_price) || 0
      : Number(sale.shipping_cost) || 0;
  const [value, setValue] = useState(initialValue);
  const latestRef = useRef(initialValue);
  const isEditingRef = useRef(false);
  const [resetToken, setResetToken] = useState(0);

  useEffect(() => {
    if (isEditingRef.current) return;
    const nextValue =
      field === "purchase_price"
        ? Number(sale.unit_purchase_price) || 0
        : Number(sale.shipping_cost) || 0;
    setValue(nextValue);
    latestRef.current = nextValue;
  }, [
    field,
    resetToken,
    sale.id,
    sale.shipping_cost,
    sale.unit_purchase_price,
  ]);

  function persistOriginalValue() {
    return field === "purchase_price"
      ? Number(sale.unit_purchase_price) || 0
      : Number(sale.shipping_cost) || 0;
  }

  return (
    <PriceInput
      value={value}
      disabled={disabled}
      onFocus={() => {
        isEditingRef.current = true;
      }}
      onChange={(nextValue) => {
        const normalized = Math.max(0, Math.round(nextValue));
        latestRef.current = normalized;
        setValue(normalized);
        onDraftChange?.(sale.id, normalized);
      }}
      onBlur={() => {
        void (async () => {
          const originalValue = persistOriginalValue();
          const nextValue = Math.max(0, Math.round(latestRef.current));

          if (nextValue === Math.max(0, Math.round(originalValue))) {
            isEditingRef.current = false;
            return;
          }

          const result = await onSave(sale.id, nextValue);
          isEditingRef.current = false;
          if (result?.error) {
            setResetToken((current) => current + 1);
          }
        })();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      className={inputClassName}
      aria-label={ariaLabel}
    />
  );
}

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, SaleFieldOverrides>>(
    {},
  );
  const [savingPurchasePriceId, setSavingPurchasePriceId] = useState<
    string | null
  >(null);
  const [savingShippingCostId, setSavingShippingCostId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isBulkDeleting, startBulkDeleteTransition] = useTransition();
  const [, startPurchasePriceTransition] = useTransition();
  const [, startShippingCostTransition] = useTransition();

  useEffect(() => {
    setOverrides({});
  }, [sales]);

  function resolveSale(sale: SaleWithProduct) {
    const patch = overrides[sale.id];
    return patch ? { ...sale, ...patch } : sale;
  }

  function patchSale(sale: SaleWithProduct, patch: SaleFieldOverrides) {
    setOverrides((current) => ({
      ...current,
      [sale.id]: { ...current[sale.id], ...patch },
    }));
  }

  function patchMarginForField(
    sale: SaleWithProduct,
    field: "purchase_price" | "shipping_cost",
    value: number,
  ) {
    if (field === "purchase_price") {
      patchSale(sale, { unit_purchase_price: value });
      return;
    }

    patchSale(sale, { shipping_cost: value });
  }

  function openEditModal(sale: SaleWithProduct) {
    setEditingSale(sales.find((entry) => entry.id === sale.id) ?? sale);
  }

  function clearSaleOverride(saleId: string) {
    setOverrides((current) => {
      if (!current[saleId]) return current;
      const next = { ...current };
      delete next[saleId];
      return next;
    });
  }

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
  const tableMinWidth =
    orderedColumns.reduce((sum, column) => sum + widths[column.id], 0) +
    (canManageSales ? 40 : 0);
  const tableStyle = { minWidth: tableMinWidth };

  const allSelected = sales.length > 0 && selectedIds.size === sales.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  function toggleAll(checked: boolean) {
    setSelectedIds(
      checked ? new Set(sales.map((sale) => sale.id)) : new Set(),
    );
  }

  function toggleOne(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  const colGroup = (
    <colgroup>
      {canManageSales ? <col style={{ width: "40px" }} /> : null}
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
    const displaySale = resolveSale(sale);

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
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            {canManageSales ? (
              <SaleInlinePriceCell
                sale={sale}
                field="purchase_price"
                disabled={savingPurchasePriceId === sale.id}
                inputClassName={inlineInputClass}
                ariaLabel={`${sale.products?.model_name ?? "매출"} 매입가`}
                onDraftChange={(saleId, value) => {
                  const target = sales.find((entry) => entry.id === saleId);
                  if (target) patchMarginForField(target, "purchase_price", value);
                }}
                onSave={savePurchasePrice}
              />
            ) : (
              <span className="block truncate text-right tabular-nums">
                {formatKRW(displaySale.unit_purchase_price)}원
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
      case "shipping_cost":
        return (
          <td
            className={`${
              canManageSales ? editableCellClass : cellClass
            } text-orange-700 dark:text-orange-300`}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            {canManageSales ? (
              <SaleInlinePriceCell
                sale={sale}
                field="shipping_cost"
                disabled={savingShippingCostId === sale.id}
                inputClassName={inlineInputClass}
                ariaLabel={`${sale.products?.model_name ?? "매출"} 업체 배송비`}
                onDraftChange={(saleId, value) => {
                  const target = sales.find((entry) => entry.id === saleId);
                  if (target) patchMarginForField(target, "shipping_cost", value);
                }}
                onSave={saveShippingCost}
              />
            ) : (
              <span className="block truncate text-right tabular-nums">
                {Number(displaySale.shipping_cost) > 0
                  ? `-${formatKRW(displaySale.shipping_cost)}원`
                  : `${formatKRW(0)}원`}
              </span>
            )}
          </td>
        );
      case "margin":
        return (
          <td className={`${cellClass} font-semibold text-green-700 dark:text-green-300`}>
            {formatKRW(getDisplayMargin(displaySale))}원
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
                  openEditModal(sale);
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

  function savePurchasePrice(
    saleId: string,
    nextValue: number,
  ): Promise<{ error?: string } | void> {
    const sale = sales.find((entry) => entry.id === saleId);
    if (!sale) return Promise.resolve();

    const unitPurchasePrice = Math.max(0, Math.round(nextValue));
    setSavingPurchasePriceId(saleId);
    setError(null);
    patchMarginForField(sale, "purchase_price", unitPurchasePrice);

    return new Promise((resolve) => {
      startPurchasePriceTransition(async () => {
        const result = await updateSalePurchasePrice(saleId, unitPurchasePrice);
        setSavingPurchasePriceId(null);
        if (result.error) {
          setError(result.error);
          clearSaleOverride(saleId);
          resolve({ error: result.error });
          return;
        }

        router.refresh();
        resolve();
      });
    });
  }

  function saveShippingCost(
    saleId: string,
    nextValue: number,
  ): Promise<{ error?: string } | void> {
    const sale = sales.find((entry) => entry.id === saleId);
    if (!sale) return Promise.resolve();

    const shippingCost = Math.max(0, Math.round(nextValue));
    setSavingShippingCostId(saleId);
    setError(null);
    patchMarginForField(sale, "shipping_cost", shippingCost);

    return new Promise((resolve) => {
      startShippingCostTransition(async () => {
        const result = await updateSaleShippingCost(saleId, shippingCost);
        setSavingShippingCostId(null);
        if (result.error) {
          setError(result.error);
          clearSaleOverride(saleId);
          resolve({ error: result.error });
          return;
        }

        router.refresh();
        resolve();
      });
    });
  }

  function handleBulkDeleteConfirm() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    setError(null);
    startBulkDeleteTransition(async () => {
      const result = await deleteSales(ids);
      if (result.error && !result.deleted) {
        setError(result.error);
        return;
      }

      setBulkDeleteOpen(false);
      setSelectedIds(new Set());
      if (editingSale && ids.includes(editingSale.id)) {
        setEditingSale(null);
      }
      if (result.errors?.length) {
        setError(
          `${result.deleted ?? 0}건 삭제 · ${result.errors.slice(0, 2).join(" · ")}`,
        );
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
      {canManageSales ? (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={selectedIds.size === 0 || isBulkDeleting}
            onClick={() => setBulkDeleteOpen(true)}
            className={bulkDeleteButtonClass}
          >
            {isBulkDeleting
              ? "삭제 중..."
              : selectedIds.size > 0
                ? `삭제 (${selectedIds.size})`
                : "삭제"}
          </button>
        </div>
      ) : null}

      <div className="mt-2 overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <table className={tableClassName} style={tableStyle}>
          {colGroup}
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <tr>
              {canManageSales ? (
                <th className={`${checkboxCellClass} ${headerPaddingClass}`}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(element) => {
                      if (element) element.indeterminate = someSelected;
                    }}
                    onChange={(event) => toggleAll(event.target.checked)}
                    aria-label="현재 페이지 매출 전체 선택"
                  />
                </th>
              ) : null}
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
                  colSpan={orderedColumns.length + (canManageSales ? 1 : 0)}
                  className="px-3 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  {emptyMessage ?? "표시할 판매 기록이 없습니다."}
                </td>
              </tr>
            ) : null}
            {sales.map((sale) => (
              <tr
                key={sale.id}
                onDoubleClick={canManageSales ? () => openEditModal(sale) : undefined}
                title={canManageSales ? "더블클릭하여 수정" : undefined}
                className={`border-b border-zinc-100 transition last:border-0 dark:border-zinc-800 ${
                  canManageSales
                    ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    : ""
                } ${selectedIds.has(sale.id) ? "bg-blue-50/40 dark:bg-blue-950/20" : ""}`}
              >
                {canManageSales ? (
                  <td
                    className={checkboxCellClass}
                    onClick={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(sale.id)}
                      onChange={(event) => toggleOne(sale.id, event.target.checked)}
                      aria-label={`${sale.products?.model_name ?? "매출"} 선택`}
                    />
                  </td>
                ) : null}
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
          key={editingSale.id}
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

      {bulkDeleteOpen ? (
        <DeleteConfirmDialog
          count={selectedIds.size}
          onCancel={() => {
            if (!isBulkDeleting) setBulkDeleteOpen(false);
          }}
          onConfirm={handleBulkDeleteConfirm}
        />
      ) : null}
    </>
  );
}
