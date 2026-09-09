"use client";

import { useEffect, useRef } from "react";
import { parseFulfillmentLocation } from "@/lib/quote-fulfillment";
import type { SaleStockApprovalItem } from "@/lib/sale-stock-approval";

type SaleStockApprovalDialogProps = {
  title: string;
  description: string;
  items: SaleStockApprovalItem[];
  confirmLabel?: string;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function SaleStockApprovalDialog({
  title,
  description,
  items,
  confirmLabel = "승인 후 진행",
  isPending = false,
  onConfirm,
  onCancel,
}: SaleStockApprovalDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

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

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-stock-approval-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h3
          id="sale-stock-approval-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
        >
          {title}
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {description}
        </p>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          매장 출고 후 재고가 0 미만이 됩니다. 품목별 현재 재고와 출고 후 예상
          재고를 확인한 뒤 진행해 주세요.
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="min-w-full text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-semibold">모델명</th>
                <th className="px-3 py-2 font-semibold">제품명</th>
                <th className="px-3 py-2 font-semibold">출고</th>
                <th className="px-3 py-2 font-semibold text-right">현재재고</th>
                <th className="px-3 py-2 font-semibold text-right">출고수량</th>
                <th className="px-3 py-2 font-semibold text-right">출고후</th>
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
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-900 dark:text-zinc-100">
                    {item.current_stock}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-900 dark:text-zinc-100">
                    {item.quantity}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-red-700 dark:text-red-300">
                    {item.stock_after}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-normal text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            {isPending ? "처리 중..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
