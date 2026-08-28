"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProductInlineField } from "@/app/(main)/products/actions";
import EditableProductCell from "@/components/editable-product-cell";
import KeyStockStarToggle from "@/components/key-stock-star-toggle";
import ResizableHeaderCell from "@/components/resizable-header-cell";
import TableRowSizeControl, {
  fontControlBoxClass,
  fontControlButtonClass,
} from "@/components/table-row-size-control";
import ProductInlineRegisterPanel from "@/components/product-inline-register-panel";
import InlineProductCreateModal from "@/components/inline-product-create-modal";
import { useProductColumnOrder } from "@/hooks/use-product-column-order";
import { useProductColumnWidths } from "@/hooks/use-product-column-widths";
import { isReorderableProductColumn } from "@/lib/product-table-column-order";
import { PRODUCT_TABLE_COLUMNS, type ProductTableColumnId } from "@/lib/product-table-columns";
import {
  getSortDirectionForColumn,
  isSortableProductColumn,
  type ProductListSort,
  type ProductSortColumn,
} from "@/lib/product-list-sort";
import { isLowStockProduct } from "@/lib/product-stock";
import ProductReservationList from "@/components/product-reservation-list";
import { availableProductStock } from "@/lib/product-stock-display";
import type { ProductReservationsByProductId } from "@/lib/product-reservations";
import {
  getNextTableFocus,
  TABLE_FIELD_ORDER,
  tableFocusRingClass,
  type TableFocusState,
} from "@/lib/product-table-navigation";
import {
  DEFAULT_TABLE_ROW_FONT_SIZE,
  getTableHeaderPaddingClass,
  getTableRowPaddingClass,
  loadTableRowFontSize,
  saveTableRowFontSize,
} from "@/lib/table-row-preferences";
import {
  alertAccentInline,
  btnPrimarySm,
  btnSecondarySm,
} from "@/lib/ui-classes";
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
  "w-full table-fixed max-md:min-w-[720px]";
const horizontalScrollClass =
  "overflow-x-auto overscroll-x-contain";
const hiddenScrollbarClass =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

