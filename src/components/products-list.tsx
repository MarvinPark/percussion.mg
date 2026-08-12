"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProductInlineField } from "@/app/(main)/products/actions";
import EditableProductCell from "@/components/editable-product-cell";
import KeyStockStarToggle from "@/components/key-stock-star-toggle";
import ResizableHeaderCell from "@/components/resizable-header-cell";
import { useProductColumnWidths } from "@/hooks/use-product-column-widths";
import { PRODUCT_TABLE_COLUMNS } from "@/lib/product-table-columns";
import { isLowStockProduct } from "@/lib/product-stock";
import {
  getNextTableFocus,
  tableFocusRingClass,
  type TableFocusState,
} from "@/lib/product-table-navigation";
import type { Product } from "@/types/product";
import { formatKRW } from "@/lib/sales-calculator";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const actionButtonClass =
  "rounded border border-zinc-300 px-1.5 py-0.5 text-[12px] leading-none font-normal text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800";

const deleteButtonClass =
  "rounded bg-red-600 px-1.5 py-0.5 text-[12px] leading-none font-normal text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400";

const stickyTableHeaderCornerClass =
  "sticky left-0 z-30 bg-zinc-50 dark:bg-zinc-800";
const stickyTableHeaderKeyStockClass =
  "sticky left-[44px] z-30 bg-zinc-50 dark:bg-zinc-800";
const stickyTableHeaderCellClass =
  "bg-zinc-50 dark:bg-zinc-800";

const tableClassName =
  "w-full text-sm max-md:min-w-[720px] md:table-fixed";
const horizontalScrollClass =
  "overflow-x-auto overscroll-x-contain";
const hiddenScrollbarClass =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

