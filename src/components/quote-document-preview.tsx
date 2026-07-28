"use client";

import { useMemo, useRef } from "react";
import { formatKoreanWonLabel } from "@/lib/korean-number";
import { formatKRW } from "@/lib/sales-calculator";
import {
  SUPPLIER_INFO,
  type QuoteFormData,
  type QuoteItemInput,
} from "@/types/quote";

type PreviewMode = "quote" | "invoice";

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

const FIRST_PAGE_ROWS = 8;
const CONTINUATION_PAGE_ROWS = 16;

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

function DocumentTable({
  items,
  mode,
  totalAmount,
  cardAmount,
  showTotal,
}: {
  items: QuoteItemInput[];
  mode: PreviewMode;
  totalAmount: number;
  cardAmount: number;
  showTotal: boolean;
}) {
  const columnCount = mode === "quote" ? 8 : 7;

  return (
    <table className="w-full border-collapse text-[11px]">
      <thead>
        <tr className="border border-zinc-400 bg-zinc-100">
          <th className="border border-zinc-400 px-1 py-1">분류</th>
          <th className="border border-zinc-400 px-1 py-1">브랜드</th>
          <th className="border border-zinc-400 px-1 py-1">제품 설명</th>
          <th className="border border-zinc-400 px-1 py-1">모델명</th>
          <th className="border border-zinc-400 px-1 py-1">수량</th>
          {mode === "quote" ? (
            <th className="border border-zinc-400 px-1 py-1">소비자가</th>
          ) : null}
          <th className="border border-zinc-400 px-1 py-1">판매단가</th>
          <th className="border border-zinc-400 px-1 py-1">총 판매가</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={`${item.product_id}-${index}`}>
            <td className="border border-zinc-400 px-1 py-1">{item.category}</td>
            <td className="border border-zinc-400 px-1 py-1">{item.brand}</td>
            <td className="border border-zinc-400 px-1 py-1">
              {item.product_name}
            </td>
            <td className="border border-zinc-400 px-1 py-1 font-medium">
              {item.model_name}
            </td>
            <td className="border border-zinc-400 px-1 py-1 text-center">
              {item.quantity}
            </td>
            {mode === "quote" ? (
              <td className="border border-zinc-400 px-1 py-1 text-right">
                {formatKRW(item.consumer_price)}
              </td>
            ) : null}
            <td className="border border-zinc-400 px-1 py-1 text-right">
              {formatKRW(item.rounded_unit_price)}
            </td>
            <td className="border border-zinc-400 px-1 py-1 text-right font-medium">
              {formatKRW(item.line_total)}
            </td>
          </tr>
        ))}
        {showTotal ? (
          <>
            <tr className="bg-zinc-50 font-semibold">
              <td
                colSpan={5}
                className="border border-zinc-400 px-1 py-1 text-center"
              >
                합계
              </td>
              {mode === "quote" ? (
                <td className="border border-zinc-400 px-1 py-1 text-right">
                  (부가세포함)
                </td>
              ) : null}
              <td className="border border-zinc-400 px-1 py-1">&nbsp;</td>
              <td className="total-amount border border-zinc-400 px-1 py-2 text-right text-base font-bold text-red-600">
                {formatKRW(totalAmount)}원
              </td>
            </tr>
            <tr>
              <td
                colSpan={columnCount}
                className="card-fee-row border border-zinc-400 px-1 py-1 text-right text-[10px] text-zinc-600"
              >
                카드결제+4%: {formatKRW(cardAmount)}원
              </td>
            </tr>
          </>
        ) : null}
      </tbody>
    </table>
  );
}

