"use client";

import { jsPDF } from "jspdf";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  captureQuoteDocumentFull,
  captureQuoteDocumentPages,
} from "@/lib/quote-document-capture";
import QuoteCardPricingControls from "@/components/quote-card-pricing-controls";
import {
  calculateCardPaymentTotal,
  resolveInvoiceDocumentPricing,
  type AmountRoundingMode,
  type AmountRoundingUnit,
  type CardFeePercent,
} from "@/lib/quote-card-pricing";
import { formatKoreanWonLabel } from "@/lib/korean-number";
import { getQuoteItemVariantLines } from "@/lib/quote-item-display";
import { formatKRW } from "@/lib/sales-calculator";
import {
  SUPPLIER_INFO,
  type QuoteFormData,
  type QuoteItemInput,
} from "@/types/quote";

type PreviewMode = "quote" | "invoice";
type PreviewLayout = "single" | "paginated";

type QuoteDocumentPreviewProps = {
  mode: PreviewMode;
  open: boolean;
  onClose: () => void;
  data: QuoteFormData;
  totals: {
    totalAmount: number;
    totalMargin: number;
    cardAmount: number;
  };
};

const DOCUMENT_PREVIEW_WIDTH_PX = 794;
const FIRST_PAGE_ROWS = 8;
const CONTINUATION_PAGE_ROWS = 16;
const TABLE_COL_WIDTH_4_KOR = "4em";
const TABLE_COL_WIDTH_16_KOR = "16em";
const TABLE_COL_WIDTH_6_KOR = "6em";
const TABLE_COL_WIDTH_3_DIGITS = "3ch";
const TABLE_COL_WIDTH_PRICE = "10ch";

function formatDisplayDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${year}. ${month}. ${day}.`;
}

function paginateItems(items: QuoteItemInput[]) {
  if (items.length === 0) return [[]];

  const pages: QuoteItemInput[][] = [];
  pages.push(items.slice(0, FIRST_PAGE_ROWS));

  let index = FIRST_PAGE_ROWS;
  while (index < items.length) {
    pages.push(items.slice(index, index + CONTINUATION_PAGE_ROWS));
    index += CONTINUATION_PAGE_ROWS;
  }

  return pages;
}

function ProductDescriptionCell({ item }: { item: QuoteItemInput }) {
  const variantLines = getQuoteItemVariantLines(item);

  return (
    <div>
      <div>{item.product_name}</div>
      {variantLines.map((line) => (
        <div
          key={line.label}
          className="mt-0.5 text-[10px] font-normal leading-snug text-zinc-500"
        >
          {line.label}: {line.value}
        </div>
      ))}
    </div>
  );
}

function DocumentTableColGroup({ mode }: { mode: PreviewMode }) {
  return (
    <colgroup>
      <col style={{ width: TABLE_COL_WIDTH_4_KOR }} />
      <col style={{ width: TABLE_COL_WIDTH_4_KOR }} />
      <col style={{ width: TABLE_COL_WIDTH_16_KOR }} />
      <col style={{ width: TABLE_COL_WIDTH_6_KOR }} />
      <col style={{ width: TABLE_COL_WIDTH_3_DIGITS }} />
      {mode === "quote" ? (
        <col style={{ width: TABLE_COL_WIDTH_PRICE }} />
      ) : null}
      <col style={{ width: TABLE_COL_WIDTH_PRICE }} />
      <col style={{ width: TABLE_COL_WIDTH_PRICE }} />
    </colgroup>
  );
}

function DocumentTable({
  items,
  mode,
  totalAmount,
  cardFeePercent,
  cardPaymentTotal,
  showTotal,
  invoiceLinePricing,
  itemStartIndex = 0,
}: {
  items: QuoteItemInput[];
  mode: PreviewMode;
  totalAmount: number;
  cardFeePercent: CardFeePercent;
  cardPaymentTotal: number;
  showTotal: boolean;
  invoiceLinePricing?: Map<string, { adjustedUnitPrice: number; adjustedLineTotal: number }>;
  itemStartIndex?: number;
}) {
  const columnCount = mode === "quote" ? 8 : 7;
  const headCellClass = "border-y border-zinc-400 px-1 py-1";
  const headCellNowrapClass = `${headCellClass} whitespace-nowrap`;
  const bodyCellClass = "border-y border-zinc-400 px-1 py-1";
  const narrowTextCellClass = `${bodyCellClass} overflow-hidden text-ellipsis whitespace-nowrap`;
  const descriptionCellClass = `${bodyCellClass} break-keep [overflow-wrap:anywhere] leading-snug`;
  const priceCellClass = `${bodyCellClass} tabular-nums text-right whitespace-nowrap`;

  function lineKey(item: QuoteItemInput, index: number) {
    return `${item.product_id}-${item.model_name}-${index}`;
  }

  return (
    <table className="w-full min-w-full table-fixed border-collapse text-[11px]">
      <DocumentTableColGroup mode={mode} />
      <thead>
        <tr className="bg-zinc-100">
          <th className={headCellClass}>분류</th>
          <th className={headCellClass}>브랜드</th>
          <th className={headCellClass}>제품 설명</th>
          <th className={headCellClass}>모델명</th>
          <th className={headCellNowrapClass}>수량</th>
          {mode === "quote" ? (
            <th className={headCellNowrapClass}>소비자가</th>
          ) : null}
          <th className={headCellNowrapClass}>판매단가</th>
          <th className={headCellNowrapClass}>총 판매가</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => {
          const globalIndex = itemStartIndex + index;
          const pricing = invoiceLinePricing?.get(lineKey(item, globalIndex));
          const unitPrice =
            mode === "invoice" && pricing
              ? pricing.adjustedUnitPrice
              : item.rounded_unit_price;
          const lineTotal =
            mode === "invoice" && pricing
              ? pricing.adjustedLineTotal
              : item.line_total;

          return (
          <tr key={lineKey(item, globalIndex)}>
            <td className={narrowTextCellClass}>{item.category}</td>
            <td className={narrowTextCellClass}>{item.brand}</td>
            <td className={descriptionCellClass}>
              <ProductDescriptionCell item={item} />
            </td>
            <td className={`${narrowTextCellClass} font-medium`}>
              {item.model_name}
            </td>
            <td className={`${bodyCellClass} text-center tabular-nums`}>
              {item.quantity}
            </td>
            {mode === "quote" ? (
              <td className={priceCellClass}>
                {formatKRW(item.consumer_price)}
              </td>
            ) : null}
            <td className={priceCellClass}>
              {formatKRW(unitPrice)}
            </td>
            <td className={`${priceCellClass} font-medium`}>
              {formatKRW(lineTotal)}
            </td>
          </tr>
          );
        })}
        {showTotal ? (
          <>
            <tr className="bg-zinc-50 font-semibold">
              <td
                colSpan={5}
                className={`${bodyCellClass} text-center`}
              >
                {mode === "invoice" ? "최종금액" : "합계 (부가세포함)"}
              </td>
              <td
                colSpan={mode === "quote" ? 3 : 2}
                className={`total-amount ${bodyCellClass} whitespace-nowrap py-2 text-right text-base font-bold text-red-600`}
              >
                {formatKRW(totalAmount)}원
              </td>
            </tr>
            {mode === "quote" && cardFeePercent > 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className={`card-fee-row ${bodyCellClass} py-1.5 text-right text-[12px] font-medium text-black`}
                >
                  카드결제+{cardFeePercent}%: {formatKRW(cardPaymentTotal)}원
                </td>
              </tr>
            ) : null}
          </>
        ) : null}
      </tbody>
    </table>
  );
}

const COMPANY_SEAL_SRC = "/images/company-seal.jpg";
const COMPANY_SEAL_SIZE_PX = 95;
const COMPANY_SEAL_BOTTOM_PX = -25;

function SupplierInfoBox() {
  return (
    <div className="box rounded border border-zinc-400 p-3 text-sm">
      <p className="mb-2 font-semibold">공급자 정보</p>
      <p>{SUPPLIER_INFO.companyName}</p>
      <p>{SUPPLIER_INFO.brandLine}</p>
      <div className="supplier-company-line relative">
        <p className="relative z-0">{SUPPLIER_INFO.representative}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={COMPANY_SEAL_SRC}
          alt=""
          aria-hidden="true"
          width={COMPANY_SEAL_SIZE_PX}
          height={COMPANY_SEAL_SIZE_PX}
          className="supplier-seal pointer-events-none absolute right-2.5 z-10 object-contain"
          style={{
            width: COMPANY_SEAL_SIZE_PX,
            height: COMPANY_SEAL_SIZE_PX,
            bottom: COMPANY_SEAL_BOTTOM_PX,
          }}
        />
      </div>
      <p>{SUPPLIER_INFO.businessNumber}</p>
      <p>{SUPPLIER_INFO.email}</p>
      <p>{SUPPLIER_INFO.phone}</p>
      <p>{SUPPLIER_INFO.address}</p>
    </div>
  );
}

function DocumentHeader({
  mode,
  data,
}: {
  mode: PreviewMode;
  data: QuoteFormData;
}) {
  const title = mode === "quote" ? "견적서" : "거래명세서";
  const customerEmail = data.customer_email?.trim() ?? "";
  const customerNote = data.customer_note?.trim() ?? "";

  return (
    <>
      <div className="title text-center text-2xl font-bold tracking-[0.25em]">
        {title}
      </div>
      <div className="doc-meta mb-3 flex items-baseline justify-between gap-4 text-sm">
        {mode === "quote" ? (
          <span className="doc-meta-manager min-w-0 whitespace-nowrap">
            담당 {data.manager_name}
            {data.manager_phone ? ` ${data.manager_phone}` : ""}
          </span>
        ) : (
          <span />
        )}
        <span className="doc-meta-date shrink-0 whitespace-nowrap text-right">
          {mode === "quote" ? "견적일" : "거래일"}{" "}
          {formatDisplayDate(data.quote_date)}
        </span>
      </div>

      <div className="grid-2 mb-3 grid grid-cols-2 gap-3">
        <SupplierInfoBox />
        <div className="box rounded border border-zinc-400 p-3 text-sm">
          <p className="mb-2 font-semibold">고객 정보</p>
          <p>거래처명: {data.business_partner ?? ""}</p>
          <p>고객명: {data.customer_name}</p>
          <p>연락처: {data.customer_phone ?? ""}</p>
          <p>주소: {data.customer_address ?? ""}</p>
          {customerEmail ? <p>이메일: {customerEmail}</p> : null}
          {customerNote ? <p>비고: {customerNote}</p> : null}
        </div>
      </div>
    </>
  );
}

function QuoteAmountBar({ totalAmount }: { totalAmount: number }) {
  return (
    <div className="amount-box mb-3 rounded border border-zinc-400 bg-[#fff2cc] p-3">
      <div className="amount-line-full grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-2 text-sm font-semibold">
        <span className="shrink-0">견적금액</span>
        <span className="min-w-0 truncate text-center text-lg font-semibold">
          {formatKoreanWonLabel(totalAmount)}
        </span>
        <span className="amount-value shrink-0 whitespace-nowrap text-xl font-bold tabular-nums">
          {formatKRW(totalAmount)}원
        </span>
      </div>
    </div>
  );
}

function MemoBox({ memo }: { memo: string }) {
  if (!memo) return null;

  return (
    <div className="memo-box mt-2 rounded border border-zinc-400 p-2">
      <p className="text-[12px] font-normal text-zinc-600">메모</p>
      <p className="mt-1 whitespace-pre-line text-[12px] font-normal leading-relaxed text-zinc-800">
        {memo}
      </p>
    </div>
  );
}

function QuoteFooter({
  memo,
}: {
  memo: string;
}) {
  return (
    <div className="mt-3 text-sm">
      <MemoBox memo={memo} />
      <div className="footer whitespace-pre-line pt-3 text-xs text-zinc-700">
        {SUPPLIER_INFO.footerNote}
      </div>
      <p className="bank-info mt-3 text-center text-sm font-semibold text-red-600">
        {SUPPLIER_INFO.bank}
      </p>
    </div>
  );
}

function InvoiceFooter() {
  return (
    <div className="mt-6">
      <p className="invoice-receipt text-center text-base font-semibold">
        {SUPPLIER_INFO.transactionReceipt}
      </p>
      <p className="invoice-bank mt-2 text-center text-[10px] text-zinc-600">
        {SUPPLIER_INFO.bank}
      </p>
    </div>
  );
}

const PRINT_PAGE_STYLES = `
  @page { size: A4; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .print-page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    page-break-after: always;
    break-after: page;
    overflow: hidden;
  }
  .print-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .print-page img {
    display: block;
    width: 100%;
    height: auto;
  }
