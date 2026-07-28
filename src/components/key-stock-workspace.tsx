"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateKeyStockReserved } from "@/app/products/actions";
import type { Product } from "@/types/product";

function formatPrice(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

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

function chunkPairs<T>(items: T[]): Array<[T | null, T | null]> {
  const pairs: Array<[T | null, T | null]> = [];
  for (let i = 0; i < items.length; i += 2) {
    pairs.push([items[i] ?? null, items[i + 1] ?? null]);
  }
  return pairs;
}

const headerClass =
  "whitespace-nowrap px-2 py-2 text-left text-[11px] font-semibold text-zinc-600 dark:text-zinc-400";
const cellClass =
  "whitespace-nowrap px-2 py-1.5 text-[11px] text-zinc-800 dark:text-zinc-200";
const dividerClass =
  "w-0 border-l-2 border-zinc-200 p-0 dark:border-zinc-700";

const COLUMN_HEADERS = [
  { key: "brand", label: "제조사", align: "left" as const },
  { key: "model", label: "모델", align: "left" as const },
  { key: "floor3", label: "3층", align: "center" as const },
  { key: "b1", label: "B1", align: "center" as const },
  { key: "uiwang", label: "의왕", align: "center" as const },
  { key: "reserved", label: "예약", align: "center" as const },
  { key: "total", label: "총수량", align: "center" as const },
  { key: "unit", label: "단가", align: "right" as const },
  { key: "amount", label: "총가격", align: "right" as const },
];

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
}: ProductCellsProps & { side: "left" | "right" }) {
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
  const totalPrice = lineTotal(product, reserved);

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
        {formatPrice(product.purchase_price)}
      </td>
      <td className={`${cellClass} text-right font-semibold text-zinc-900 dark:text-zinc-100`}>
        {formatPrice(totalPrice)}
      </td>
    </>
  );
}

type KeyStockWorkspaceProps = {
  products: Product[];
};

export default function KeyStockWorkspace({ products }: KeyStockWorkspaceProps) {
  const router = useRouter();
  const normalized = useMemo(
    () => products.map(normalizeProduct),
    [products],
  );

  const categories = useMemo(
    () =>
      [...new Set(normalized.map((p) => p.category?.trim() || "미분류"))].sort(
        (a, b) => a.localeCompare(b, "ko"),
      ),
    [normalized],
  );

  const brands = useMemo(
    () =>
      [...new Set(normalized.map((p) => p.brand?.trim() || "미지정"))].sort(
        (a, b) => a.localeCompare(b, "ko"),
      ),
    [normalized],
  );

  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [reservedById, setReservedById] = useState<Record<string, number>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  const filtered = useMemo(() => {
    return normalized.filter((product) => {
      const category = product.category?.trim() || "미분류";
      const brand = product.brand?.trim() || "미지정";
      if (categoryFilter && category !== categoryFilter) return false;
      if (brandFilter && brand !== brandFilter) return false;
      return true;
    });
  }, [normalized, categoryFilter, brandFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const product of filtered) {
      const key = product.category?.trim() || "미분류";
      const list = map.get(key) ?? [];
      list.push(product);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "ko"));
  }, [filtered]);

  const totalValue = useMemo(
    () =>
      filtered.reduce(
        (sum, product) =>
          sum + lineTotal(product, reservedById[product.id] ?? 0),
        0,
      ),
    [filtered, reservedById],
  );

  function getReserved(product: Product) {
    return reservedById[product.id] ?? product.reserved_quantity ?? 0;
  }

  function handleReservedChange(productId: string, value: number) {
    setReservedById((prev) => ({ ...prev, [productId]: value }));
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

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          총 재고 가격
        </p>
        <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          {formatPrice(totalValue)}원
          <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
            ({filtered.length}품목 · 예약 제외 · 매입가 기준)
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <div>
          <label
            htmlFor="category-filter"
            className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
          >
            품목
          </label>
          <select
            id="category-filter"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          >
            <option value="">전체</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="brand-filter"
            className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
          >
            브랜드
          </label>
          <select
            id="brand-filter"
            value={brandFilter}
            onChange={(event) => setBrandFilter(event.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          >
            <option value="">전체</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            주요 재고로 등록된 제품이 없습니다.
          </p>
        </div>
      ) : (
        grouped.map(([category, items]) => {
          const pairs = chunkPairs(items);

          return (
            <section
              key={category}
              className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {category}
                  <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                    {items.length}건
                  </span>
                </h3>
              </div>

              <table className="min-w-full table-fixed">
                <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/80">
                  <tr>
                    <HeaderCells prefix="left" />
                    <th className={dividerClass} aria-hidden />
                    <HeaderCells prefix="right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {pairs.map(([left, right], index) => (
                    <tr
                      key={`${category}-${left?.id ?? "empty"}-${right?.id ?? "empty"}-${index}`}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                    >
                      <ProductCells
                        side="left"
                        product={left}
                        reserved={left ? getReserved(left) : 0}
                        isPending={isPending}
                        pendingId={pendingId}
                        onReservedChange={handleReservedChange}
                        onReservedSave={saveReserved}
                      />
                      <td className={dividerClass} aria-hidden />
                      <ProductCells
                        side="right"
                        product={right}
                        reserved={right ? getReserved(right) : 0}
                        isPending={isPending}
                        pendingId={pendingId}
                        onReservedChange={handleReservedChange}
                        onReservedSave={saveReserved}
                      />
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })
      )}
    </div>
  );
}
