"use client";

import { useEffect, useState } from "react";
import type { StockInTextMissingRow } from "@/app/(main)/products/actions";
import ProductSearchSelect from "@/components/product-search-select";
import type { SaleProductOption } from "@/types/sale";

type StockInTextMatchDialogProps = {
  row: StockInTextMissingRow;
  initialSearchQuery: string;
  onClose: () => void;
  onConfirm: (product: SaleProductOption) => void;
  isSubmitting?: boolean;
};

export default function StockInTextMatchDialog({
  row,
  initialSearchQuery,
  onClose,
  onConfirm,
  isSubmitting = false,
}: StockInTextMatchDialogProps) {
  const [selectedProduct, setSelectedProduct] =
    useState<SaleProductOption | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onClose]);

  return (
    <div className="fixed inset-0 z-[89] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="flex w-full max-w-lg flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            기존 제품과 매칭
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {row.sku}
            </span>
            에 +{row.quantity}개 입고 · 아래에서 제품을 검색해 선택하세요.
          </p>
        </div>

        <div className="px-5 py-4">
          <ProductSearchSelect
            key={initialSearchQuery}
            inputId="stock_in_text_match_product"
            defaultQuery={initialSearchQuery}
            emphasizeModelName
            showHiddenField={false}
            showHelperText={false}
            selectedProduct={selectedProduct}
            onSelect={setSelectedProduct}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-3 dark:border-zinc-700">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!selectedProduct || isSubmitting}
            onClick={() => {
              if (selectedProduct) onConfirm(selectedProduct);
            }}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 dark:bg-emerald-500"
          >
            {isSubmitting ? "입고 중..." : "선택 제품으로 입고"}
          </button>
        </div>
      </div>
    </div>
  );
}
