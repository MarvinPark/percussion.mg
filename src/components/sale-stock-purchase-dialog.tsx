"use client";

import { useEffect, useRef, useState } from "react";
import { parseFulfillmentLocation } from "@/lib/quote-fulfillment";
import type { SaleStockPurchaseItem } from "@/lib/sale-stock-shortage";
import { formatKRW } from "@/lib/sales-calculator";

const tableInputClass =
  "w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

type SaleStockPurchaseDialogProps = {
  items: SaleStockPurchaseItem[];
  isPending?: boolean;
  onConfirm: (purchaseQuantities: Record<string, number>) => void;
  onCancel: () => void;
};

export default function SaleStockPurchaseDialog({
  items,
  isPending = false,
  onConfirm,
  onCancel,
}: SaleStockPurchaseDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const [purchaseQuantities, setPurchaseQuantities] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      items.map((item) => [
        item.id,
        item.default_purchase_quantity > 0
          ? String(item.default_purchase_quantity)
          : "",
      ]),
    ),
  );

  useEffect(() => {
    confirmButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || isPending) return;
      event.preventDefault();
      onCancel();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onCancel]);

  function handleConfirm() {
    onConfirm(
      Object.fromEntries(
        items.map((item) => {
          const raw = purchaseQuantities[item.id]?.trim() ?? "";
          const parsed = raw ? Math.max(0, Math.round(Number(raw) || 0)) : 0;
          return [item.id, parsed];
        }),
      ),
    );
  }

  function updatePurchaseQuantity(itemId: string, value: string) {
    setPurchaseQuantities((current) => ({
      ...current,
      [itemId]: value,
    }));
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-stock-purchase-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h3
          id="sale-stock-purchase-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
        >
          재고 부족 — 매입 수량 입력
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          매장 출고 품목 중 재고가 부족합니다. 매입 수량을 입력하면 입고 후
          판매 수량만큼 재고에서 차감됩니다.
        </p>

        <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/40">
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              매출 등록 품목 · 매입 수량
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="border-b border-zinc-200 text-left text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">모델명</th>
                  <th className="px-3 py-2 font-semibold">제품명</th>
                  <th className="px-3 py-2 font-semibold">출고</th>
                  <th className="px-3 py-2 font-semibold text-right">현재재고</th>
                  <th className="px-3 py-2 font-semibold text-right">판매수량</th>
                  <th className="px-3 py-2 font-semibold text-right">매입가</th>
                  <th className="min-w-[5.5rem] px-3 py-2 font-semibold text-right">
                    매입수량
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      {item.model_name}
                    </td>
                    <td className="max-w-[10rem] truncate px-3 py-2 text-zinc-700 dark:text-zinc-300">
                      {item.product_name}
                    </td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                      {parseFulfillmentLocation(item.fulfillment_location)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-red-700 dark:text-red-300">
                      {item.current_stock}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-900 dark:text-zinc-100">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                      {formatKRW(item.purchase_price)}원
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={purchaseQuantities[item.id] ?? ""}
                        onChange={(event) =>
                          updatePurchaseQuantity(item.id, event.target.value)
                        }
                        placeholder="—"
                        className={`${tableInputClass} text-right tabular-nums`}
                        aria-label={`${item.model_name} 매입 수량`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-normal text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            취소
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-normal text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            {isPending ? "등록 중..." : "매입 후 등록"}
          </button>
        </div>
      </div>
    </div>
  );
}
