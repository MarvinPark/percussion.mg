"use client";

import { useMemo, useState, useTransition } from "react";
import {
  cancelTaxInvoiceIssue,
  getTaxInvoicePdfUrl,
} from "@/app/(main)/sales/invoice-actions";
import TaxInvoicePreview from "@/components/tax-invoice-preview";
import TaxInvoicePreviewActions from "@/components/tax-invoice-preview-actions";
import { formatKRW } from "@/lib/sales-calculator";
import { buildTaxInvoicePreviewDataFromIssue } from "@/lib/tax-invoice-preview-data";
import { formatTaxInvoiceDateLabel } from "@/lib/tax-invoice-issues";
import type { TaxInvoiceIssue } from "@/types/tax-invoice";

const buttonClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

type TaxInvoiceDetailDialogProps = {
  issue: TaxInvoiceIssue;
  onClose: () => void;
  onUpdated?: () => void;
};

export default function TaxInvoiceDetailDialog({
  issue,
  onClose,
  onUpdated,
}: TaxInvoiceDetailDialogProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isCancelling, startCancel] = useTransition();

  const previewData = useMemo(
    () => buildTaxInvoicePreviewDataFromIssue(issue),
    [issue],
  );

  const isCancelled = Boolean(issue.cancelled_at);
  const canCancel =
    !isCancelled &&
    !issue.popbill_state?.includes("취소") &&
    !issue.popbill_state?.includes("국세청");

  function handleCancel() {
    const confirmed = window.confirm(
      "이 세금계산서 발행을 취소하시겠습니까? 국세청 전송 전 발행완료 상태에서만 취소할 수 있습니다.",
    );
    if (!confirmed) return;

    setActionError(null);
    setActionMessage(null);
    startCancel(async () => {
      const result = await cancelTaxInvoiceIssue({ issueId: issue.id });
      if ("error" in result) {
        setActionError(result.error ?? "발행 취소에 실패했습니다.");
        return;
      }
      setActionMessage("발행을 취소했습니다.");
      onUpdated?.();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-labelledby="tax-invoice-detail-title"
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-700">
          <div>
            <h2
              id="tax-invoice-detail-title"
              className="text-lg font-bold text-zinc-900 dark:text-zinc-100"
            >
              세금계산서 상세
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {issue.partner_name} · {formatKRW(issue.total_amount)}원 ·{" "}
              {formatTaxInvoiceDateLabel(issue.write_date)}
            </p>
            {issue.popbill_state ? (
              <p className="mt-1 text-xs text-zinc-500">
                Popbill 상태: {issue.popbill_state}
                {issue.nts_confirm_num ? ` · 승인번호 ${issue.nts_confirm_num}` : ""}
              </p>
            ) : null}
            {isCancelled ? (
              <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-300">
                취소됨 {issue.cancel_memo ? `(${issue.cancel_memo})` : ""}
              </p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className={buttonClass}>
            닫기
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
            <TaxInvoicePreview data={previewData} />
          </div>

          <TaxInvoicePreviewActions
            fileBaseName={`tax-invoice-${issue.mgt_key}`}
            onPopbillPdfDownload={async () => {
              const result = await getTaxInvoicePdfUrl({ mgtKey: issue.mgt_key });
              if ("error" in result) return { error: result.error ?? "PDF URL을 가져오지 못했습니다." };
              return result.url;
            }}
            disabled={isCancelled}
          />

          {canCancel ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling}
                className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
              >
                {isCancelling ? "취소 중…" : "발행 취소"}
              </button>
            </div>
          ) : null}

          {actionMessage ? (
            <p className="text-sm text-green-700 dark:text-green-300">{actionMessage}</p>
          ) : null}
          {actionError ? (
            <p className="text-sm text-red-700 dark:text-red-300">{actionError}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