type ProductsListProps = {
  userId: string;
  products: Product[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  highlightedIds: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onCopyProducts: (products: Product[]) => void;
  onPaste: () => void;
  onRequestDelete: (products: Product[]) => void;
  hasClipboard: boolean;
  isPasting: boolean;
  readOnly?: boolean;
};

type ContextMenuState = {
  x: number;
  y: number;
  product: Product;
};

function displayText(value: string | null) {
  return value?.trim() ? value : "-";
}

function toggleSelection(
  selectedIds: Set<string>,
  productId: string,
  checked: boolean,
  onSelectionChange: (ids: Set<string>) => void,
) {
  const next = new Set(selectedIds);
  if (checked) {
    next.add(productId);
  } else {
    next.delete(productId);
  }
  onSelectionChange(next);
}

function ProductDetailModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const fields: { label: string; value: string; fullWidth?: boolean }[] = [
    { label: "공급처", value: product.supplier, fullWidth: true },
    { label: "품목", value: product.category ?? "-" },
    { label: "브랜드", value: product.brand ?? "-" },
    { label: "제품명", value: product.product_name },
    { label: "모델명", value: product.model_name },
    { label: "SKU", value: product.sku },
    { label: "색상", value: product.color ?? "-" },
    { label: "옵션", value: product.product_option ?? "-" },
    { label: "사이즈", value: product.size ?? "-" },
    { label: "매입가", value: `${formatKRW(product.purchase_price)}원` },
    { label: "소비자가", value: `${formatKRW(product.sale_price)}원` },
    { label: "현재고(3층)", value: `${product.stock_floor3 ?? 0}개` },
    { label: "현재고(B1)", value: `${product.stock_b1 ?? 0}개` },
    { label: "현재고(의왕)", value: `${product.stock_display ?? 0}개` },
    { label: "재고 합계", value: `${product.stock_quantity}개` },
    { label: "재고 위치", value: product.stock_location ?? "3층" },
    { label: "주요 재고", value: product.is_key_stock ? "예" : "아니오" },
    { label: "최소알림", value: `${product.min_stock_quantity}개` },
    { label: "등록일", value: formatDate(product.created_at) },
    { label: "수정일", value: formatDate(product.updated_at) },
  ];

  const isLowStock = isLowStockProduct(product);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {product.product_name}
            </h3>
            <p className="mt-0.5 break-words text-sm font-normal text-zinc-600 dark:text-zinc-400">
              {product.model_name}
            </p>
          </div>
        </div>

        {isLowStock ? (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-normal text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            재고 부족 — 현재 {product.stock_quantity}개 (최소{" "}
            {product.min_stock_quantity}개)
          </p>
        ) : null}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {fields.map((field) => (
            <div
              key={field.label}
              className={field.fullWidth ? "col-span-2" : undefined}
            >
              <dt className="font-semibold text-zinc-600 dark:text-zinc-400">
                {field.label}
              </dt>
              <dd className="mt-0.5 break-words whitespace-normal font-normal text-zinc-900 dark:text-zinc-100">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <Link
            href={`/products/stock?product=${product.id}`}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-normal text-white hover:bg-blue-700 dark:bg-blue-500"
          >
            입고/출고
          </Link>
          <Link
            href={`/products/${product.id}/edit`}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-normal text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            전체 수정
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-normal text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductContextMenu({
  menu,
  products,
  selectedIds,
  hasClipboard,
  isPasting,
  onCopyProducts,
  onPaste,
  onRequestDelete,
  onDetail,
  onClose,
  readOnly = false,
}: {
  menu: ContextMenuState;
  products: Product[];
  selectedIds: Set<string>;
  hasClipboard: boolean;
  isPasting: boolean;
  onCopyProducts: (products: Product[]) => void;
  onPaste: () => void;
  onRequestDelete: (products: Product[]) => void;
  onDetail: (product: Product) => void;
  onClose: () => void;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const { product, x, y } = menu;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("[data-product-context-menu]")
      ) {
        return;
      }
      onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [onClose]);

  const menuItemClass =
    "block w-full px-3 py-1.5 text-left text-[13px] font-normal";
  const menuItemActive =
    "text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800";
  const menuItemDisabled =
    "cursor-not-allowed text-zinc-400 dark:text-zinc-500";

  function handleCopy() {
    const toCopy =
      selectedIds.has(product.id) && selectedIds.size > 0
        ? products.filter((item) => selectedIds.has(item.id))
        : [product];
    onCopyProducts(toCopy);
    onClose();
  }

  function handlePaste() {
    if (!hasClipboard || isPasting) return;
    onPaste();
    onClose();
  }

  function handleEdit() {
    router.push(`/products/${product.id}/edit`);
    onClose();
  }

  function handleDelete() {
    const toDelete =
      selectedIds.has(product.id) && selectedIds.size > 0
        ? products.filter((item) => selectedIds.has(item.id))
        : [product];
    onRequestDelete(toDelete);
    onClose();
  }

  function handleDetail() {
    onDetail(product);
    onClose();
  }

  return (
    <div
      data-product-context-menu
      className="fixed z-[70] min-w-[148px] overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
      style={{ left: x, top: y }}
      onContextMenu={(event) => event.preventDefault()}
    >
        {readOnly ? (
          <button type="button" onClick={handleDetail} className={`${menuItemClass} ${menuItemActive}`}>
            상세보기
          </button>
        ) : (
          <>
        <button type="button" onClick={handleCopy} className={`${menuItemClass} ${menuItemActive}`}>
          복사
        </button>
        <button
          type="button"
          onClick={handlePaste}
          disabled={!hasClipboard || isPasting}
          className={`${menuItemClass} ${
            hasClipboard && !isPasting ? menuItemActive : menuItemDisabled
          }`}
        >
          붙여넣기
        </button>
        <div className="my-1 border-t border-zinc-200 dark:border-zinc-700" />
        <button type="button" onClick={handleEdit} className={`${menuItemClass} ${menuItemActive}`}>
          수정
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className={`${menuItemClass} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40`}
        >
          삭제
        </button>
        <button type="button" onClick={handleDetail} className={`${menuItemClass} ${menuItemActive}`}>
        상세보기
      </button>
          </>
        )}
    </div>
  );
}

export default function ProductsList({
  userId,
  products,
  selectedIds,
  onSelectionChange,
  highlightedIds,
  allSelected,
  someSelected,
  onSelectAll,
  onCopyProducts,
  onPaste,
  onRequestDelete,
  hasClipboard,
  isPasting,
  readOnly = false,
}: ProductsListProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [focusTarget, setFocusTarget] = useState<TableFocusState | null>(null);
  const checkboxRefs = useRef(new Map<string, HTMLInputElement>());
  const editRefs = useRef(new Map<string, HTMLAnchorElement>());
  const deleteRefs = useRef(new Map<string, HTMLButtonElement>());
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const syncingScrollRef = useRef(false);
  const { widths, startResize, tableMinWidth } = useProductColumnWidths(userId);
  const tableColumns = useMemo(
    () =>
      readOnly
        ? PRODUCT_TABLE_COLUMNS.filter((column) => column.id !== "actions")
        : PRODUCT_TABLE_COLUMNS,
    [readOnly],
  );

  const navigateFocus = useCallback(
    (from: TableFocusState, direction: "forward" | "backward") => {
      const next = getNextTableFocus(from, products, direction);
      if (next) setFocusTarget(next);
    },
    [products],
  );

  const syncBodyScroll = useCallback(() => {
    if (
      syncingScrollRef.current ||
      !headerScrollRef.current ||
      !bodyScrollRef.current
    ) {
      return;
    }

    syncingScrollRef.current = true;
    bodyScrollRef.current.scrollLeft = headerScrollRef.current.scrollLeft;
    syncingScrollRef.current = false;
  }, []);

  const syncHeaderScroll = useCallback(() => {
    if (
      syncingScrollRef.current ||
      !headerScrollRef.current ||
      !bodyScrollRef.current
    ) {
      return;
    }

    syncingScrollRef.current = true;
    headerScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft;
    syncingScrollRef.current = false;
  }, []);

  useEffect(() => {
    if (!focusTarget || focusTarget.kind === "field") return;

    if (focusTarget.kind === "checkbox") {
      checkboxRefs.current.get(focusTarget.productId)?.focus();
    } else if (focusTarget.kind === "edit") {
      editRefs.current.get(focusTarget.productId)?.focus();
    } else if (focusTarget.kind === "delete") {
      deleteRefs.current.get(focusTarget.productId)?.focus();
    }
  }, [focusTarget]);

  function cellFocusProps(productId: string, field: ProductInlineField) {
    const isEditing =
      focusTarget?.kind === "field" &&
      focusTarget.productId === productId &&
      focusTarget.field === field &&
      !!focusTarget.editing;

    const isFocused =
      focusTarget?.kind === "field" &&
      focusTarget.productId === productId &&
      focusTarget.field === field;

    return {
      isEditing,
      isFocused,
      onRequestEdit: () =>
        setFocusTarget({ kind: "field", productId, field, editing: true }),
      onFinishEdit: () =>
        setFocusTarget((prev) =>
          prev?.kind === "field" &&
          prev.productId === productId &&
          prev.field === field
            ? { kind: "field", productId, field, editing: false }
            : prev,
        ),
      onNavigate: (direction: "forward" | "backward") =>
        navigateFocus({ kind: "field", productId, field }, direction),
      ...(readOnly ? { readOnly: true as const } : {}),
    };
  }

  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  function handleRowClick(event: React.MouseEvent, product: Product) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select")) return;

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

    clickTimerRef.current = setTimeout(() => {
      onSelectionChange(new Set([product.id]));
      clickTimerRef.current = null;
    }, 200);
  }

  function handleCellDoubleClick(event: React.MouseEvent, product: Product) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select, [data-editable-cell]")) {
      return;
    }

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    event.preventDefault();
    event.stopPropagation();
    setSelectedProduct(product);
  }

  function openContextMenu(event: React.MouseEvent, product: Product) {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      product,
    });
  }

  const rowClass = (product: Product) => {
    const isSelected = selectedIds.has(product.id);
    const isKeyStock = product.is_key_stock ?? false;

    const base =
      "cursor-pointer border-b border-zinc-100 transition last:border-0 dark:border-zinc-800";
    const highlight = highlightedIds.has(product.id) ? "paste-row-highlight" : "";

    if (isSelected) {
      return `${base} bg-yellow-100 hover:bg-yellow-100 dark:bg-yellow-950/50 dark:hover:bg-yellow-950/50 ${highlight}`;
    }

    if (isKeyStock) {
      return `${base} bg-red-50/80 hover:bg-red-100/70 dark:bg-red-950/25 dark:hover:bg-red-950/40 ${highlight}`;
    }

    return `${base} hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${highlight}`;
  };

  function stickyCheckboxCellClass(product: Product) {
    const selected = selectedIds.has(product.id);
    const isKeyStock = product.is_key_stock ?? false;

    let bg = "max-md:bg-white dark:max-md:bg-zinc-900";
    if (selected) {
      bg = "max-md:bg-yellow-100 dark:max-md:bg-yellow-950/50";
    } else if (isKeyStock) {
      bg = "max-md:bg-red-50/80 dark:max-md:bg-red-950/25";
    }

    return `px-2 py-1.5 max-md:sticky max-md:left-0 max-md:z-10 ${bg}`;
  }

  function stickyKeyStockCellClass(product: Product) {
    const selected = selectedIds.has(product.id);
    const isKeyStock = product.is_key_stock ?? false;

    let bg = "max-md:bg-white dark:max-md:bg-zinc-900";
    if (selected) {
      bg = "max-md:bg-yellow-100 dark:max-md:bg-yellow-950/50";
    } else if (isKeyStock) {
      bg = "max-md:bg-red-50/80 dark:max-md:bg-red-950/25";
    }

    return `px-1 py-1.5 max-md:sticky max-md:left-[44px] max-md:z-10 ${bg}`;
  }

  const narrowScrollCellClass =
    "px-3 py-1.5 font-normal text-zinc-900 dark:text-zinc-100 max-md:min-w-[5.5rem] max-md:whitespace-nowrap";
  const narrowScrollProductCellClass =
    "px-3 py-1.5 font-normal text-zinc-900 dark:text-zinc-100 max-md:min-w-[9rem] max-md:whitespace-nowrap";

  const headerCellClass =
    "whitespace-nowrap px-3 py-2 font-semibold";
  const priceHeaderCellClass =
    "whitespace-nowrap px-3 py-2 font-normal";

  const tableStyle = { minWidth: tableMinWidth };

  const colGroup = (
    <colgroup className="max-md:hidden">
      {tableColumns.map((column) => (
        <col key={column.id} style={{ width: `${widths[column.id]}px` }} />
      ))}
    </colgroup>
  );

  const headerRow = (
    <tr>
      {tableColumns.map((column) => {
        if (column.id === "checkbox") {
          return (
            <ResizableHeaderCell
              key={column.id}
              columnId={column.id}
              label=""
              resizable={column.resizable}
              className={`${stickyTableHeaderCornerClass} px-2 py-2 font-semibold shadow-[inset_0_-1px_0_0_rgb(228_228_231)] dark:shadow-[inset_0_-1px_0_0_rgb(63_63_70)]`}
              onResizeStart={startResize}
            >
              <input
                type="checkbox"
                checked={allSelected}
                ref={(input) => {
                  if (input) input.indeterminate = someSelected;
                }}
                onChange={(event) => onSelectAll(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
                aria-label="전체 선택"
              />
            </ResizableHeaderCell>
          );
        }

        if (column.id === "key_stock") {
          return (
            <ResizableHeaderCell
              key={column.id}
              columnId={column.id}
              label=""
              resizable={column.resizable}
              className={`${stickyTableHeaderKeyStockClass} px-1 py-2 font-semibold shadow-[inset_0_-1px_0_0_rgb(228_228_231)] dark:shadow-[inset_0_-1px_0_0_rgb(63_63_70)]`}
              onResizeStart={startResize}
            />
          );
        }

        const isPriceColumn =
          column.id === "purchase_price" || column.id === "sale_price";

        return (
          <ResizableHeaderCell
            key={column.id}
            columnId={column.id}
            label={column.label}
            resizable={column.resizable}
            className={`${stickyTableHeaderCellClass} shadow-[inset_0_-1px_0_0_rgb(228_228_231)] dark:shadow-[inset_0_-1px_0_0_rgb(63_63_70)] ${
              isPriceColumn ? priceHeaderCellClass : headerCellClass
            }`}
            onResizeStart={startResize}
          />
        );
      })}
    </tr>
  );

  return (
    <>
      <div className="max-w-full rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div className="sticky top-[var(--app-header-height)] z-20 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
          <div
            ref={headerScrollRef}
            onScroll={syncBodyScroll}
            className={`${horizontalScrollClass} ${hiddenScrollbarClass}`}
          >
            <table className={tableClassName} style={tableStyle}>
              {colGroup}
              <thead className="text-left text-zinc-800 dark:text-zinc-200">
                {headerRow}
              </thead>
            </table>
          </div>
        </div>

        <div
          ref={bodyScrollRef}
          onScroll={syncHeaderScroll}
          className={horizontalScrollClass}
        >
          <table className={tableClassName} style={tableStyle}>
            {colGroup}
            <tbody className="font-normal">
            {products.map((product) => {
              const isLowStock = isLowStockProduct(product);

              return (
                <tr
                  key={product.id}
                  id={`product-row-${product.id}`}
                  onClick={(event) => handleRowClick(event, product)}
                  onContextMenu={(event) => openContextMenu(event, product)}
                  className={rowClass(product)}
                >
                  <td
                    className={stickyCheckboxCellClass(product)}
                    onClick={(event) => event.stopPropagation()}
                    onContextMenu={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      ref={(element) => {
                        if (element) {
                          checkboxRefs.current.set(product.id, element);
                        } else {
                          checkboxRefs.current.delete(product.id);
                        }
                      }}
                      checked={selectedIds.has(product.id)}
                      onChange={(event) =>
                        toggleSelection(
                          selectedIds,
                          product.id,
                          event.target.checked,
                          onSelectionChange,
                        )
                      }
                      tabIndex={-1}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                        if (event.key === "Tab") {
                          event.preventDefault();
                          navigateFocus(
                            { kind: "checkbox", productId: product.id },
                            event.shiftKey ? "backward" : "forward",
                          );
                        }
                      }}
                      className={`h-4 w-4 rounded border-zinc-300 ${
                        focusTarget?.kind === "checkbox" &&
                        focusTarget.productId === product.id
                          ? tableFocusRingClass
                          : ""
                      }`}
                      aria-label={`${product.product_name} 선택`}
                    />
                  </td>
                  <td
                    className={stickyKeyStockCellClass(product)}
                    onClick={(event) => event.stopPropagation()}
                    onContextMenu={(event) => event.stopPropagation()}
                  >
                    <KeyStockStarToggle
                      productId={product.id}
                      productName={product.product_name}
                      isKeyStock={product.is_key_stock ?? false}
                      readOnly={readOnly}
                    />
                  </td>
                  <td
                    className={narrowScrollCellClass}
                    onDoubleClick={(event) => handleCellDoubleClick(event, product)}
                  >
                    <EditableProductCell
                      productId={product.id}
                      field="supplier"
                      value={product.supplier}
                      {...cellFocusProps(product.id, "supplier")}
                    />
                  </td>
                  <td
                    className={narrowScrollCellClass}
                    onDoubleClick={(event) => handleCellDoubleClick(event, product)}
                  >
                    <EditableProductCell
                      productId={product.id}
                      field="category"
                      value={product.category ?? ""}
                      displayValue={displayText(product.category)}
                      {...cellFocusProps(product.id, "category")}
                    />
                  </td>
                  <td
                    className={narrowScrollCellClass}
                    onDoubleClick={(event) => handleCellDoubleClick(event, product)}
                  >
                    <EditableProductCell
                      productId={product.id}
                      field="brand"
                      value={product.brand ?? ""}
                      displayValue={displayText(product.brand)}
                      {...cellFocusProps(product.id, "brand")}
                    />
                  </td>
                  <td
                    className={narrowScrollProductCellClass}
                    onDoubleClick={(event) => handleCellDoubleClick(event, product)}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <EditableProductCell
                        productId={product.id}
                        field="product_name"
                        value={product.product_name}
                        className="truncate"
                        {...cellFocusProps(product.id, "product_name")}
                      />
                      {isLowStock ? (
                        <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-normal text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          부족
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td
                    className="truncate px-3 py-1.5 font-normal text-zinc-900 dark:text-zinc-100"
                    onDoubleClick={(event) => handleCellDoubleClick(event, product)}
                  >
                    <EditableProductCell
                      productId={product.id}
                      field="model_name"
                      value={product.model_name}
                      {...cellFocusProps(product.id, "model_name")}
                    />
                  </td>
                  <td
                    className="truncate px-3 py-1.5 font-normal text-zinc-900 dark:text-zinc-100"
                    onDoubleClick={(event) => handleCellDoubleClick(event, product)}
                  >
                    <EditableProductCell
                      productId={product.id}
                      field="sku"
                      value={product.sku}
                      {...cellFocusProps(product.id, "sku")}
                    />
                  </td>
                  <td
                    className="px-3 py-1.5 font-normal text-zinc-900 dark:text-zinc-100"
                    onDoubleClick={(event) => handleCellDoubleClick(event, product)}
                    onContextMenu={(event) => event.stopPropagation()}
                  >
                    <EditableProductCell
                      productId={product.id}
                      field="stock_floor3"
                      value={String(product.stock_floor3 ?? 0)}
                      inputType="number"
                      {...cellFocusProps(product.id, "stock_floor3")}
                    />
                  </td>
                  <td
                    className="px-3 py-1.5 font-normal text-zinc-900 dark:text-zinc-100"
                    onDoubleClick={(event) => handleCellDoubleClick(event, product)}
                    onContextMenu={(event) => event.stopPropagation()}
                  >
                    <EditableProductCell
                      productId={product.id}
                      field="stock_b1"
                      value={String(product.stock_b1 ?? 0)}
                      inputType="number"
                      {...cellFocusProps(product.id, "stock_b1")}
                    />
                  </td>
                  <td
                    className="px-3 py-1.5 font-normal text-zinc-900 dark:text-zinc-100"
                    onDoubleClick={(event) => handleCellDoubleClick(event, product)}
                    onContextMenu={(event) => event.stopPropagation()}
                  >
                    <EditableProductCell
                      productId={product.id}
                      field="stock_display"
                      value={String(product.stock_display ?? 0)}
                      inputType="number"
                      {...cellFocusProps(product.id, "stock_display")}
                    />
                  </td>
                  <td
                    className="px-3 py-1.5 font-semibold text-zinc-900 dark:text-zinc-100"
                    onDoubleClick={(event) => handleCellDoubleClick(event, product)}
                    onContextMenu={(event) => event.stopPropagation()}
                  >
                    <EditableProductCell
                      productId={product.id}
                      field="stock_quantity"
                      value={String(product.stock_quantity)}
                      displayValue={String(product.stock_quantity)}
                      inputType="number"
                      {...cellFocusProps(product.id, "stock_quantity")}
                    />
                  </td>
                  <td
                    className="whitespace-nowrap px-3 py-1.5 font-normal text-zinc-900 dark:text-zinc-100"
                    onDoubleClick={(event) => handleCellDoubleClick(event, product)}
                  >
                    <EditableProductCell
                      productId={product.id}
                      field="purchase_price"
                      value={String(product.purchase_price)}
                      displayValue={`${formatKRW(product.purchase_price)}원`}
                      inputType="number"
                      formatAsPrice
                      {...cellFocusProps(product.id, "purchase_price")}
                    />
                  </td>
                  <td
                    className="whitespace-nowrap px-3 py-1.5 font-normal text-zinc-900 dark:text-zinc-100"
                    onDoubleClick={(event) => handleCellDoubleClick(event, product)}
                  >
                    <EditableProductCell
                      productId={product.id}
                      field="sale_price"
                      value={String(product.sale_price)}
                      displayValue={`${formatKRW(product.sale_price)}원`}
                      inputType="number"
                      formatAsPrice
                      {...cellFocusProps(product.id, "sale_price")}
                    />
                  </td>
                  {!readOnly ? (
                  <td
                    className="px-3 py-1.5"
                    onClick={(event) => event.stopPropagation()}
                    onContextMenu={(event) => event.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5">
                      <Link
                        ref={(element) => {
                          if (element) {
                            editRefs.current.set(product.id, element);
                          } else {
                            editRefs.current.delete(product.id);
                          }
                        }}
                        href={`/products/${product.id}/edit`}
                        tabIndex={-1}
                        onKeyDown={(event) => {
                          event.stopPropagation();
                          if (event.key === "Tab") {
                            event.preventDefault();
                            navigateFocus(
                              { kind: "edit", productId: product.id },
                              event.shiftKey ? "backward" : "forward",
                            );
                          }
                        }}
                        className={`${actionButtonClass} ${
                          focusTarget?.kind === "edit" &&
                          focusTarget.productId === product.id
                            ? tableFocusRingClass
                            : ""
                        }`}
                      >
                        수정
                      </Link>
                      <button
                        type="button"
                        ref={(element) => {
                          if (element) {
                            deleteRefs.current.set(product.id, element);
                          } else {
                            deleteRefs.current.delete(product.id);
                          }
                        }}
                        tabIndex={-1}
                        onClick={() => onRequestDelete([product])}
                        onKeyDown={(event) => {
                          event.stopPropagation();
                          if (event.key === "Tab") {
                            event.preventDefault();
                            navigateFocus(
                              { kind: "delete", productId: product.id },
                              event.shiftKey ? "backward" : "forward",
                            );
                          }
                        }}
                        className={`${deleteButtonClass} ${
                          focusTarget?.kind === "delete" &&
                          focusTarget.productId === product.id
                            ? tableFocusRingClass
                            : ""
                        }`}
                        aria-label="삭제"
                      >
                        -
                      </button>
                    </div>
                  </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {contextMenu ? (
        <ProductContextMenu
          menu={contextMenu}
          products={products}
          selectedIds={selectedIds}
          hasClipboard={hasClipboard}
          isPasting={isPasting}
          onCopyProducts={onCopyProducts}
          onPaste={onPaste}
          onRequestDelete={onRequestDelete}
          onDetail={setSelectedProduct}
          onClose={() => setContextMenu(null)}
          readOnly={readOnly}
        />
      ) : null}

      {selectedProduct ? (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      ) : null}
    </>
  );
}
