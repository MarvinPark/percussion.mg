"use client";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateKeyStockReserved } from "@/app/(main)/products/actions";
import KeyStockFilterCombobox from "@/components/key-stock-filter-combobox";
import {
  buildKeyStockBrandOptions,
  buildKeyStockCategoryOptions,
  type KeyStockFilterOptionRow,
} from "@/lib/key-stock-loader";
import {
  EMPTY_KEY_STOCK_COLUMN_FILTERS,
  loadKeyStockColumnFilters,
  saveKeyStockColumnFilters,
  type KeyStockColumnFilter,
} from "@/lib/key-stock-filters";
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

const headerClass =
  "whitespace-nowrap px-2 py-2 text-left text-[11px] font-semibold text-zinc-600 dark:text-zinc-400";
const cellClass =
  "whitespace-nowrap px-2 py-1.5 text-[11px] text-zinc-800 dark:text-zinc-200";
const dividerClass =
  "w-0 border-l-2 border-blue-200 p-0 dark:border-blue-400/60";
const filterDividerClass =
  "w-0 border-l-2 border-zinc-300 p-0 dark:border-zinc-600";

const COLUMN_HEADERS = [
  { key: "brand", label: "제조사", align: "left" as const },
  { key: "model", label: "모델", align: "left" as const },
  { key: "floor3", label: "3층", align: "center" as const },
  { key: "b1", label: "B1", align: "center" as const },
  { key: "uiwang", label: "의왕", align: "center" as const },
  { key: "reserved", label: "예약", align: "center" as const },
  { key: "total", label: "총수량", align: "center" as const },
  { key: "unit", label: "단가", align: "right" as const },
];

const COLUMN_COUNT = COLUMN_HEADERS.length;
const SECTION_COUNT = 3;
const TABLE_COLUMN_COUNT = COLUMN_COUNT * SECTION_COUNT + (SECTION_COUNT - 1);

function KeyStockColGroup() {
  return (
    <colgroup>
      {Array.from({ length: SECTION_COUNT }, (_, sectionIndex) => (
        <Fragment key={`colgroup-section-${sectionIndex}`}>
          {sectionIndex > 0 ? <col style={{ width: 2 }} /> : null}
          {COLUMN_HEADERS.map((column) => (
            <col key={`colgroup-${sectionIndex}-${column.key}`} />
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

function HeaderCells({ prefix }: { prefix: string }) {
  return COLUMN_HEADERS.map((column) => (
    <th
      key={`${prefix}-${column.key}`}
      className={`${headerClass} ${column.align === "center" ? "text-center" : column.align === "right" ? "text-right" : ""}`}
    >
      {column.label}
    </th>
  ));
}

type ProductCellsProps = {
  product: Product | null;
  reserved: number;
  isPending: boolean;
  pendingId: string | null;
  onReservedChange: (productId: string, value: number) => void;
  onReservedSave: (productId: string, rawValue: string) => void;
};

function ProductCells({
  product,
  reserved,
  isPending,
  pendingId,
  onReservedChange,
  onReservedSave,
  side,
}: ProductCellsProps & { side: string }) {
  if (!product) {
    return COLUMN_HEADERS.map((column) => (
      <td
        key={`${side}-${column.key}-empty`}
        className={`${cellClass} text-zinc-300 dark:text-zinc-600`}
      >
        —
      </td>
    ));
  }

  const totalQty = netStock(product, reserved);

  return (
    <>
      <td className={cellClass}>{product.brand?.trim() || "-"}</td>
      <td className={`${cellClass} max-w-[8rem] truncate`} title={product.model_name}>
        {product.model_name}
      </td>
      <td className={`${cellClass} text-center`}>{product.stock_floor3}</td>
      <td className={`${cellClass} text-center`}>{product.stock_b1}</td>
      <td className={`${cellClass} text-center`}>{product.stock_display}</td>
      <td className={`${cellClass} text-center`}>
        <input
          type="number"
          min={0}
          max={grossStock(product)}
          value={reserved}
          disabled={isPending && pendingId === product.id}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isNaN(next) || next < 0) return;
            onReservedChange(
              product.id,
              Math.min(next, grossStock(product)),
            );
          }}
          onBlur={(event) => {
            const next = event.target.value;
            const saved = String(product.reserved_quantity ?? 0);
            if (next !== saved) onReservedSave(product.id, next);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          className="w-12 rounded border border-zinc-300 bg-white px-1 py-0.5 text-center text-[11px] dark:border-zinc-600 dark:bg-zinc-800"
          aria-label={`${product.model_name} 예약 수량`}
        />
      </td>
      <td className={`${cellClass} text-center font-semibold`}>{totalQty}</td>
      <td className={`${cellClass} text-right`}>
        {formatKRW(product.purchase_price)}
      </td>
    </>
  );
}

function matchesFilterField(value: string, filterValue: string) {
  const query = filterValue.trim();
  if (!query) return true;
  return value.toLowerCase().includes(query.toLowerCase());
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
  filterOptionRows: KeyStockFilterOptionRow[];
};

export default function KeyStockWorkspace({
  userId,
  products,
  filterOptionRows,
}: KeyStockWorkspaceProps) {
  const router = useRouter();
  const normalized = useMemo(
    () => products.map(normalizeProduct),
    [products],
  );

  const categories = useMemo(
    () => buildKeyStockCategoryOptions(filterOptionRows),
    [filterOptionRows],
  );

  function getBrandOptions(categoryFilter: string) {
    return buildKeyStockBrandOptions(filterOptionRows, categoryFilter);
  }

  const [columnFilters, setColumnFilters] = useState<KeyStockColumnFilter[]>(
    () => EMPTY_KEY_STOCK_COLUMN_FILTERS.map((filter) => ({ ...filter })),
  );
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [reservedById, setReservedById] = useState<Record<string, number>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setColumnFilters(loadKeyStockColumnFilters(userId));
    setFiltersLoaded(true);
  }, [userId]);

  useEffect(() => {
    if (!filtersLoaded) return;
    saveKeyStockColumnFilters(userId, columnFilters);
  }, [userId, columnFilters, filtersLoaded]);

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
        <section className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
          <table className="min-w-full table-fixed border-separate border-spacing-0">
            <KeyStockColGroup />
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/80">
                {columnFilters.map((filter, columnIndex) => (
                  <Fragment key={`filter-${columnIndex}`}>
                    {columnIndex > 0 ? (
                      <ColumnDivider variant="filter" />
                    ) : null}
                    <th
                      colSpan={COLUMN_COUNT}
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
                        {columnProducts[columnIndex].length}건
                      </p>
                    </th>
                  </Fragment>
                ))}
              </tr>
              <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/80">
                <HeaderCells prefix="col-0" />
                <ColumnDivider variant="data" />
                <HeaderCells prefix="col-1" />
                <ColumnDivider variant="data" />
                <HeaderCells prefix="col-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rowCount === 0 ? (
                <tr>
                  <td
                    colSpan={TABLE_COLUMN_COUNT}
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
                          />
                        </Fragment>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