type ProductsListProps = {
  userId: string;
  products: Product[];
  reservationsByProductId?: ProductReservationsByProductId;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  highlightedIds: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onDuplicateProducts: (products: Product[]) => void;
  onRequestDelete: (products: Product[]) => void;
  isDuplicating: boolean;
  readOnly?: boolean;
  sort: ProductListSort;
  onSortColumn: (column: ProductSortColumn) => void;
  emptyMessage?: string;
  onProductRegistered?: (productId: string) => void;
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

function getEditableFieldOrder(columnIds: ProductTableColumnId[]) {
  const editable = new Set<ProductInlineField>(TABLE_FIELD_ORDER);
  return columnIds.filter((columnId): columnId is ProductInlineField =>
    editable.has(columnId as ProductInlineField),
  );
}

function ProductDetailModal({
  product,
  reservationEntries,
  onClose,
}: {
  product: Product;
  reservationEntries: ProductReservationsByProductId[string];
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
    { label: "예약", value: `${product.reserved_quantity ?? 0}개` },
    {
      label: "가용",
      value: `${availableProductStock(product)}개`,
    },
    { label: "실재고 합계", value: `${product.stock_quantity}개` },
    { label: "재고 위치", value: product.stock_location ?? "3층" },
    { label: "주요 재고", value: product.is_key_stock ? "예" : "아니오" },
    { label: "최소알림", value: `${product.min_stock_quantity}개` },
    { label: "등록일", value: formatDate(product.created_at) },
    { label: "수정일", value: formatDate(product.updated_at) },
  ];

  const isLowStock = isLowStockProduct(product);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 max-md:items-end max-md:pb-28 max-md:pt-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-detail-title"
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-xl max-md:max-h-[min(75vh,calc(100dvh-7rem))] dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3
              id="product-detail-title"
              className="break-words text-lg font-semibold text-zinc-900 dark:text-zinc-100"
            >
              {product.product_name}
            </h3>
            <p className="mt-0.5 break-words text-sm font-normal text-zinc-600 dark:text-zinc-400">
              {product.model_name}
            </p>
          </div>
        </div>

        {isLowStock ? (
          <p className={`mb-4 ${alertAccentInline}`}>
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

        {reservationEntries.length > 0 ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/40 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/20">
            <p className="mb-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              예약 견적
            </p>
            <ProductReservationList entries={reservationEntries} />
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <Link
            href={`/products/stock?product=${product.id}`}
            className={btnPrimarySm}
          >
            입고기록
          </Link>
          <Link
            href={`/products/${product.id}/edit`}
            className={btnSecondarySm}
          >
            전체 수정
          </Link>
          <button
            type="button"
            onClick={onClose}
            className={btnSecondarySm}
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
  onDuplicateProducts,
  onRequestDelete,
  isDuplicating,
  onDetail,
  onClose,
  readOnly = false,
}: {
  menu: ContextMenuState;
  products: Product[];
  selectedIds: Set<string>;
  onDuplicateProducts: (products: Product[]) => void;
  onRequestDelete: (products: Product[]) => void;
  isDuplicating: boolean;
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

  function handleDuplicate() {
    const toDuplicate =
      selectedIds.has(product.id) && selectedIds.size > 0
        ? products.filter((item) => selectedIds.has(item.id))
        : [product];
    onDuplicateProducts(toDuplicate);
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

  function handleEdit() {
    router.push(`/products/${product.id}/edit`);
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
        <button
          type="button"
          onClick={handleDuplicate}
          disabled={isDuplicating}
          className={`${menuItemClass} ${
            isDuplicating ? menuItemDisabled : menuItemActive
          }`}
        >
          {isDuplicating ? "복제 중..." : "복제"}
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
  reservationsByProductId = {},
  selectedIds,
  onSelectionChange,
  highlightedIds,
  allSelected,
  someSelected,
  onSelectAll,
  onDuplicateProducts,
  onRequestDelete,
  isDuplicating,
  readOnly = false,
  sort,
  onSortColumn,
  emptyMessage,
  onProductRegistered,
}: ProductsListProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showInlineRegister, setShowInlineRegister] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [focusTarget, setFocusTarget] = useState<TableFocusState | null>(null);
  const [rowFontSize, setRowFontSize] = useState(DEFAULT_TABLE_ROW_FONT_SIZE);
  const [rowFontSizeLoaded, setRowFontSizeLoaded] = useState(false);
  const checkboxRefs = useRef(new Map<string, HTMLInputElement>());
  const editRefs = useRef(new Map<string, HTMLAnchorElement>());
  const deleteRefs = useRef(new Map<string, HTMLButtonElement>());
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const syncingScrollRef = useRef(false);
  const { widths, startResize, tableMinWidth } = useProductColumnWidths(userId);
  const baseColumns = useMemo(
    () =>
      readOnly
        ? PRODUCT_TABLE_COLUMNS.filter((column) => column.id !== "actions")
        : PRODUCT_TABLE_COLUMNS,
    [readOnly],
  );
  const {
    orderedColumns: tableColumns,
    draggingColumnId,
    dragOverColumnId,
    handleColumnDragStart,
    handleColumnDragEnd,
    handleColumnDragOver,
    handleColumnDrop,
    shouldIgnoreSortClick,
  } = useProductColumnOrder(userId, baseColumns);
  const editableFieldOrder = useMemo(
    () => getEditableFieldOrder(tableColumns.map((column) => column.id)),
    [tableColumns],
  );

  useEffect(() => {
    setRowFontSize(loadTableRowFontSize("products", userId));
    setRowFontSizeLoaded(true);
  }, [userId]);

  useEffect(() => {
    if (!rowFontSizeLoaded) return;
    saveTableRowFontSize("products", userId, rowFontSize);
  }, [rowFontSize, rowFontSizeLoaded, userId]);

  const rowPaddingClass = getTableRowPaddingClass(rowFontSize);
  const headerPaddingClass = getTableHeaderPaddingClass(rowFontSize);

  const navigateFocus = useCallback(
    (from: TableFocusState, direction: "forward" | "backward") => {
      const next = getNextTableFocus(from, products, direction, editableFieldOrder);
      if (next) setFocusTarget(next);
    },
    [editableFieldOrder, products],
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
    const hasReservation = (product.reserved_quantity ?? 0) > 0;

    const base =
      "cursor-pointer border-b border-zinc-100 transition last:border-0 dark:border-zinc-800";
    const highlight = highlightedIds.has(product.id) ? "paste-row-highlight" : "";

    if (isSelected) {
      return `${base} bg-yellow-100 hover:bg-yellow-100 dark:bg-yellow-950/50 dark:hover:bg-yellow-950/50 ${highlight}`;
    }

    if (isKeyStock) {
      return `${base} bg-red-50/80 hover:bg-red-100/70 dark:bg-red-950/25 dark:hover:bg-red-950/40 ${highlight}`;
    }

    if (hasReservation) {
      return `${base} bg-emerald-50/35 hover:bg-emerald-50/55 dark:bg-emerald-950/15 dark:hover:bg-emerald-950/25 ${highlight}`;
    }

    return `${base} hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${highlight}`;
  };

  function stickyRowBackground(product: Product) {
    const selected = selectedIds.has(product.id);
    const isKeyStock = product.is_key_stock ?? false;
    const hasReservation = (product.reserved_quantity ?? 0) > 0;

    if (selected) {
      return "max-md:bg-yellow-100 dark:max-md:bg-yellow-950/50";
    }
    if (isKeyStock) {
      return "max-md:bg-red-50/80 dark:max-md:bg-red-950/25";
    }
    if (hasReservation) {
      return "max-md:bg-emerald-50/35 dark:max-md:bg-emerald-950/15";
    }
    return "max-md:bg-white dark:max-md:bg-zinc-900";
  }

  function stickyCheckboxCellClass(product: Product) {
    return `px-2 ${rowPaddingClass} max-md:sticky max-md:left-0 max-md:z-10 ${stickyRowBackground(product)}`;
  }

  function stickyKeyStockCellClass(product: Product) {
    return `px-1 ${rowPaddingClass} max-md:sticky max-md:left-[44px] max-md:z-10 ${stickyRowBackground(product)}`;
  }

  const narrowScrollCellClass =
    `px-3 ${rowPaddingClass} font-normal text-zinc-900 dark:text-zinc-100 max-md:min-w-[5.5rem] max-md:whitespace-nowrap`;
  const narrowScrollProductCellClass =
    `px-3 ${rowPaddingClass} font-normal text-zinc-900 dark:text-zinc-100 max-md:min-w-[9rem] max-md:whitespace-nowrap`;

  const headerCellClass =
    `whitespace-nowrap px-3 ${headerPaddingClass} font-semibold`;
  const priceHeaderCellClass =
    `whitespace-nowrap px-3 ${headerPaddingClass} font-normal`;
  const standardCellClass =
    `px-3 ${rowPaddingClass} font-normal text-zinc-900 dark:text-zinc-100`;
  const truncateCellClass = `truncate ${standardCellClass}`;
  const nowrapCellClass = `whitespace-nowrap ${standardCellClass}`;
  const semiboldCellClass =
    `px-3 ${rowPaddingClass} font-semibold text-zinc-900 dark:text-zinc-100`;
  const actionsCellClass = `px-3 ${rowPaddingClass}`;

  function getHeaderReorderProps(columnId: ProductTableColumnId) {
    if (!isReorderableProductColumn(columnId)) {
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

  function renderProductCell(columnId: ProductTableColumnId, product: Product) {
    const isLowStock = isLowStockProduct(product);

    switch (columnId) {
      case "checkbox":
        return (
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
        );
      case "key_stock":
        return (
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
        );
      case "supplier":
        return (
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
        );
      case "category":
        return (
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
        );
      case "brand":
        return (
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
        );
      case "product_name":
        return (
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
        );
      case "model_name":
        return (
          <td
            className={truncateCellClass}
            onDoubleClick={(event) => handleCellDoubleClick(event, product)}
          >
            <EditableProductCell
              productId={product.id}
              field="model_name"
              value={product.model_name}
              {...cellFocusProps(product.id, "model_name")}
            />
          </td>
        );
      case "sku":
        return (
          <td
            className={truncateCellClass}
            onDoubleClick={(event) => handleCellDoubleClick(event, product)}
          >
            <EditableProductCell
              productId={product.id}
              field="sku"
              value={product.sku}
              {...cellFocusProps(product.id, "sku")}
            />
          </td>
        );
      case "purchase_price":
        return (
          <td
            className={nowrapCellClass}
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
        );
      case "stock_floor3":
        return (
          <td
            className={standardCellClass}
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
        );
      case "stock_b1":
        return (
          <td
            className={standardCellClass}
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
        );
      case "stock_display":
        return (
          <td
            className={standardCellClass}
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
        );
      case "reserved_quantity": {
        const reservationEntries = reservationsByProductId[product.id] ?? [];
        return (
          <td
            className={`${standardCellClass} align-top`}
            onDoubleClick={(event) => handleCellDoubleClick(event, product)}
            onContextMenu={(event) => event.stopPropagation()}
          >
            <EditableProductCell
              productId={product.id}
              field="reserved_quantity"
              value={String(product.reserved_quantity ?? 0)}
              inputType="number"
              className="tabular-nums font-medium"
              {...cellFocusProps(product.id, "reserved_quantity")}
            />
            <ProductReservationList entries={reservationEntries} compact />
          </td>
        );
      }
      case "stock_quantity": {
        const available = availableProductStock(product);
        return (
          <td className={semiboldCellClass}>
            <span
              className={`tabular-nums ${
                available < 0
                  ? "font-semibold text-red-600 dark:text-red-400"
                  : ""
              }`}
            >
              {available}
            </span>
          </td>
        );
      }
      case "sale_price":
        return (
          <td
            className={nowrapCellClass}
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
        );
      case "actions":
        return (
          <td
            className={actionsCellClass}
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
        );
      default:
        return null;
    }
  }

  const tableStyle = { minWidth: tableMinWidth };

  const colGroup = (
    <colgroup>
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
              className={`${stickyTableHeaderCornerClass} px-2 ${headerPaddingClass} font-semibold shadow-[inset_0_-1px_0_0_rgb(228_228_231)] dark:shadow-[inset_0_-1px_0_0_rgb(63_63_70)]`}
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
              className={`${stickyTableHeaderKeyStockClass} px-1 ${headerPaddingClass} font-semibold shadow-[inset_0_-1px_0_0_rgb(228_228_231)] dark:shadow-[inset_0_-1px_0_0_rgb(63_63_70)]`}
              onResizeStart={startResize}
            />
          );
        }

        const isPriceColumn =
          column.id === "purchase_price" || column.id === "sale_price";
        const columnId = column.id;

        if (!isSortableProductColumn(columnId)) {
          return (
            <ResizableHeaderCell
              key={columnId}
              columnId={columnId}
              label={column.label}
              resizable={column.resizable}
              className={`${stickyTableHeaderCellClass} shadow-[inset_0_-1px_0_0_rgb(228_228_231)] dark:shadow-[inset_0_-1px_0_0_rgb(63_63_70)] ${
                isPriceColumn ? priceHeaderCellClass : headerCellClass
              }`}
              onResizeStart={startResize}
              {...getHeaderReorderProps(columnId)}
            />
          );
        }

        const sortDirection = getSortDirectionForColumn(sort, columnId);

        return (
          <ResizableHeaderCell
            key={columnId}
            columnId={columnId}
            label={column.label}
            resizable={column.resizable}
            sortable
            sortDirection={sortDirection}
            onSortClick={() => {
              if (shouldIgnoreSortClick()) return;
              onSortColumn(columnId);
            }}
            className={`${stickyTableHeaderCellClass} shadow-[inset_0_-1px_0_0_rgb(228_228_231)] dark:shadow-[inset_0_-1px_0_0_rgb(63_63_70)] ${
              isPriceColumn ? priceHeaderCellClass : headerCellClass
            }`}
            onResizeStart={startResize}
            {...getHeaderReorderProps(columnId)}
          />
        );
      })}
    </tr>
  );

  return (
    <>
      <div className="max-w-full min-w-0 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div className="sticky top-[var(--app-header-height)] z-20 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
          <div className="flex items-center justify-end gap-1 border-b border-zinc-200 px-3 py-1 dark:border-zinc-700">
            {!readOnly ? (
              <div className={fontControlBoxClass}>
                <button
                  type="button"
                  aria-label="제품 등록"
                  aria-pressed={showInlineRegister}
                  onClick={() => setShowInlineRegister((current) => !current)}
                  className={`${fontControlButtonClass} border-r border-zinc-300 px-2 dark:border-zinc-600 ${
                    showInlineRegister
                      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : ""
                  }`}
                >
                  제품등록
                </button>
              </div>
            ) : null}
            <TableRowSizeControl value={rowFontSize} onChange={setRowFontSize} />
          </div>
          {showInlineRegister && !readOnly ? (
            <ProductInlineRegisterPanel
              onClose={() => setShowInlineRegister(false)}
              onOpenPopup={() => setRegisterModalOpen(true)}
              onRegistered={(productId) => {
                onProductRegistered?.(productId);
                setShowInlineRegister(false);
              }}
            />
          ) : null}
          <div
            ref={headerScrollRef}
            onScroll={syncBodyScroll}
            className={`${horizontalScrollClass} ${hiddenScrollbarClass}`}
          >
            <table className={tableClassName} style={tableStyle}>
              {colGroup}
              <thead
                className="text-left text-zinc-800 dark:text-zinc-200"
                style={{ fontSize: `${rowFontSize}px` }}
              >
                {headerRow}
              </thead>
            </table>
          </div>
        </div>

        <div
          ref={bodyScrollRef}
          onScroll={syncHeaderScroll}
          className={`${horizontalScrollClass} ${hiddenScrollbarClass}`}
        >
          <table className={tableClassName} style={tableStyle}>
            {colGroup}
            <tbody
              className="font-normal"
              style={{ fontSize: `${rowFontSize}px` }}
            >
            {products.length === 0 ? (
              <tr>
                <td
                  colSpan={tableColumns.length}
                  className="px-3 py-8 text-center text-sm font-normal text-zinc-500 dark:text-zinc-400"
                >
                  {emptyMessage ?? "표시할 제품이 없습니다."}
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr
                  key={product.id}
                  id={`product-row-${product.id}`}
                  onClick={(event) => handleRowClick(event, product)}
                  onContextMenu={(event) => openContextMenu(event, product)}
                  className={rowClass(product)}
                >
                  {tableColumns.map((column) => (
                    <Fragment key={column.id}>
                      {renderProductCell(column.id, product)}
                    </Fragment>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {contextMenu ? (
        <ProductContextMenu
          menu={contextMenu}
          products={products}
          selectedIds={selectedIds}
          onDuplicateProducts={onDuplicateProducts}
          onRequestDelete={onRequestDelete}
          isDuplicating={isDuplicating}
          onDetail={setSelectedProduct}
          onClose={() => setContextMenu(null)}
          readOnly={readOnly}
        />
      ) : null}

      {selectedProduct ? (
        <ProductDetailModal
          product={selectedProduct}
          reservationEntries={reservationsByProductId[selectedProduct.id] ?? []}
          onClose={() => setSelectedProduct(null)}
        />
      ) : null}

      {registerModalOpen ? (
        <InlineProductCreateModal
          context="products"
          initialModelName=""
          onClose={() => setRegisterModalOpen(false)}
          onCreated={(product) => {
            setRegisterModalOpen(false);
            setShowInlineRegister(false);
            onProductRegistered?.(product.id);
          }}
        />
      ) : null}
    </>
  );
}
