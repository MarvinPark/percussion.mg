"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { pasteQuote } from "@/app/(main)/quotes/actions";
import QuotesList, { type QuoteListItem } from "@/components/quotes-list";
import QuotesListSearch from "@/components/quotes-list-search";
import SalesSellerFilter from "@/components/sales-seller-filter";
import { quoteToCopiedPayload } from "@/lib/quote-clipboard";
import {
  buildProductSkuMap,
  filterQuotes,
  filterQuotesBySeller,
  getQuoteSearchSelectionValue,
  getUniqueQuoteSellerNames,
} from "@/lib/quotes-search";
import type { PaymentMethod } from "@/types/sale";
import type { SaleContactSuggestions } from "@/lib/sale-contact-suggestions";

const buttonClass =
  "inline-flex h-[26px] shrink-0 items-center rounded border border-zinc-300 bg-white px-2 py-1 text-[12px] leading-none font-normal text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const fontControlBoxClass =
  "inline-flex h-[26px] shrink-0 items-center overflow-hidden rounded border border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900";

const fontControlButtonClass =
  "inline-flex h-[26px] w-[26px] items-center justify-center text-[11px] leading-none text-zinc-800 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-zinc-800";

const MIN_ROW_FONT_SIZE = 9;
const MAX_ROW_FONT_SIZE = 16;
const DEFAULT_ROW_FONT_SIZE = 12;

function ActionToast({ message }: { message: string }) {
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
      {message}
    </div>
  );
}

export type StaffOption = {
  id: string;
  full_name: string;
};

type QuotesPageClientProps = {
  quotes: QuoteListItem[];
  productSkus: { id: string; sku?: string | null }[];
  paymentMethods: PaymentMethod[];
  saleCategories: string[];
  convertedQuoteIds: string[];
  contactSuggestions: SaleContactSuggestions;
  managerName: string;
  managerPhone: string;
  currentUserName: string;
  staffOptions: StaffOption[];
};

