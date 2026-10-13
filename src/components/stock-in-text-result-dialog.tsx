"use client";

import { useEffect } from "react";
import type {
  StockInTextApplyRow,
  StockInTextMissingRow,
} from "@/app/(main)/products/actions";
import type { StockInTextParseError } from "@/lib/stock-in-text-parser";

export type StockInTextResultState = {
  movement_date: string;
  supplier: string | null;
  applied: StockInTextApplyRow[];
  not_found: StockInTextMissingRow[];
  parse_errors: StockInTextParseError[];
};

type StockInTextResultDialogProps = {
  result: StockInTextResultState;
  onClose: () => void;
  onResolveMissing: (row: StockInTextMissingRow) => void;
};

export default function StockInTextResultDialog({
  result,
  onClose,
  onResolveMissing,
}: StockInTextResultDialogProps) {
  const hasApplied = result.applied.length > 0;
  const hasMissing = result.not_found.length > 0;
  const hasParseWarnings = result.parse_errors.length > 0;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-in-text-result-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <h3
            id="stock-in-text-result-title"
            className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
          >
            텍스트 입고 결과
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            입고일 {result.movement_date}
            {result.supplier ? ` · 매입처 ${result.supplier}` : ""}
          </p>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          {hasApplied ? (
            <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
              <p className="font-semibold">
                입고 반영 {result.applied.length}건 · 총{" "}
                {result.applied.reduce((sum, row) => sum + row.quantity, 0)}개
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                {result.applied.map((row) => (
                  <li key={`${row.product_id}-${row.sku}`}>
                    {row.sku} · {row.product_name} · +{row.quantity}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              반영된 입고가 없습니다.
            </p>
          )}

          {hasMissing ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                미등록 품목 ({result.not_found.length}건)
              </p>
              <ul className="space-y-2">
                {result.not_found.map((row) => (
                  <li key={row.sku}>
                    <button
                      type="button"
                      onClick={() => onResolveMissing(row)}
                      className="w-full rounded-lg border border-dashed border-blue-400 bg-blue-50/50 px-3 py-2 text-left text-sm hover:bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30 dark:hover:bg-blue-950/50"
                    >
                      <span className="font-medium text-blue-900 dark:text-blue-200">
                        {row.sku}
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-600 dark:text-zinc-400">
                        입고 예정 +{row.quantity}
                        {row.is_stock_product
                          ? " · 기존 제품 매칭 또는 새로 등록"
                          : " · 등록 후 재고 반영"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {hasParseWarnings ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                형식 오류 ({result.parse_errors.length}줄, 건너뜀)
              </p>
              <ul className="max-h-32 space-y-1 overflow-y-auto text-xs text-zinc-600 dark:text-zinc-400">
                {result.parse_errors.map((err) => (
                  <li key={`${err.lineNumber}-${err.text}`}>
                    {err.lineNumber}행: {err.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end border-t border-zinc-200 px-5 py-3 dark:border-zinc-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
