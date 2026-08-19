"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateKeyStockReserved } from "@/app/(main)/products/actions";
import DraggableTableHeaderCell from "@/components/draggable-table-header-cell";
import KeyStockFilterCombobox from "@/components/key-stock-filter-combobox";
import TableRowSizeControl from "@/components/table-row-size-control";
import { useTableColumnOrder } from "@/hooks/use-table-column-order";
import {
  buildKeyStockBrandOptions,
  buildKeyStockCategoryOptions,
  productFilterRows,
} from "@/lib/key-stock-loader";
import {
  clampKeyStockSectionCount,
  createEmptyKeyStockColumnFilters,
  DEFAULT_KEY_STOCK_SECTION_COUNT,
  loadKeyStockColumnFilters,
  loadKeyStockSectionCount,
  MAX_KEY_STOCK_SECTION_COUNT,
  MIN_KEY_STOCK_SECTION_COUNT,
  resizeKeyStockColumnFilters,
  saveKeyStockColumnFilters,
  saveKeyStockSectionCount,
  type KeyStockColumnFilter,
} from "@/lib/key-stock-filters";
import {
  getDefaultKeyStockColumnOrder,
  getKeyStockColumnOrderStorageKey,
  getKeyStockSectionWidth,
  KEY_STOCK_TABLE_COLUMNS,
  type KeyStockTableColumn,
  type KeyStockTableColumnId,
} from "@/lib/key-stock-table-columns";
import {
  DEFAULT_TABLE_ROW_FONT_SIZE,
  getTableHeaderPaddingClass,
  getTableRowPaddingClass,
  loadTableRowFontSize,
  saveTableRowFontSize,
} from "@/lib/table-row-preferences";
import type { Product } from "@/types/product";
import { formatKRW } from "@/lib/sales-calculator";

function normalizeProduct(product: Product): Product {
  return {
    ...product,
    stock_floor3: product.stock_floor3 ?? 0,
    stock_b1: product.stock_b1 ?? 0,
    stock_display: product.stock_display ?? 0,
    reserved_quantity: product.reserved_quantity ?? 0,
    is_key_stock: product.is_key_stock ?? false,
  };
}

function grossStock(product: Product) {
  return product.stock_floor3 + product.stock_b1 + product.stock_display;
}

function netStock(product: Product, reserved: number) {
  return Math.max(0, grossStock(product) - reserved);
}

function lineTotal(product: Product, reserved: number) {
  return netStock(product, reserved) * product.purchase_price;
}

const dividerClass =
  "w-0 border-l-2 border-blue-200 p-0 dark:border-blue-400/60";
const filterDividerClass =
  "w-0 border-l-2 border-zinc-300 p-0 dark:border-zinc-600";

const DIVIDER_WIDTH_PX = 2;

function getTableColumnCount(sectionCount: number, columnCount: number) {
  return columnCount * sectionCount + Math.max(0, sectionCount - 1);
}

function getTableMinWidth(sectionCount: number, sectionWidthPx: number) {
  return (
    sectionCount * sectionWidthPx +
    Math.max(0, sectionCount - 1) * DIVIDER_WIDTH_PX
  );
}

function KeyStockColGroup({
  sectionCount,
  columns,
}: {
  sectionCount: number;
  columns: KeyStockTableColumn[];
}) {
  return (
    <colgroup>
      {Array.from({ length: sectionCount }, (_, sectionIndex) => (
        <Fragment key={`colgroup-section-${sectionIndex}`}>
          {sectionIndex > 0 ? (
            <col style={{ width: DIVIDER_WIDTH_PX }} />
          ) : null}
          {columns.map((column) => (
            <col
              key={`colgroup-${sectionIndex}-${column.id}`}
              style={{ width: column.width }}
            />
          ))}
        </Fragment>
      ))}
    </colgroup>
  );
}

function ColumnDivider({
  variant,
  as = "th",
}: {
  variant: "filter" | "data";
  as?: "th" | "td";
}) {
  const className = variant === "filter" ? filterDividerClass : dividerClass;
  if (as === "td") {
    return <td className={className} aria-hidden />;
  }
  return <th className={className} aria-hidden />;
}

type HeaderCellsProps = {
  prefix: string;
  columns: KeyStockTableColumn[];
  headerClass: string;
  draggingColumnId: KeyStockTableColumnId | null;
  dragOverColumnId: KeyStockTableColumnId | null;
  onColumnDragStart: (columnId: KeyStockTableColumnId) => void;
  onColumnDragEnd: () => void;
  onColumnDragOver: (columnId: KeyStockTableColumnId) => void;
  onColumnDrop: (columnId: KeyStockTableColumnId) => void;
};

