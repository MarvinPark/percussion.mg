"use client";

import { useEffect } from "react";

export type ProductRegistrationReport = {
  title: string;
  description?: string;
  successCount?: number;
  successLabel?: string;
  error?: string;
  errors?: string[];
  usedAi?: boolean;
};

type ProductRegistrationReportModalProps = {
  report: ProductRegistrationReport;
  onClose: () => void;
};

export default function ProductRegistrationReportModal({
  report,
  onClose,
}: ProductRegistrationReportModalProps) {
  const errorItems = report.errors ?? [];
  const hasRowErrors = errorItems.length > 0;
  const isTotalFailure = !!report.error && !report.successCount;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-registration-report-title"
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <h3
            id="product-registration-report-title"
            className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
          >
            {report.title}
          </h3>
          {report.description ? (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {report.description}
            </p>
          ) : null}
        </div>

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          {report.successCount ? (
            <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
              {report.successLabel?.replace(
                "{count}",
                String(report.successCount),
              ) ?? `${report.successCount}건 처리되었습니다.`}
            </div>
          ) : null}

          {report.usedAi ? (
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-950 dark:text-blue-200">
              AI가 수입사 엑셀 형식을 분석해 열을 매칭했습니다.
            </p>
          ) : null}

          {report.error ? (
            <div
              className={`rounded-lg px-3 py-2 text-sm ${
                isTotalFailure
                  ? "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
                  : "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
              }`}
            >
              {report.error}
            </div>
          ) : null}

          {hasRowErrors ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                문제 목록 ({errorItems.length}건)
              </p>
              <ul className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-200">
                {errorItems.map((message, index) => (
                  <li key={`${index}-${message}`} className="break-words">
                    {message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end border-t border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-normal text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