`;

function buildPrintDocumentHtml(title: string, pageCanvases: HTMLCanvasElement[]) {
  const pagesHtml = pageCanvases
    .map((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      return `<div class="print-page"><img src="${imgData}" alt="" /></div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>${PRINT_PAGE_STYLES}</style>
  </head>
  <body>${pagesHtml}</body>
</html>`;
}

async function waitForPrintImages(doc: Document) {
  const images = Array.from(doc.querySelectorAll("img"));
  if (images.length === 0) return;

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          image.onload = () => resolve();
          image.onerror = () => resolve();
        }),
    ),
  );
}

const controlSelectClass =
  "rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

function DocumentDateControl({
  mode,
  value,
  onChange,
}: {
  mode: PreviewMode;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
      <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
        {mode === "quote" ? "견적일" : "거래일"}
      </label>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={controlSelectClass}
      />
    </div>
  );
}

function DocumentPreviewLayoutControl({
  pageCount,
  layout,
  onChange,
}: {
  pageCount: number;
  layout: PreviewLayout;
  onChange: (layout: PreviewLayout) => void;
}) {
  if (pageCount <= 1) return null;

  const optionClass = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
      active
        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
        : "border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
    }`;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
      <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
        보기
      </span>
      <button
        type="button"
        aria-pressed={layout === "single"}
        onClick={() => onChange("single")}
        className={optionClass(layout === "single")}
      >
        1페이지로 보기
      </button>
      <button
        type="button"
        aria-pressed={layout === "paginated"}
        onClick={() => onChange("paginated")}
        className={optionClass(layout === "paginated")}
      >
        {pageCount}페이지로 보기
      </button>
    </div>
  );
}