function CenterDivider() {
  return (
    <div className="center-divider flex justify-center py-2">
      <span className="block h-px w-3/5 bg-zinc-400" />
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

  return (
    <>
      <div className="title text-center text-2xl font-bold tracking-[0.25em]">
        {title}
      </div>
      <div className="mb-3 flex justify-between text-sm">
        {mode === "quote" ? <span>담당 {data.manager_name}</span> : <span />}
        <span>
          {mode === "quote" ? "견적일" : "거래일"}{" "}
          {formatDisplayDate(data.quote_date)}
        </span>
      </div>

      <div className="grid-2 mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="box rounded border border-zinc-400 p-3 text-sm">
          <p className="mb-2 font-semibold">공급자 정보</p>
          <p>{SUPPLIER_INFO.company}</p>
          <p>{SUPPLIER_INFO.businessNumber}</p>
          <p>{SUPPLIER_INFO.email}</p>
          <p>{SUPPLIER_INFO.address}</p>
        </div>
        <div className="box rounded border border-zinc-400 p-3 text-sm">
          <p className="mb-2 font-semibold">고객 정보</p>
          <p>성함: {data.customer_name}</p>
          <p>연락처: {data.customer_phone || "-"}</p>
          <p>주소: {data.customer_address || "-"}</p>
          <p>이메일: {data.customer_email || "-"}</p>
          <p>비고: {data.customer_note || "-"}</p>
        </div>
      </div>
    </>
  );
}

function QuoteAmountBar({ totalAmount }: { totalAmount: number }) {
  return (
    <div className="amount-box mb-3 rounded border border-zinc-400 bg-[#fff2cc] p-3">
      <div className="amount-line-full flex w-full items-baseline justify-between gap-3 text-sm font-semibold">
        <span>견적금액</span>
        <span>{formatKoreanWonLabel(totalAmount)}</span>
        <span className="text-xl font-bold">{formatKRW(totalAmount)}원</span>
      </div>
    </div>
  );
}

function MemoBox({ memo }: { memo: string }) {
  if (!memo) return null;

  return (
    <>
      <CenterDivider />
      <div className="memo-box mt-2 rounded border border-zinc-400 p-2">
        <p className="text-[10px] font-normal text-zinc-500">메모</p>
        <p className="mt-1 whitespace-pre-line text-[10px] font-normal leading-relaxed text-zinc-700">
          {memo}
        </p>
      </div>
    </>
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

const PRINT_STYLES = `
  @page { size: A4; margin: 12mm; }
  body { font-family: "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; margin: 0; color: #111; }
  .print-page { page-break-after: always; break-after: page; min-height: 0; }
  .print-page:last-child { page-break-after: auto; break-after: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #666; padding: 4px; }
  .title { text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 0.3em; margin-bottom: 16px; }
  .box { border: 1px solid #666; padding: 8px; }
  .amount-box {
    background: #fff2cc !important;
    padding: 10px;
    border: 1px solid #666;
    margin: 12px 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .amount-line-full { display: flex; width: 100%; justify-content: space-between; align-items: baseline; font-size: 14px; font-weight: 600; }
  .amount-line-full span:last-child { font-size: 20px; font-weight: bold; }
  .total-amount { color: #dc2626 !important; font-size: 16px; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .card-fee-row { font-size: 10px; color: #666; text-align: right; }
  .center-divider { display: flex; justify-content: center; padding: 8px 0; }
  .center-divider span { display: block; width: 60%; height: 1px; background: #666; }
  .footer { margin-top: 8px; font-size: 11px; white-space: pre-line; }
  .memo-box { border: 1px solid #666; padding: 6px 8px; font-size: 10px; font-weight: normal; }
  .memo-box p { font-weight: normal; margin: 0; }
  .bank-info { text-align: center; color: #dc2626 !important; font-weight: 600; font-size: 13px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .invoice-receipt { text-align: center; font-size: 18px; font-weight: 600; margin: 20px 0 8px; }
  .invoice-bank { text-align: center; font-size: 10px; color: #666; }
  .page-label { display: none; }
`;

export default function QuoteDocumentPreview({
  mode,
  open,
  onClose,
  data,
  totals,
}: QuoteDocumentPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const itemPages = useMemo(() => paginateItems(data.items), [data.items]);

  if (!open) return null;

  const title = mode === "quote" ? "견적서" : "거래명세서";

  function handlePrint() {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ko">
        <head>
          <meta charset="utf-8" />
          <title>${title}</title>
          <style>${PRINT_STYLES}</style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            {title} 미리보기
            {itemPages.length > 1 ? ` (${itemPages.length}페이지)` : ""}
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm font-medium text-white"
            >
              인쇄
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
            >
              닫기
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-4">
          <div ref={printRef} className="mx-auto max-w-3xl text-zinc-900">
            {itemPages.map((pageItems, pageIndex) => {
              const isFirstPage = pageIndex === 0;
              const isLastPage = pageIndex === itemPages.length - 1;

              return (
                <div
                  key={`page-${pageIndex}`}
                  className={`print-page bg-white p-4 ${pageIndex > 0 ? "mt-8 border-t-4 border-dashed border-zinc-300 pt-8" : ""}`}
                >
                  {isFirstPage ? (
                    <DocumentHeader mode={mode} data={data} />
                  ) : (
                    <div className="mb-3 text-right text-xs text-zinc-500">
                      {title} (계속) · {pageIndex + 1}/{itemPages.length}페이지
                    </div>
                  )}

                  {isFirstPage && mode === "quote" ? (
                    <QuoteAmountBar totalAmount={totals.totalAmount} />
                  ) : null}

                  <DocumentTable
                    items={pageItems}
                    mode={mode}
                    totalAmount={totals.totalAmount}
                    cardAmount={totals.cardAmount}
                    showTotal={isLastPage}
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
