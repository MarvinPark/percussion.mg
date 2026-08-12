"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteQuote, convertQuoteToSale, cancelQuoteConversion } from "@/app/(main)/quotes/actions";
import ConfirmDialog from "@/components/confirm-dialog";
import QuoteConvertDialog from "@/components/quote-convert-dialog";
import QuoteForm from "@/components/quote-form";
import { buildQuotePreviewFromSaved, dbQuoteItemToInput } from "@/lib/quote-mapper";
import { displaySaleCategory } from "@/lib/sale-categories";
import type { SaleContactSuggestions } from "@/lib/sale-contact-suggestions";
import { formatKRW } from "@/lib/sales-calculator";
import type { PaymentMethod } from "@/types/sale";

const QuoteDocumentPreview = dynamic(
  () => import("@/components/quote-document-preview"),
  { ssr: false },
);

export type QuoteListItem = {
  id: string;
  quote_date: string;
  sale_category: string | null;
  customer_name: string;
  business_partner: string | null;
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

type StaffOption = {
  id: string;
  full_name: string;
};

type QuotesListProps = {
  quotes: QuoteListItem[];
  paymentMethods: PaymentMethod[];
  convertedQuoteIds: string[];
  contactSuggestions: SaleContactSuggestions;
  managerName: string;
  managerPhone: string;
  currentUserName: string;
  staffOptions: StaffOption[];
  rowFontSize?: number;
  emptyMessage?: string;
  highlightedQuoteIds?: Set<string>;
  onCopyQuote?: (quote: QuoteListItem) => void;
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
  "inline-flex h-[26px] w-[4.25rem] shrink-0 items-center justify-center rounded border text-[11px] font-medium leading-none whitespace-nowrap";

export default function QuotesList({
  quotes,
  paymentMethods,
  convertedQuoteIds,
  contactSuggestions,
  managerName,
  managerPhone,
  currentUserName,
  staffOptions,
  rowFontSize = 12,
  emptyMessage,
  highlightedQuoteIds,
  onCopyQuote,
}: QuotesListProps) {
  const router = useRouter();
  const convertedQuoteIdSet = new Set(convertedQuoteIds);
  const subFontSize = Math.max(8, rowFontSize - 2);
  const [editingQuote, setEditingQuote] = useState<QuoteListItem | null>(null);
  const [convertingQuote, setConvertingQuote] = useState<QuoteListItem | null>(
    null,
  );
  const [cancellingQuote, setCancellingQuote] = useState<QuoteListItem | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [isConverting, startConvert] = useTransition();
  const [isCancelling, startCancel] = useTransition();
  const [preview, setPreview] = useState<{
    quote: QuoteListItem;
    mode: "quote" | "invoice";
  } | null>(null);

  function handleEditSaved() {
    setEditingQuote(null);
    router.refresh();
  }

  function handleConfirmConvert(seller?: { userId: string; name: string }) {
    if (!convertingQuote) return;

    startConvert(async () => {
      setActionError(null);
      const result = await convertQuoteToSale(
        convertingQuote.id,
        seller
          ? { sellerUserId: seller.userId, sellerName: seller.name }
          : undefined,
      );
      if (result.error) {
        setActionError(result.error);
        setConvertingQuote(null);
        return;
      }
      setConvertingQuote(null);
      router.refresh();
    });
  }

  function isOthersQuote(quote: QuoteListItem) {
    const creator = quote.created_by_name?.trim();
    if (!creator) return false;
    return creator !== currentUserName.trim();
  }

  function handleConfirmCancel() {
    if (!cancellingQuote) return;

    startCancel(async () => {
      setActionError(null);
      const result = await cancelQuoteConversion(cancellingQuote.id);
      if (result.error) {
        setActionError(result.error);
        setCancellingQuote(null);
        return;
      }
      setCancellingQuote(null);
      router.refresh();
    });
  }

  return (
    <>
      {actionError ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {actionError}
        </p>
      ) : null}

      <div className="mt-3 space-y-1">
        {quotes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-3 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            {emptyMessage ?? "표시할 견적 기록이 없습니다."}
          </div>
        ) : null}
        {quotes.map((quote) => {
          const isConverted = convertedQuoteIdSet.has(quote.id);
          const isHighlighted = highlightedQuoteIds?.has(quote.id) ?? false;

          return (
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
            className={`cursor-pointer rounded-lg border px-2 py-1 transition ${
              isHighlighted ? "paste-row-highlight" : ""
            } ${
              isConverted
                ? "border-zinc-200 bg-zinc-100 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/80 dark:hover:bg-zinc-800/80"
                : "border-zinc-200 bg-white hover:border-amber-300 hover:bg-amber-50/70 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-amber-700 dark:hover:bg-amber-950/30"
            }`}
          >
            <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between md:gap-2">
              <div className="min-w-0 w-full leading-tight md:flex-1">
                <p
                  className={`truncate font-semibold ${
                    isConverted
                      ? "text-zinc-500 dark:text-zinc-400"
                      : "text-zinc-900 dark:text-zinc-100"
                  }`}
                  style={{ fontSize: `${rowFontSize}px` }}
                >
                  {quote.manager_name ? (
                    <>
                      <span
                        className={
                          isConverted
                            ? "font-medium text-zinc-500 dark:text-zinc-400"
                            : "font-medium text-black dark:text-zinc-100"
                        }
                      >
                        {quote.manager_name}
                      </span>
                      <span className="mx-1.5 font-normal text-zinc-400 dark:text-zinc-500">
                        ·
                      </span>
                    </>
                  ) : null}
                  {quote.customer_name}
                  <span
                    className={`ml-2 font-bold ${
                      isConverted
                        ? "text-zinc-500 dark:text-zinc-400"
                        : "text-zinc-800 dark:text-zinc-200"
                    }`}
                  >
                    {formatKRW(quote.total_amount)}원
                  </span>
                </p>
                <p
                  className="truncate text-zinc-500 dark:text-zinc-400"
                  style={{ fontSize: `${subFontSize}px` }}
                >
                  {formatDate(quote.quote_date)}
                  {" · "}
                  {quote.quote_items.length}품목 ({summarizeItems(quote.quote_items)})
                  {quote.payment_method ? ` · ${quote.payment_method}` : ""}
                  {quote.customer_phone ? ` · ${quote.customer_phone}` : ""}
                  {quote.created_by_name ? ` · ${quote.created_by_name}` : ""}
                </p>
              </div>
              <div
                className="flex w-full shrink-0 flex-wrap items-center justify-center gap-1 md:w-auto md:self-center"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => onCopyQuote?.(quote)}
                  className={`${actionButtonClass} border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800`}
                >
                  복사
                </button>
                <button
                  type="button"
                  onClick={() => setPreview({ quote, mode: "quote" })}
                  className={`${actionButtonClass} border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800`}
                >
                  견적서
                </button>
                <button
                  type="button"
                  onClick={() => setPreview({ quote, mode: "invoice" })}
                  className={`${actionButtonClass} border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800`}
                >
                  거래명세서
                </button>
                {isConverted ? (
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => {
                      setActionError(null);
                      setCancellingQuote(quote);
                    }}
                    className={`${actionButtonClass} border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-60 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300 dark:hover:bg-orange-900`}
                  >
                    매출취소
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isConverting}
                    onClick={() => {
                      setActionError(null);
                      setConvertingQuote(quote);
                    }}
                    className={`${actionButtonClass} border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-60 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900`}
                  >
                    매출전환
                  </button>
                )}
                <form action={deleteQuote} className="inline-flex">
                  <input type="hidden" name="quote_id" value={quote.id} />
                  <button
                    type="submit"
                    className={`${actionButtonClass} border-zinc-300 text-red-600 hover:bg-red-50 dark:border-zinc-600 dark:hover:bg-red-950/30`}
                  >
                    삭제
                  </button>
                </form>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {editingQuote ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quote-edit-title"
            className="my-4 w-full max-w-6xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
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
                sale_category: displaySaleCategory(editingQuote.sale_category),
                customer_name: editingQuote.customer_name,
                business_partner: editingQuote.business_partner ?? "",
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
              paymentMethods={paymentMethods}
              contactSuggestions={contactSuggestions}
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
        isOthersQuote(convertingQuote) ? (
          <QuoteConvertDialog
            title="매출기록하겠습니까?"
            description={`${convertingQuote.customer_name} 견적 (${convertingQuote.quote_items.length}개 제품)을 매출로 기록합니다.`}
            staffOptions={staffOptions}
            defaultSellerName={
              convertingQuote.created_by_name?.trim() ||
              currentUserName ||
              staffOptions[0]?.full_name ||
              ""
            }
            showSellerPicker
            isPending={isConverting}
            onConfirm={handleConfirmConvert}
            onCancel={() => {
              if (!isConverting) setConvertingQuote(null);
            }}
          />
        ) : (
          <ConfirmDialog
            title="매출기록하겠습니까?"
            description={`${convertingQuote.customer_name} 견적 (${convertingQuote.quote_items.length}개 제품)을 매출로 기록합니다.`}
            onConfirm={() => handleConfirmConvert()}
            onCancel={() => {
              if (!isConverting) setConvertingQuote(null);
            }}
          />
        )
      ) : null}

      {cancellingQuote ? (
        <ConfirmDialog
          title="매출을 취소하시겠습니까?"
          description={`${cancellingQuote.customer_name} 견적의 매출 기록을 삭제하고 재고를 복구합니다.`}
          onConfirm={handleConfirmCancel}
          onCancel={() => {
            if (!isCancelling) setCancellingQuote(null);
          }}
        />
      ) : null}
    </>
  );
}