const headerButtonClass =
  "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800";

function sanitizeFileNamePart(value: string, fallback: string) {
  return value.replace(/[\\/:*?"<>|]/g, "_").trim() || fallback;
}

function formatDocumentFileDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return "날짜없음";
  return `${year}.${month}.${day}`;
}

function buildDocumentFileName(
  customerName: string,
  managerName: string,
  quoteDate: string,
) {
  const safeDate = formatDocumentFileDate(quoteDate);
  const safeManager = sanitizeFileNamePart(managerName, "담당자");
  const safeCustomer = sanitizeFileNamePart(customerName, "고객");
  return `${safeDate}(${safeManager}) ${safeCustomer}`;
}

export default function QuoteDocumentPreview({
  mode,
  open,
  onClose,
  data,
  totals,
}: QuoteDocumentPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [documentDate, setDocumentDate] = useState(data.quote_date);
  const [cardFeePercent, setCardFeePercent] = useState<CardFeePercent>(0);
  const [roundingUnit, setRoundingUnit] = useState<AmountRoundingUnit>(1000);
  const [roundingMode, setRoundingMode] = useState<AmountRoundingMode>("ceil");
  const [previewLayout, setPreviewLayout] = useState<PreviewLayout>("paginated");

  useEffect(() => {
    if (!open) return;
    setDocumentDate(data.quote_date);
    setCardFeePercent(0);
    setRoundingUnit(1000);
    setRoundingMode("ceil");
    setPreviewLayout("paginated");
  }, [data.quote_date, mode, open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const previewData = useMemo(
    () => ({ ...data, quote_date: documentDate }),
    [data, documentDate],
  );

  const itemPages = useMemo(() => paginateItems(data.items), [data.items]);
  const displayPages = useMemo(
    () => (previewLayout === "single" ? [data.items] : itemPages),
    [data.items, itemPages, previewLayout],
  );

  const cardPaymentTotal = useMemo(
    () =>
      calculateCardPaymentTotal(
        totals.totalAmount,
        cardFeePercent,
        roundingUnit,
        roundingMode,
      ),
    [totals.totalAmount, cardFeePercent, roundingUnit, roundingMode],
  );

  const invoicePricing = useMemo(
    () =>
      resolveInvoiceDocumentPricing(
        data.items,
        cardFeePercent,
        roundingUnit,
        roundingMode,
      ),
    [data.items, cardFeePercent, roundingUnit, roundingMode],
  );

  const invoiceLinePricing = useMemo(() => {
    const map = new Map<
      string,
      { adjustedUnitPrice: number; adjustedLineTotal: number }
    >();

    data.items.forEach((item, index) => {
      const key = `${item.product_id}-${item.model_name}-${index}`;
      const pricing = invoicePricing.linePricing[index];
      if (pricing) map.set(key, pricing);
    });

    return map;
  }, [data.items, invoicePricing.linePricing]);

  const documentTotalAmount =
    mode === "invoice" ? invoicePricing.documentTotal : totals.totalAmount;

  if (!open) return null;

  const title = mode === "quote" ? "견적서" : "거래명세서";
  const isBusy = isPdfGenerating || isPrinting || isCopying;

  async function handlePrint() {
    const content = printRef.current;
    if (!content || isBusy) return;

    setIsPrinting(true);
    setActionMessage(null);

    try {
      const pageCanvases = await captureQuoteDocumentPages(content);
      if (pageCanvases.length === 0) {
        throw new Error("no pages");
      }

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        setActionMessage("팝업이 차단되어 인쇄할 수 없습니다.");
        return;
      }

      printWindow.document.write(
        buildPrintDocumentHtml(title, pageCanvases),
      );
      printWindow.document.close();
      await waitForPrintImages(printWindow.document);
      printWindow.focus();
      printWindow.print();
    } catch (error) {
      console.error("quote print failed:", error);
      setActionMessage("인쇄 준비에 실패했습니다.");
    } finally {
      setIsPrinting(false);
    }
  }

  async function handlePdfExport() {
    const content = printRef.current;
    if (!content || isBusy) return;

    setIsPdfGenerating(true);
    setActionMessage(null);

    try {
      const pageCanvases = await captureQuoteDocumentPages(content);
      if (pageCanvases.length === 0) {
        throw new Error("no pages");
      }

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      pageCanvases.forEach((canvas, index) => {
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        let renderWidth = pageWidth;
        let renderHeight = (canvas.height * pageWidth) / canvas.width;

        if (renderHeight > pageHeight) {
          renderHeight = pageHeight;
          renderWidth = (canvas.width * pageHeight) / canvas.height;
        }

        const offsetX = (pageWidth - renderWidth) / 2;

        if (index > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, "JPEG", offsetX, 0, renderWidth, renderHeight);
      });

      pdf.save(
        `${buildDocumentFileName(data.customer_name, data.manager_name, documentDate)}.pdf`,
      );

      setActionMessage("PDF 파일을 저장했습니다.");
    } catch (error) {
      console.error("quote pdf export failed:", error);
      setActionMessage("PDF 다운에 실패했습니다.");
    } finally {
      setIsPdfGenerating(false);
    }
  }

  async function handleCopyCapture() {
    const content = printRef.current;
    if (!content || isBusy) return;

    setIsCopying(true);
    setActionMessage(null);

    try {
      const canvas = await captureQuoteDocumentFull(content);
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((value) => resolve(value), "image/png");
      });

      if (!blob) {
        setActionMessage("캡쳐 생성에 실패했습니다.");
        return;
      }

      if (
        typeof ClipboardItem !== "undefined" &&
        navigator.clipboard?.write
      ) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          setActionMessage("캡쳐 후 클립보드에 복사했습니다.");
          return;
        } catch {
          // fall through to PNG download
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${buildDocumentFileName(data.customer_name, data.manager_name, documentDate)}.png`;
      link.click();
      URL.revokeObjectURL(url);
      setActionMessage("클립보드 복사를 지원하지 않아 PNG 파일로 저장했습니다.");
    } catch (error) {
      console.error("quote capture copy failed:", error);
      setActionMessage("캡쳐 후 복사에 실패했습니다.");
    } finally {
      setIsCopying(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            {title} 미리보기
            {itemPages.length > 1 ? ` (${itemPages.length}페이지)` : ""}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handlePdfExport()}
              disabled={isBusy}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-500 dark:hover:bg-red-400"
            >
              {isPdfGenerating ? "PDF 다운 중..." : "PDF다운"}
            </button>
            <button
              type="button"
              onClick={() => void handleCopyCapture()}
              disabled={isBusy}
              className={headerButtonClass}
            >
              {isCopying ? "캡쳐 중..." : "캡쳐후복사"}
            </button>
            <button
              type="button"
              onClick={() => void handlePrint()}
              disabled={isBusy}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-700"
            >
              {isPrinting ? "인쇄 준비 중..." : "인쇄"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600"
            >
              닫기
            </button>
          </div>
        </div>

        {actionMessage ? (
          <p className="border-b border-zinc-200 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
            {actionMessage}
          </p>
        ) : null}

        <DocumentDateControl
          mode={mode}
          value={documentDate}
          onChange={setDocumentDate}
        />

        <DocumentPreviewLayoutControl
          pageCount={itemPages.length}
          layout={previewLayout}
          onChange={setPreviewLayout}
        />

        <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <QuoteCardPricingControls
            compact
            cardFeePercent={cardFeePercent}
            roundingUnit={roundingUnit}
            roundingMode={roundingMode}
            onCardFeePercentChange={setCardFeePercent}
            onRoundingUnitChange={setRoundingUnit}
            onRoundingModeChange={setRoundingMode}
            helperText={
              cardFeePercent === 0
                ? "카드 수수료가 없으면 금액 조정 없이 기본 금액이 표시됩니다."
                : mode === "invoice"
                  ? "최종금액은 견적서·매출전환과 같이 합계 기준으로 계산되며, 차액은 마지막 제품 줄에 반영됩니다."
                  : "견적서 하단 카드결제 금액에 반영됩니다."
            }
          />
        </div>

        <div className="overflow-x-auto overflow-y-auto overscroll-x-contain p-4">
          <div
            ref={printRef}
            className="mx-auto shrink-0 bg-white text-zinc-900"
            style={{ width: DOCUMENT_PREVIEW_WIDTH_PX }}
          >
            {displayPages.map((pageItems, pageIndex) => {
              const isPaginatedView = previewLayout === "paginated";
              const isFirstPage = pageIndex === 0;
              const isLastPage = pageIndex === displayPages.length - 1;
              const itemStartIndex =
                !isPaginatedView || pageIndex === 0
                  ? 0
                  : FIRST_PAGE_ROWS + (pageIndex - 1) * CONTINUATION_PAGE_ROWS;

              return (
                <div
                  key={`page-${pageIndex}-${previewLayout}`}
                  className={`print-page bg-white p-4 ${
                    isPaginatedView && pageIndex > 0
                      ? "mt-8 border-t-4 border-dashed border-zinc-300 pt-8"
                      : ""
                  }`}
                >
                  {isFirstPage ? (
                    <DocumentHeader mode={mode} data={previewData} />
                  ) : isPaginatedView ? (
                    <div className="mb-3 text-right text-xs text-zinc-500">
                      {title} (계속) · {pageIndex + 1}/{displayPages.length}페이지
                    </div>
                  ) : null}

                  {isFirstPage && mode === "quote" ? (
                    <QuoteAmountBar totalAmount={totals.totalAmount} />
                  ) : null}

                  <DocumentTable
                    items={pageItems}
                    mode={mode}
                    totalAmount={documentTotalAmount}
                    cardFeePercent={cardFeePercent}
                    cardPaymentTotal={cardPaymentTotal}
                    showTotal={isLastPage}
                    invoiceLinePricing={
                      mode === "invoice" ? invoiceLinePricing : undefined
                    }
                    itemStartIndex={itemStartIndex}
                  />

                  {isLastPage && mode === "quote" ? (
                    <QuoteFooter memo={data.memo} />
                  ) : null}

                  {isLastPage && mode === "invoice" ? (
                    <>
                      <MemoBox memo={data.memo} />
                      <InvoiceFooter />
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