export default function QuotesPageClient({
  quotes,
  productSkus,
  paymentMethods,
  saleCategories,
  convertedQuoteIds,
  contactSuggestions,
  managerName,
  managerPhone,
  currentUserName,
  staffOptions,
}: QuotesPageClientProps) {
  const router = useRouter();
  const [sellerFilter, setSellerFilter] = useState("");
  const [draftQuery, setDraftQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [rowFontSize, setRowFontSize] = useState(DEFAULT_ROW_FONT_SIZE);
  const [highlightedQuoteIds, setHighlightedQuoteIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [toast, setToast] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [isDuplicating, startDuplicate] = useTransition();
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), 1500);
  }, []);

  const productSkuById = useMemo(
    () => buildProductSkuMap(productSkus),
    [productSkus],
  );
  const sellerOptions = useMemo(() => getUniqueQuoteSellerNames(quotes), [quotes]);

  const sellerScopedQuotes = useMemo(
    () => filterQuotesBySeller(quotes, sellerFilter),
    [quotes, sellerFilter],
  );

  const filteredQuotes = useMemo(
    () =>
      filterQuotes(quotes, {
        seller: sellerFilter,
        textQuery: appliedQuery,
        productSkuById,
      }),
    [quotes, sellerFilter, appliedQuery, productSkuById],
  );

  const applySearch = useCallback(() => {
    setAppliedQuery(draftQuery);
  }, [draftQuery]);

  const handleSelectQuote = useCallback(
    (quote: QuoteListItem) => {
      const value = getQuoteSearchSelectionValue(quote, productSkuById);
      setDraftQuery(value);
      setAppliedQuery(value);
    },
    [productSkuById],
  );

  const handleReset = useCallback(() => {
    setSellerFilter("");
    setDraftQuery("");
    setAppliedQuery("");
  }, []);

  const handleDuplicateQuotes = useCallback(() => {
    if (isDuplicating) return;

    if (!appliedQuery.trim()) {
      showToast("검색 후 복제해 주세요");
      return;
    }

    if (filteredQuotes.length === 0) {
      showToast("복제할 견적이 없습니다");
      return;
    }

    setDuplicateError(null);
    startDuplicate(async () => {
      const newQuoteIds: string[] = [];

      for (const quote of filteredQuotes) {
        const result = await pasteQuote(quoteToCopiedPayload(quote));
        if (result.error) {
          setDuplicateError(result.error);
          if (newQuoteIds.length > 0) {
            router.refresh();
          }
          return;
        }
        if (result.quoteId) {
          newQuoteIds.push(result.quoteId);
        }
      }

      showToast(`복제 ${newQuoteIds.length}건`);
      if (newQuoteIds.length > 0) {
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        setHighlightedQuoteIds(new Set(newQuoteIds));
        highlightTimerRef.current = setTimeout(() => {
          setHighlightedQuoteIds(new Set());
        }, 2000);
      }
      router.refresh();
    });
  }, [
    appliedQuery,
    filteredQuotes,
    isDuplicating,
    router,
    showToast,
  ]);

  const hasActiveFilter = Boolean(
    sellerFilter.trim() || appliedQuery.trim(),
  );

  const canDuplicate =
    Boolean(appliedQuery.trim()) && filteredQuotes.length > 0 && !isDuplicating;

  return (
    <>
      {toast ? <ActionToast message={toast} /> : null}

      {duplicateError ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {duplicateError}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-2">
          <SalesSellerFilter
            value={sellerFilter}
            options={sellerOptions}
            onChange={setSellerFilter}
            showAllOption
          />

          <QuotesListSearch
            quotes={sellerScopedQuotes}
            productSkuById={productSkuById}
            query={draftQuery}
            onQueryChange={setDraftQuery}
            onConfirm={applySearch}
            onSelectQuote={handleSelectQuote}
          />

          <button
            type="button"
            onClick={() => void handleDuplicateQuotes()}
            disabled={!canDuplicate}
            className={buttonClass}
          >
            {isDuplicating ? "복제 중..." : "복제"}
          </button>

          <button type="button" onClick={applySearch} className={buttonClass}>
            확인
          </button>

          <button
            type="button"
            onClick={handleReset}
            className={buttonClass}
            disabled={
              !sellerFilter.trim() && !draftQuery.trim() && !appliedQuery.trim()
            }
          >
            전체보기
          </button>
        </div>

        <div className={fontControlBoxClass}>
          <button
            type="button"
            aria-label="행 글자 크기 줄이기"
            disabled={rowFontSize <= MIN_ROW_FONT_SIZE}
            onClick={() =>
              setRowFontSize((size) => Math.max(MIN_ROW_FONT_SIZE, size - 1))
            }
            className={`${fontControlButtonClass} border-r border-zinc-300 dark:border-zinc-600`}
          >
            -
          </button>
          <button
            type="button"
            aria-label="행 글자 크기 키우기"
            disabled={rowFontSize >= MAX_ROW_FONT_SIZE}
            onClick={() =>
              setRowFontSize((size) => Math.min(MAX_ROW_FONT_SIZE, size + 1))
            }
            className={fontControlButtonClass}
          >
            +
          </button>
        </div>
      </div>

      <QuotesList
        quotes={filteredQuotes}
        paymentMethods={paymentMethods}
        saleCategories={saleCategories}
        convertedQuoteIds={convertedQuoteIds}
        contactSuggestions={contactSuggestions}
        managerName={managerName}
        managerPhone={managerPhone}
        currentUserName={currentUserName}
        staffOptions={staffOptions}
        rowFontSize={rowFontSize}
        highlightedQuoteIds={highlightedQuoteIds}
        emptyMessage={
          hasActiveFilter || draftQuery.trim()
            ? "검색 조건에 맞는 견적 기록이 없습니다."
            : undefined
        }
      />
    </>
  );
}
