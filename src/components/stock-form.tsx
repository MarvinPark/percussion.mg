"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { registerStockIns } from "@/app/(main)/products/actions";
import ProductSearchSelect from "@/components/product-search-select";
import { productToSaleProductOption } from "@/lib/sale-product-option";
import type { Product } from "@/types/product";
import type { SaleProductOption } from "@/types/sale";

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400";

const tableInputClass =
  "w-full min-w-[4rem] rounded border border-zinc-400 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const labelClass = "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

type StockFormProps = {
  initialProduct?: Product | null;
};

type StockInLineDraft = {
  id: string;
  movementDate: string;
  productId: string;
  quantity: number;
};

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createEmptyLine(movementDate: string): StockInLineDraft {
  return {
    id: crypto.randomUUID(),
    movementDate,
    productId: "",
    quantity: 1,
  };
}

export default function StockForm({ initialProduct = null }: StockFormProps) {
  const [defaultMovementDate, setDefaultMovementDate] = useState(todayString);
  const [lines, setLines] = useState<StockInLineDraft[]>(() => [
    createEmptyLine(todayString()),
  ]);
  const [selectedProductsByLine, setSelectedProductsByLine] = useState<
    Record<string, SaleProductOption>
  >({});

  useEffect(() => {
    if (!initialProduct) return;

    const option = productToSaleProductOption(initialProduct);
    const lineId = crypto.randomUUID();
    setLines([
      {
        id: lineId,
        movementDate: todayString(),
        productId: option.id,
        quantity: 1,
      },
    ]);
    setSelectedProductsByLine({ [lineId]: option });
  }, [initialProduct]);

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      return (await registerStockIns(formData)) ?? null;
    },
    null,
  );

  const linesJson = useMemo(
    () =>
      JSON.stringify(
        lines.map((line) => ({
          movement_date: line.movementDate,
          product_id: line.productId,
          quantity: line.quantity,
        })),
      ),
    [lines],
  );

  const hasValidLine = lines.some((line) => line.productId);

  function updateLine(id: string, patch: Partial<StockInLineDraft>) {
    setLines((prev) =>
      prev.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  }

  function handleDefaultDateChange(value: string) {
    setDefaultMovementDate(value);
    setLines((prev) =>
      prev.map((line) => ({ ...line, movementDate: value })),
    );
  }

  function handleProductChange(lineId: string, product: SaleProductOption | null) {
    if (!product) {
      setSelectedProductsByLine((prev) => {
        const next = { ...prev };
        delete next[lineId];
        return next;
      });
      updateLine(lineId, { productId: "" });
      return;
    }

    setSelectedProductsByLine((prev) => ({ ...prev, [lineId]: product }));
    updateLine(lineId, { productId: product.id });
  }

  function addLine() {
    setLines((prev) => [...prev, createEmptyLine(defaultMovementDate)]);
  }

  function removeLine(id: string) {
    setLines((prev) =>
      prev.length <= 1 ? prev : prev.filter((line) => line.id !== id),
    );
    setSelectedProductsByLine((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="lines_json" value={linesJson} readOnly />

      <div className="max-w-xs">
        <label htmlFor="default_movement_date" className={labelClass}>
          입고일
        </label>
        <input
          id="default_movement_date"
          type="date"
          value={defaultMovementDate}
          onChange={(event) => handleDefaultDateChange(event.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
          기본 입고일입니다. 아래 각 줄에서 개별 수정할 수 있습니다.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
        <table className="min-w-[720px] w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <tr>
              <th className="min-w-[9rem] px-3 py-2.5 font-semibold">입고일</th>
              <th className="min-w-[16rem] px-3 py-2.5 font-semibold">제품</th>
              <th className="min-w-[5rem] px-3 py-2.5 font-semibold">수량</th>
              <th className="w-10 px-2 py-2.5" aria-label="행 삭제" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr
                key={line.id}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
              >
                <td className="px-3 py-2 align-top">
                  <input
                    type="date"
                    required
                    value={line.movementDate}
                    onChange={(event) =>
                      updateLine(line.id, {
                        movementDate: event.target.value,
                      })
                    }
                    className={tableInputClass}
                    aria-label={`${index + 1}번째 입고일`}
                  />
                </td>
                <td className="px-3 py-2 align-top">
                  <ProductSearchSelect
                    selectedProduct={selectedProductsByLine[line.id] ?? null}
                    onSelect={(product) => handleProductChange(line.id, product)}
                    compact
                    emphasizeModelName
                    showHiddenField={false}
                    showHelperText={false}
                    inputId={`stock_product_search_${line.id}`}
                  />
                </td>
                <td className="px-3 py-2 align-top">
                  <input
                    type="number"
                    min={1}
                    required
                    value={line.quantity}
                    onChange={(event) =>
                      updateLine(line.id, {
                        quantity: Math.max(1, Number(event.target.value) || 1),
                      })
                    }
                    className={`${tableInputClass} w-20`}
                    aria-label={`${index + 1}번째 수량`}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    disabled={lines.length <= 1}
                    className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-red-500 dark:hover:bg-red-400"
                    aria-label={`${index + 1}번째 제품 삭제`}
                  >
                    -
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addLine}
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        + 제품 추가
      </button>

      {state?.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending || !hasValidLine}
        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
      >
        {isPending ? "저장 중..." : "입고 기록"}
      </button>
    </form>
  );
}
