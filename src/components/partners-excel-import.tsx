"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  importPartnersFromExcel,
  type PartnerExcelImportResult,
} from "@/app/(main)/partners/excel-actions";
import ProductRegistrationReportModal, {
  type ProductRegistrationReport,
} from "@/components/product-registration-report-modal";

const buttonClass =
  "inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

function ExcelIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 shrink-0"
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
    </svg>
  );
}

function buildImportReport(state: PartnerExcelImportResult): ProductRegistrationReport {
  const hasPartialSuccess =
    ((state.successCount ?? 0) > 0 || (state.updatedCount ?? 0) > 0) &&
    !!state.errors?.length;

  return {
    title: hasPartialSuccess ? "거래처 일괄등록 일부 실패" : "거래처 일괄등록 실패",
    description: hasPartialSuccess
      ? "일부 거래처는 등록되었지만, 아래 문제는 확인이 필요합니다."
      : "엑셀 파일을 확인한 뒤 다시 등록해 주세요.",
    successCount: (state.successCount ?? 0) + (state.updatedCount ?? 0),
    successLabel: `{count}개 거래처가 처리되었습니다. (신규 ${state.successCount ?? 0} / 수정 ${state.updatedCount ?? 0})`,
    error: state.error,
    errors: state.errors,
  };
}

type PartnersExcelImportProps = {
  disabled?: boolean;
};

export default function PartnersExcelImport({
  disabled = false,
}: PartnersExcelImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<ProductRegistrationReport | null>(null);
  const [state, formAction, isPending] = useActionState(
    importPartnersFromExcel,
    null,
  );

  useEffect(() => {
    if (!state) return;

    if (state.error || state.errors?.length) {
      setReport(buildImportReport(state));
      return;
    }

    if ((state.successCount ?? 0) > 0 || (state.updatedCount ?? 0) > 0) {
      setReport({
        title: "거래처 일괄등록 완료",
        description: "엑셀 파일의 거래처 정보가 반영되었습니다.",
        successCount: (state.successCount ?? 0) + (state.updatedCount ?? 0),
        successLabel: `{count}개 거래처가 처리되었습니다. (신규 ${state.successCount ?? 0} / 수정 ${state.updatedCount ?? 0})`,
      });
    }
  }, [state]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);
    formAction(formData);
    event.target.value = "";
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <a href="/api/partners/excel-template" className={buttonClass}>
          <ExcelIcon />
          양식 다운로드
        </a>

        <form>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            disabled={disabled || isPending}
            onClick={() => fileInputRef.current?.click()}
            className={buttonClass}
          >
            <ExcelIcon />
            {isPending ? "등록 중…" : "거래처 일괄등록"}
          </button>
        </form>
      </div>

      {report ? (
        <ProductRegistrationReportModal
          report={report}
          onClose={() => setReport(null)}
        />
      ) : null}
    </>
  );
}
