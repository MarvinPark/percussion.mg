"use client";

import { useState, useTransition } from "react";
import {
  copyTaxInvoicePreviewToClipboard,
  downloadTaxInvoicePreviewPdf,
} from "@/lib/tax-invoice-document-capture";

const buttonClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

type TaxInvoicePreviewActionsProps = {
  fileBaseName: string;
  popbillPdfUrl?: string | null;
  onPopbillPdfDownload?: () => Promise<string | { error: string }>;
  disabled?: boolean;
};

export default function TaxInvoicePreviewActions({
  fileBaseName,
  popbillPdfUrl,
  onPopbillPdfDownload,
  disabled = false,
}: TaxInvoicePreviewActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, startTransition] = useTransition();

  function getPreviewElement() {
    const element = document.querySelector<HTMLElement>(".tax-invoice-preview");
    if (!element) {
      throw new Error("세금계산서 미리보기를 찾지 못했습니다.");
    }
    return element;
  }

  function handlePreviewPdfDownload() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await downloadTaxInvoicePreviewPdf(
          getPreviewElement(),
          `${fileBaseName}.pdf`,
        );
        setMessage("PDF를 저장했습니다.");
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "PDF 저장에 실패했습니다.",
        );
      }
    });
  }

  function handleCopyImage() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await copyTaxInvoicePreviewToClipboard(getPreviewElement());
        setMessage("세금계산서 이미지를 클립보드에 복사했습니다.");
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "클립보드 복사에 실패했습니다.",
        );
      }
    });
  }

  function handlePopbillPdfDownload() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        if (popbillPdfUrl) {
          window.open(popbillPdfUrl, "_blank", "noopener,noreferrer");
          setMessage("Popbill PDF를 열었습니다.");
          return;
        }

        if (!onPopbillPdfDownload) {
          throw new Error("Popbill PDF를 사용할 수 없습니다.");
        }

        const result = await onPopbillPdfDownload();
        if (typeof result === "string") {
          window.open(result, "_blank", "noopener,noreferrer");
          setMessage("Popbill PDF를 열었습니다.");
          return;
        }

        throw new Error(result.error);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Popbill PDF 열기에 실패했습니다.",
        );
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handlePreviewPdfDownload}
          disabled={disabled || isWorking}
          className={buttonClass}
        >
          PDF 저장
        </button>
        <button
          type="button"
          onClick={handleCopyImage}
          disabled={disabled || isWorking}
          className={buttonClass}
        >
          캡처 후 복사
        </button>
        {popbillPdfUrl || onPopbillPdfDownload ? (
          <button
            type="button"
            onClick={handlePopbillPdfDownload}
            disabled={disabled || isWorking}
            className={buttonClass}
          >
            Popbill PDF
          </button>
        ) : null}
      </div>
      {message ? (
        <p className="text-xs text-green-700 dark:text-green-300">{message}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
      ) : null}
    </div>
  );
}
