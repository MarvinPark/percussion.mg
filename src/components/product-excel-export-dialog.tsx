"use client";

import { useEffect, useRef } from "react";

type ProductExcelExportDialogProps = {
  filteredCount: number;
  isFilterActive: boolean;
  selectedCount: number;
  isExporting: boolean;
  onExportFiltered: () => void;
  onExportSelected: () => void;
  onCancel: () => void;
};

const cancelButtonClass =
  "rounded-lg border border-zinc-300 px-4 py-2 text-sm font-normal text-zinc-700 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus-visible:ring-offset-zinc-900";

const optionButtonClass =
  "w-full rounded-lg border border-zinc-200 px-4 py-3 text-left text-sm transition hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:hover:bg-zinc-800 dark:focus-visible:ring-offset-zinc-900";

export default function ProductExcelExportDialog({
  filteredCount,
  isFilterActive,
  selectedCount,
  isExporting,
  onExportFiltered,
  onExportSelected,
  onCancel,
}: ProductExcelExportDialogProps) {
  const firstOptionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstOptionRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isExporting) {
        event.preventDefault();
        onCancel();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isExporting, onCancel]);

  const filteredDescription = isFilterActive
    ? `검색·필터 조건에 맞는 전체 ${filteredCount.toLocaleString("ko-KR")}건 (현재 페이지만이 아님)`
    : `검색·필터 없음 · 등록된 전체 ${filteredCount.toLocaleString("ko-KR")}건`;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      onClick={() => {
        if (!isExporting) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-excel-export-title"
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(event) => event.stopPropagation()}
      >
        <h3
          id="product-excel-export-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
        >
          엑셀 다운로드
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          아래 두 가지 중 하나를 선택해 주세요.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <button
            ref={firstOptionRef}
            type="button"
            disabled={isExporting || filteredCount === 0}
            onClick={onExportFiltered}
            className={optionButtonClass}
          >
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              1. 검색된 모든상품 다운로드
            </span>
            <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
              {filteredDescription}
              {isExporting ? " · 준비 중..." : ""}
            </span>
          </button>

          <button
            type="button"
            disabled={isExporting || selectedCount === 0}
            onClick={onExportSelected}
            className={optionButtonClass}
          >
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              2. 선택한상품만 다운로드 (체크박스에 체크한 제품)
            </span>
            <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
              {selectedCount > 0
                ? `현재 ${selectedCount.toLocaleString("ko-KR")}건 선택됨`
                : "목록 체크박스를 선택한 뒤 이용해 주세요"}
            </span>
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isExporting}
            className={cancelButtonClass}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