function HeaderCells({
  prefix,
  columns,
  headerClass,
  draggingColumnId,
  dragOverColumnId,
  onColumnDragStart,
  onColumnDragEnd,
  onColumnDragOver,
  onColumnDrop,
}: HeaderCellsProps) {
  return columns.map((column) => (
    <DraggableTableHeaderCell
      key={`${prefix}-${column.id}`}
      columnId={column.id}
      label={column.label}
      align={column.align}
      className={headerClass}
      reorderable
      isDragging={draggingColumnId === column.id}
      isDragOver={dragOverColumnId === column.id}
      onColumnDragStart={onColumnDragStart}
      onColumnDragEnd={onColumnDragEnd}
      onColumnDragOver={onColumnDragOver}
      onColumnDrop={onColumnDrop}
    />
  ));
}

type ProductCellsProps = {
  product: Product | null;
  reserved: number;
  isPending: boolean;
  pendingId: string | null;
  onReservedChange: (productId: string, value: number) => void;
  onReservedSave: (productId: string, rawValue: string) => void;
  columns: KeyStockTableColumn[];
  cellClass: string;
  side: string;
};

function ProductCells({
  product,
  reserved,
  isPending,
  pendingId,
  onReservedChange,
  onReservedSave,
  columns,
  cellClass,
  side,
}: ProductCellsProps) {
  if (!product) {
    return columns.map((column) => (
      <td
        key={`${side}-${column.id}-empty`}
        className={`${cellClass} text-zinc-300 dark:text-zinc-600`}
      >
        —
      </td>
    ));
  }

  const item = product;
  const totalQty = netStock(item, reserved);

  function renderCell(columnId: KeyStockTableColumnId) {
    switch (columnId) {
      case "brand":
        return (
          <td className={cellClass} title={item.brand?.trim() || "-"}>
            {item.brand?.trim() || "-"}
          </td>
        );
      case "model":
        return (
          <td className={cellClass} title={item.model_name}>
            {item.model_name}
          </td>
        );
      case "floor3":
        return (
          <td className={`${cellClass} text-center`}>{item.stock_floor3}</td>
        );
      case "b1":
        return (
          <td className={`${cellClass} text-center`}>{item.stock_b1}</td>
        );
      case "uiwang":
        return (
          <td className={`${cellClass} text-center`}>{item.stock_display}</td>
        );
      case "reserved":
        return (
          <td className={`${cellClass} text-center`}>
            <input
              type="number"
              min={0}
              max={grossStock(item)}
              value={reserved}
              disabled={isPending && pendingId === item.id}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isNaN(next) || next < 0) return;
                onReservedChange(
                  item.id,
                  Math.min(next, grossStock(item)),
                );
              }}
              onBlur={(event) => {
                const next = event.target.value;
                const saved = String(item.reserved_quantity ?? 0);
                if (next !== saved) onReservedSave(item.id, next);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
              className="w-12 rounded border border-zinc-300 bg-white px-1 py-0.5 text-center dark:border-zinc-600 dark:bg-zinc-800"
              style={{ fontSize: "inherit" }}
              aria-label={`${item.model_name} 예약 수량`}
            />
          </td>
        );
      case "total":
        return (
          <td className={`${cellClass} text-center font-semibold`}>{totalQty}</td>
        );
      case "unit":
        return (
          <td className={`${cellClass} text-right`}>
            {formatKRW(item.purchase_price)}
          </td>
        );
      default:
        return null;
    }
  }

  return (
    <>
      {columns.map((column) => (
        <Fragment key={`${side}-${column.id}`}>{renderCell(column.id)}</Fragment>
      ))}
    </>
  );
}

function matchesFilterField(value: string, filterValue: string) {
  const query = filterValue.trim();
  if (!query) return true;

  const normalizedValue = value.toLowerCase();
  const normalizedQuery = query.toLowerCase();
  return (
    normalizedValue === normalizedQuery ||
    normalizedValue.includes(normalizedQuery)
  );
}

function filterProducts(
  products: Product[],
  filter: KeyStockColumnFilter,
): Product[] {
  return products.filter((product) => {
    const category = product.category?.trim() || "미분류";
    const brand = product.brand?.trim() || "미지정";
    if (!matchesFilterField(category, filter.category)) return false;
    if (!matchesFilterField(brand, filter.brand)) return false;
    return true;
  });
}

type KeyStockWorkspaceProps = {
  userId: string;
  products: Product[];
};

