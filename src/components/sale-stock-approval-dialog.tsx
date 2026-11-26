"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseFulfillmentLocation } from "@/lib/quote-fulfillment";
import {
  projectStockAfterWithInbound,
  type SaleStockApprovalItem,
} from "@/lib/sale-stock-approval";

const tableInputClass =
  "w-full min-w-[3.5rem] rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

type SaleStockApprovalDialogProps = {
  title: string;
  description: string;
  items: SaleStockApprovalItem[];
  confirmLabel?: string;
  isPending?: boolean;
  enableInboundQuantityInput?: boolean;
  initialPurchaseQuantities?: Record<string, number>;
  onConfirm: (purchaseQuantities?: Record<string, number>) => void;
  onCancel: () => void;
};

function defaultInboundPlaceholder(item: SaleStockApprovalItem) {
  return Math.max(0, item.quantity - item.current_stock);
}

export default function SaleStockApprovalDialog({
  title,
  description,
  items,
  confirmLabel = "승인 후 진행",
  isPending = false,
  enableInboundQuantityInput = false,
  initialPurchaseQuantities,
  onConfirm,
  onCancel,
}: SaleStockApprovalDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const [inboundQuantities, setInboundQuantities] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      items.map((item) => {
        const fromInitial = initialPurchaseQuantities?.[item.id];
        const resolved =
          fromInitial !== undefined && fromInitial > 0
            ? fromInitial
            : item.purchase_quantity > 0
              ? item.purchase_quantity
              : 0;
        return [item.id, resolved > 0 ? String(resolved) : ""];
      }),
    ),
  );

  const parsedInboundByItem = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      const raw = inboundQuantities[item.id]?.trim() ?? "";
      const parsed = raw ? Math.max(0, Math.round(Number(raw) || 0)) : 0;
      map.set(item.id, parsed);
    }
    return map;
  }, [inboundQuantities, items]);

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

  function updateInboundQuantity(itemId: string, value: string) {
    setInboundQuantities((current) => ({
      ...current,
      [itemId]: value,
    }));
  }

  function handleConfirm() {
    if (!enableInboundQuantityInput) {
      onConfirm();
      return;
    }

    onConfirm(
      Object.fromEntries(
        items.map((item) => [item.id, parsedInboundByItem.get(item.id) ?? 0]),
      ),
    );
  }

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
          {enableInboundQuantityInput
            ? "매장 출고 후 재고가 부족합니다. 입고 수량을 입력하면 출고 후 예상 재고가 바로 갱신됩니다. 그대로 진행하면 마이너스 재고로 매출 전환됩니다."
            : "매장 출고 후 재고가 0 미만이 됩니다. 품목별 현재 재고와 출고 후 예상 재고를 확인한 뒤 진행해 주세요."}
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
                {enableInboundQuantityInput ? (
                  <th className="min-w-[5.5rem] px-3 py-2 font-semibold text-right">
                    입고 수량
                  </th>
                ) : null}
                <th className="px-3 py-2 font-semibold text-right">출고후</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const inbound = enableInboundQuantityInput
                  ? (parsedInboundByItem.get(item.id) ?? 0)
                  : item.purchase_quantity;
                const stockAfter = enableInboundQuantityInput
                  ? projectStockAfterWithInbound(item, inbound)
                  : item.stock_after;

                return (
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
                    {enableInboundQuantityInput ? (
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          value={inboundQuantities[item.id] ?? ""}
                          onChange={(event) =>
                            updateInboundQuantity(item.id, event.target.value)
                          }
                          placeholder={String(defaultInboundPlaceholder(item))}
                          className={`${tableInputClass} text-right tabular-nums`}
                          aria-label={`${item.model_name} 입고 수량`}
                        />
                      </td>
                    ) : null}
                    <td
                      className={`px-3 py-2 text-right tabular-nums font-semibold ${
                        stockAfter < 0
                          ? "text-red-700 dark:text-red-300"
                          : "text-zinc-900 dark:text-zinc-100"
                      }`}
                    >
                      {stockAfter}
                    </td>
                  </tr>
                );
              })}
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
            onClick={handleConfirm}
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