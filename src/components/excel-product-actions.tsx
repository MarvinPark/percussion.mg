"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  importProductsFromExcel,
  type ExcelImportResult,
} from "@/app/(main)/products/excel-actions";
import {
  updateProductsFromExcel,
  type ExcelUpdateResult,
} from "@/app/(main)/products/excel-update-actions";
import ProductRegistrationReportModal, {
  type ProductRegistrationReport,
} from "@/components/product-registration-report-modal";
import ConfirmDialog from "@/components/confirm-dialog";
import {
  productListSortToSearchParams,
  type ProductListSort,
} from "@/lib/product-list-sort";

const buttonClass =
  "inline-flex shrink-0 items-center gap-1 rounded border border-zinc-300 px-2 py-1 text-[12px] leading-none font-normal whitespace-nowrap text-zinc-700 hover:bg-zinc-50 max-md:px-1.5 max-md:text-[10px] dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800";

function ExcelIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3 w-3 shrink-0"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1" y="1" width="14" height="14" rx="1.5" fill="#217346" />
      <path d="M4.5 4.5h7v7h-7v-7z" fill="white" fillOpacity="0.15" />
      <path
        d="M5 8.2 6.4 10 8.8 6.5 10.2 8.2 12 5.5"
        stroke="white"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="4.2"
        y="6.2"
        fill="white"
        fontSize="3.2"
        fontWeight="700"
        fontFamily="Arial, sans-serif"
      >
        X
      </text>
    </svg>
  );
}

function buildImportReport(state: ExcelImportResult): ProductRegistrationReport {
  const hasPartialSuccess = !!state.successCount && !!state.errors?.length;

  return {
    title: hasPartialSuccess ? "엑셀 등록 일부 실패" : "엑셀 등록 실패",
    description: hasPartialSuccess
      ? "일부 행은 등록되었지만, 아래 문제는 확인이 필요합니다."
      : "엑셀 파일을 확인한 뒤 다시 등록해 주세요.",
    successCount: state.successCount,
    successLabel: "{count}개 제품이 등록되었습니다.",
    error: state.error,
    errors: state.errors,
  };
}

function buildUpdateReport(state: ExcelUpdateResult): ProductRegistrationReport {
  const hasPartialSuccess = !!state.successCount && !!state.errors?.length;

  return {
    title: hasPartialSuccess ? "엑셀 수정 일부 실패" : "엑셀 수정 실패",
    description: hasPartialSuccess
      ? "일부 행은 수정되었지만, 아래 문제는 확인이 필요합니다."
      : "엑셀 파일을 확인한 뒤 다시 수정해 주세요.",
    successCount: state.successCount,
    successLabel: "{count}개 제품이 수정되었습니다.",
    error: state.error,
    errors: state.errors,
    usedAi: state.usedAi,
  };
}

function shouldOpenReport(
  state: ExcelImportResult | ExcelUpdateResult | null,
) {
  if (!state) return false;
  return !!state.error || !!state.errors?.length;
}

function SuccessMessage({
  state,
  successLabel,
}: {
  state: ExcelImportResult | ExcelUpdateResult | null;
  successLabel: string;
}) {
  if (!state?.successCount || state.error || state.errors?.length) {
    return null;
  }

  return (
    <p className="max-w-md rounded bg-green-50 px-2 py-1 text-right text-[10px] text-green-700 dark:bg-green-950 dark:text-green-300">
      {successLabel.replace("{count}", String(state.successCount))}
      {"usedAi" in state && state.usedAi ? (
        <span className="mt-1 block text-left text-blue-700 dark:text-blue-300">
          AI가 수입사 엑셀 형식을 분석해 매칭했습니다.
        </span>
      ) : null}
    </p>
  );
}

export default function ExcelProductActions({
  searchQuery = "",
  sort,
}: {
  searchQuery?: string;
  sort?: ProductListSort;
}) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const updateInputRef = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<ProductRegistrationReport | null>(null);
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);

  const [importState, importAction, importPending] = useActionState<
    ExcelImportResult | null,
    FormData
  >(importProductsFromExcel, null);

  const [updateState, updateAction, updatePending] = useActionState<
    ExcelUpdateResult | null,
    FormData
  >(updateProductsFromExcel, null);

  useEffect(() => {
    if (importPending || !importState || !shouldOpenReport(importState)) {
      return;
    }

    setReport(buildImportReport(importState));
    if (importInputRef.current) {
      importInputRef.current.value = "";
    }
  }, [importPending, importState]);

  useEffect(() => {
    if (updatePending || !updateState || !shouldOpenReport(updateState)) {
      return;
    }

    setReport(buildUpdateReport(updateState));
    if (updateInputRef.current) {
      updateInputRef.current.value = "";
    }
  }, [updatePending, updateState]);

  function buildExportUrl() {
    const params = new URLSearchParams();
    if (searchQuery.trim()) {
      params.set("q", searchQuery.trim());
    }
    if (sort) {
      const sortParams = productListSortToSearchParams(sort);
      if (sortParams.sort) params.set("sort", sortParams.sort);
      if (sortParams.order) params.set("order", sortParams.order);
    }
    const query = params.toString();
    return query
      ? `/api/products/excel-export?${query}`
      : "/api/products/excel-export";
  }

  function handleExportConfirm() {
    setExportConfirmOpen(false);
    window.location.assign(buildExportUrl());
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1 max-md:w-full max-md:items-stretch">
        <div className="flex flex-wrap justify-end gap-1 max-md:w-full max-md:flex-nowrap max-md:overflow-x-auto max-md:pb-0.5">
          <a href="/api/products/excel-template" className={buttonClass}>
            <ExcelIcon />
            엑셀양식 다운로드
          </a>

          <form action={importAction} className="inline-flex">
            <input
              ref={importInputRef}
              type="file"
              name="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(event) => {
                if (event.target.files?.[0]) {
                  event.target.form?.requestSubmit();
                }
              }}
            />
            <button
              type="button"
              disabled={importPending}
              onClick={() => importInputRef.current?.click()}
              className={buttonClass}
            >
              <ExcelIcon />
              {importPending ? "등록 중..." : "엑셀 등록"}
            </button>
          </form>

          <form action={updateAction} className="inline-flex">
            <input
              ref={updateInputRef}
              type="file"
              name="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(event) => {
                if (event.target.files?.[0]) {
                  event.target.form?.requestSubmit();
                }
              }}
            />
            <button
              type="button"
              disabled={updatePending}
              onClick={() => updateInputRef.current?.click()}
              className={buttonClass}
            >
              <ExcelIcon />
              {updatePending ? "수정 중..." : "엑셀 수정"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setExportConfirmOpen(true)}
            className={buttonClass}
          >
            <ExcelIcon />
            다운받기
          </button>
        </div>

        <SuccessMessage
          state={importState}
          successLabel="{count}개 제품이 등록되었습니다."
        />
        <SuccessMessage
          state={updateState}
          successLabel="{count}개 제품이 수정되었습니다."
        />
      </div>

      {report ? (
        <ProductRegistrationReportModal
          report={report}
          onClose={() => setReport(null)}
        />
      ) : null}

      {exportConfirmOpen ? (
        <ConfirmDialog
          title="검색된 상품을 엑셀로 다운로드 하시겠습니까?"
          onConfirm={handleExportConfirm}
          onCancel={() => setExportConfirmOpen(false)}
        />
      ) : null}
    </>
  );
}