export default function KeyStockWorkspace({
  userId,
  products,
}: KeyStockWorkspaceProps) {
  const router = useRouter();
  const normalized = useMemo(
    () => products.map(normalizeProduct),
    [products],
  );

  const filterOptionRows = useMemo(
    () => productFilterRows(normalized),
    [normalized],
  );

  const categories = useMemo(
    () => buildKeyStockCategoryOptions(filterOptionRows),
    [filterOptionRows],
  );

  function getBrandOptions(categoryFilter: string) {
    return buildKeyStockBrandOptions(filterOptionRows, categoryFilter);
  }

  const [sectionCount, setSectionCount] = useState(DEFAULT_KEY_STOCK_SECTION_COUNT);
  const [columnFilters, setColumnFilters] = useState<KeyStockColumnFilter[]>(() =>
    createEmptyKeyStockColumnFilters(DEFAULT_KEY_STOCK_SECTION_COUNT),
  );
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [rowFontSize, setRowFontSize] = useState(DEFAULT_TABLE_ROW_FONT_SIZE);
  const [rowPreferencesLoaded, setRowPreferencesLoaded] = useState(false);
  const [reservedById, setReservedById] = useState<Record<string, number>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const defaultColumnOrder = useMemo(() => getDefaultKeyStockColumnOrder(), []);
  const {
    orderedColumns,
    draggingColumnId,
    dragOverColumnId,
    handleColumnDragStart,
    handleColumnDragEnd,
    handleColumnDragOver,
    handleColumnDrop,
  } = useTableColumnOrder(
    getKeyStockColumnOrderStorageKey(userId),
    defaultColumnOrder,
    KEY_STOCK_TABLE_COLUMNS,
  );

  const headerClass = `overflow-hidden text-ellipsis whitespace-nowrap px-2 ${getTableHeaderPaddingClass(rowFontSize)} font-semibold text-zinc-600 dark:text-zinc-400`;
  const cellClass = `overflow-hidden text-ellipsis whitespace-nowrap px-2 ${getTableRowPaddingClass(rowFontSize)} text-zinc-800 dark:text-zinc-200`;
  const sectionWidthPx = getKeyStockSectionWidth(orderedColumns);
  const columnCount = orderedColumns.length;

  useEffect(() => {
    const savedSectionCount = loadKeyStockSectionCount(userId);
    setSectionCount(savedSectionCount);
    setColumnFilters(loadKeyStockColumnFilters(userId, savedSectionCount));
    setRowFontSize(loadTableRowFontSize("key-stock", userId));
    setFiltersLoaded(true);
    setRowPreferencesLoaded(true);
  }, [userId]);

  useEffect(() => {
    if (!filtersLoaded) return;
    saveKeyStockColumnFilters(userId, columnFilters);
  }, [userId, columnFilters, filtersLoaded]);

  useEffect(() => {
    if (!filtersLoaded) return;
    saveKeyStockSectionCount(userId, sectionCount);
  }, [userId, sectionCount, filtersLoaded]);

  useEffect(() => {
    if (!rowPreferencesLoaded) return;
    saveTableRowFontSize("key-stock", userId, rowFontSize);
  }, [rowFontSize, rowPreferencesLoaded, userId]);

  useEffect(() => {
    setReservedById(
      Object.fromEntries(
        normalized.map((product) => [
          product.id,
          product.reserved_quantity ?? 0,
        ]),
      ),
    );
  }, [normalized]);

  const columnProducts = useMemo(
    () => columnFilters.map((filter) => filterProducts(normalized, filter)),
    [normalized, columnFilters],
  );

  const rowCount = useMemo(
    () => Math.max(0, ...columnProducts.map((items) => items.length)),
    [columnProducts],
  );

  const totalValue = useMemo(
    () =>
      normalized.reduce(
        (sum, product) =>
          sum + lineTotal(product, reservedById[product.id] ?? 0),
        0,
      ),
    [normalized, reservedById],
  );

  const tableColumnCount = getTableColumnCount(sectionCount, columnCount);
  const tableMinWidth = getTableMinWidth(sectionCount, sectionWidthPx);

  function getReserved(product: Product) {
    return reservedById[product.id] ?? product.reserved_quantity ?? 0;
  }

  function handleReservedChange(productId: string, value: number) {
    setReservedById((prev) => ({ ...prev, [productId]: value }));
  }

  function updateColumnFilter(
    columnIndex: number,
    field: keyof KeyStockColumnFilter,
    value: string,
  ) {
    setColumnFilters((prev) =>
      prev.map((filter, index) =>
        index === columnIndex ? { ...filter, [field]: value } : filter,
      ),
    );
  }

  function handleSectionCountChange(rawValue: string) {
    const nextCount = clampKeyStockSectionCount(Number(rawValue));
    setSectionCount(nextCount);
    setColumnFilters((prev) => resizeKeyStockColumnFilters(prev, nextCount));
  }

  function saveReserved(productId: string, rawValue: string) {
    setError(null);
    setPendingId(productId);
    startTransition(async () => {
      const result = await updateKeyStockReserved(productId, rawValue);
      setPendingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const selectClass =
    "w-full rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-600 dark:bg-zinc-800";

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          총 재고 가격
        </p>
        <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {formatKRW(totalValue)}원
          <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
            ({normalized.length}품목 · 예약 제외 · 매입가 기준)
          </span>
        </p>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {normalized.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            주요 재고로 등록된 제품이 없습니다.
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              품목·브랜드 필터 단
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <TableRowSizeControl value={rowFontSize} onChange={setRowFontSize} />
              <label
                htmlFor="key-stock-section-count"
                className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
              >
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  단 수
                </span>
                <select
                  id="key-stock-section-count"
                  value={sectionCount}
                  onChange={(event) => handleSectionCountChange(event.target.value)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-300 dark:focus:ring-zinc-300"
                >
                  {Array.from(
                    { length: MAX_KEY_STOCK_SECTION_COUNT - MIN_KEY_STOCK_SECTION_COUNT + 1 },
                    (_, index) => MIN_KEY_STOCK_SECTION_COUNT + index,
                  ).map((count) => (
                    <option key={count} value={count}>
                      {count}단
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
            <table
              className="table-fixed border-separate border-spacing-0"
              style={{
                width: Math.max(tableMinWidth, 0),
                minWidth: "100%",
              }}
            >
              <KeyStockColGroup sectionCount={sectionCount} columns={orderedColumns} />
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/80">
                  {columnFilters.map((filter, columnIndex) => (
                    <Fragment key={`filter-${columnIndex}`}>
                      {columnIndex > 0 ? (
                        <ColumnDivider variant="filter" />
                      ) : null}
                      <th
                        colSpan={columnCount}
                        className="px-2 py-3 text-left align-top"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label
                              htmlFor={`category-filter-${columnIndex}`}
                              className="mb-1 block text-[10px] font-semibold text-zinc-600 dark:text-zinc-400"
                            >
                              품목
                            </label>
                            <KeyStockFilterCombobox
                              id={`category-filter-${columnIndex}`}
                              value={filter.category}
                              options={categories}
                              placeholder="품목 검색"
                              onChange={(value) =>
                                updateColumnFilter(columnIndex, "category", value)
                              }
                              className={selectClass}
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`brand-filter-${columnIndex}`}
                              className="mb-1 block text-[10px] font-semibold text-zinc-600 dark:text-zinc-400"
                            >
                              브랜드
                            </label>
                            <KeyStockFilterCombobox
                              id={`brand-filter-${columnIndex}`}
                              value={filter.brand}
                              options={getBrandOptions(filter.category)}
                              placeholder="브랜드 검색"
                              onChange={(value) =>
                                updateColumnFilter(columnIndex, "brand", value)
                              }
                              className={selectClass}
                            />
                          </div>
                        </div>
                        <p className="mt-1.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                          {columnProducts[columnIndex]?.length ?? 0}건
                        </p>
                      </th>
                    </Fragment>
                  ))}
                </tr>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/80">
                  {Array.from({ length: sectionCount }, (_, sectionIndex) => (
                    <Fragment key={`header-section-${sectionIndex}`}>
                      {sectionIndex > 0 ? (
                        <ColumnDivider variant="data" />
                      ) : null}
                      <HeaderCells
                        prefix={`col-${sectionIndex}`}
                        columns={orderedColumns}
                        headerClass={headerClass}
                        draggingColumnId={draggingColumnId}
                        dragOverColumnId={dragOverColumnId}
                        onColumnDragStart={handleColumnDragStart}
                        onColumnDragEnd={handleColumnDragEnd}
                        onColumnDragOver={handleColumnDragOver}
                        onColumnDrop={handleColumnDrop}
                      />
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody
                className="divide-y divide-zinc-100 dark:divide-zinc-800"
                style={{ fontSize: `${rowFontSize}px` }}
              >
                {rowCount === 0 ? (
                  <tr>
                    <td
                      colSpan={tableColumnCount}
                      className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400"
                    >
                      선택한 필터에 해당하는 제품이 없습니다.
                    </td>
                  </tr>
                ) : (
                  Array.from({ length: rowCount }, (_, rowIndex) => (
                    <tr
                      key={`row-${rowIndex}`}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                    >
                      {columnProducts.map((items, columnIndex) => {
                        const product = items[rowIndex] ?? null;
                        return (
                          <Fragment key={`row-${rowIndex}-col-${columnIndex}`}>
                            {columnIndex > 0 ? (
                              <ColumnDivider variant="data" as="td" />
                            ) : null}
                            <ProductCells
                              side={`col-${columnIndex}`}
                              product={product}
                              reserved={product ? getReserved(product) : 0}
                              isPending={isPending}
                              pendingId={pendingId}
                              onReservedChange={handleReservedChange}
                              onReservedSave={saveReserved}
                              columns={orderedColumns}
                              cellClass={cellClass}
                            />
                          </Fragment>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
