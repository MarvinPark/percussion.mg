"use client";

import { useEffect } from "react";
import type { StockInTextMissingRow } from "@/app/(main)/products/actions";

type StockInTextMissingActionDialogProps = {
  row: StockInTextMissingRow;
  onClose: () => void;
  onMatchExisting: () => void;
  onRegisterNew: () => void;
};

export default function StockInTextMissingActionDialog({
  row,
  onClose,
  onMatchExisting,
  onRegisterNew,
}: StockInTextMissingActionDialogProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[88] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          미등록 품목 처리
        </h3>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          <span className="font-medium">{row.sku}</span>
          <span className="text-zinc-500 dark:text-zinc-400">
            {" "}
            · 입고 예정 +{row.quantity}
          </span>
        </p>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          재고 제품(품목)입니다. 이미 등록된 제품과 연결할지, 새로 등록할지
          선택해 주세요.
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onMatchExisting}
            className="rounded-lg border border-blue-600 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200 dark:hover:bg-blue-950/60"
          >
            기존 제품과 매칭
          </button>
          <button
            type="button"
            onClick={onRegisterNew}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 dark:bg-blue-500"
          >
            새로 등록
          </button>
        </div>
      </div>
    </div>
  );
}
