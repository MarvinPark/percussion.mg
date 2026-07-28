"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteQuote, convertQuoteToSale } from "@/app/quotes/actions";
import ConfirmDialog from "@/components/confirm-dialog";
import QuoteDocumentPreview from "@/components/quote-document-preview";
import QuoteForm from "@/components/quote-form";
import { buildQuotePreviewFromSaved, dbQuoteItemToInput } from "@/lib/quote-mapper";
import { formatKRW } from "@/lib/sales-calculator";
import type { PaymentMethod } from "@/types/sale";
import type { QuoteProductOption } from "@/types/quote";

export type QuoteListItem = {
  id: string;
  quote_date: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  customer_email: string | null;
  customer_note: string | null;
  memo: string | null;
  manager_name: string | null;
  payment_method_id: string | null;
  payment_method: string | null;
  total_amount: number;
  card_amount: number;
  created_by_name: string | null;
  created_at: string;
  quote_items: {
    id: string;
    product_id: string | null;
    supplier: string | null;
    purchase_source: string | null;
    category: string | null;
    brand: string | null;
    product_name: string;
    model_name: string;
    quantity: number;
    consumer_price: number;
    sale_unit_price: number;
    rounded_unit_price: number;
    line_total: number;
    purchase_price: number;
    shipping_cost: number;
  }[];
};

type QuotesListProps = {
  quotes: QuoteListItem[];
  products: QuoteProductOption[];
  paymentMethods: PaymentMethod[];
  managerName: string;
  managerPhone: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function summarizeItems(items: QuoteListItem["quote_items"]) {
  if (items.length === 0) return "제품 없음";
  const first = items[0].model_name;
  if (items.length === 1) return first;
  return `${first} 외 ${items.length - 1}건`;
}

const actionButtonClass =
  "rounded border px-2 py-1 text-[11px] font-medium leading-tight whitespace-nowrap";

export default function QuotesList({
  quotes,
  products,
  paymentMethods,
  managerName,
  managerPhone,
}: QuotesListProps) {
  const router = useRouter();
  const [editingQuote, setEditingQuote] = useState<QuoteListItem | null>(null);
  const [convertingQuote, setConvertingQuote] = useState<QuoteListItem | null>(
    null,
  );
  const [convertError, setConvertError] = useState<string | null>(null);
  const [isConverting, startConvert] = useTransition();
  const [preview, setPreview] = useState<{
    quote: QuoteListItem;
    mode: "quote" | "invoice";
  } | null>(null);

  function handleEditSaved() {
    setEditingQuote(null);
    router.refresh();
  }

  function handleConfirmConvert() {
    if (!convertingQuote) return;

    startConvert(async () => {
      setConvertError(null);
      const result = await convertQuoteToSale(convertingQuote.id);
      if (result.error) {
        setConvertError(result.error);
        setConvertingQuote(null);
        return;
      }
      setConvertingQuote(null);
      router.push("/sales");
      router.refresh();
    });
  }

  return (
    <>
      {convertError ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {convertError}
        </p>
      ) : null}

      <div className="space-y-2">
        {quotes.map((quote) => (
          <div
            key={quote.id}
            role="button"
            tabIndex={0}
            onClick={() => setEditingQuote(quote)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setEditingQuote(quote);
              }
            }}
            className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-2 transition hover:border-amber-300 hover:bg-amber-50/70 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-amber-700 dark:hover:bg-amber-950/30"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {quote.customer_name}
                  <span className="ml-2 font-bold text-zinc-800 dark:text-zinc-200">
                    {formatKRW(quote.total_amount)}원
                  </span>
                </p>
                <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {formatDate(quote.quote_date)}
                  {" · "}
                  {quote.quote_items.length}품목 ({summarizeItems(quote.quote_items)})
                  {quote.payment_method ? ` · ${quote.payment_method}` : ""}
                  {quote.customer_phone ? ` · ${quote.customer_phone}` : ""}
                  {quote.created_by_name ? ` · ${quote.created_by_name}` : ""}
                </p>
              </div>
              <div
                className="flex shrink-0 flex-col gap-1"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setPreview({ quote, mode: "quote" })}
                  className={`${actionButtonClass} border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800`}
                >
                  견적서 미리보기
                </button>
                <button
                  type="button"
                  onClick={() => setPreview({ quote, mode: "invoice" })}
                  className={`${actionButtonClass} border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800`}
                >
                  거래명세서 미리보기
                </button>
                <button
                  type="button"
                  disabled={isConverting}
                  onClick={() => {
                    setConvertError(null);
                    setConvertingQuote(quote);
                  }}
                  className={`${actionButtonClass} border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-60 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900`}
                >
                  매출전환
                </button>
                <form action={deleteQuote}>
                  <input type="hidden" name="quote_id" value={quote.id} />
                  <button
                    type="submit"
                    className={`${actionButtonClass} w-full border-zinc-300 text-red-600 hover:bg-red-50 dark:border-zinc-600 dark:hover:bg-red-950/30`}
                  >
                    삭제
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingQuote ? (
        <div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/50 p-4"
          onClick={() => setEditingQuote(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quote-edit-title"
            className="my-4 w-full max-w-6xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3
                id="quote-edit-title"
                className="text-lg font-bold text-zinc-900 dark:text-zinc-100"
              >
                견적 수정 — {editingQuote.customer_name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingQuote(null)}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                닫기
              </button>
            </div>
            <QuoteForm
              quoteId={editingQuote.id}
              initialQuote={{
                quote_date: editingQuote.quote_date,
                customer_name: editingQuote.customer_name,
                customer_phone: editingQuote.customer_phone ?? "",
                customer_address: editingQuote.customer_address ?? "",
                customer_email: editingQuote.customer_email ?? "",
                customer_note: editingQuote.customer_note ?? "",
                memo: editingQuote.memo ?? "",
                manager_name: editingQuote.manager_name ?? managerName,
                payment_method_id:
                  editingQuote.payment_method_id ??
                  paymentMethods[0]?.id ??
                  "",
                items: editingQuote.quote_items.map(dbQuoteItemToInput),
              }}
              products={products}
              paymentMethods={paymentMethods}
              managerName={managerName}
              managerPhone={managerPhone}
              onSaved={handleEditSaved}
            />
          </div>
        </div>
      ) : null}

      {preview ? (
        <QuoteDocumentPreview
          mode={preview.mode}
          open
          onClose={() => setPreview(null)}
          {...buildQuotePreviewFromSaved(preview.quote, managerPhone)}
        />
      ) : null}

      {convertingQuote ? (
        <ConfirmDialog
          title="매출기록하겠습니까?"
          description={`${convertingQuote.customer_name} 견적 (${convertingQuote.quote_items.length}개 제품)을 매출로 기록합니다.`}
          onConfirm={handleConfirmConvert}
          onCancel={() => setConvertingQuote(null)}
        />
      ) : null}
    </>
  );
}
