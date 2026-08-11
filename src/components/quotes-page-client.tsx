"use client";

import { useCallback, useMemo, useState } from "react";
import QuotesList, { type QuoteListItem } from "@/components/quotes-list";
import QuotesListSearch from "@/components/quotes-list-search";
import SalesSellerFilter from "@/components/sales-seller-filter";
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

type QuotesPageClientProps = {
  quotes: QuoteListItem[];
  productSkus: { id: string; sku?: string | null }[];
  paymentMethods: PaymentMethod[];
  convertedQuoteIds: string[];
  contactSuggestions: SaleContactSuggestions;
  managerName: string;
  managerPhone: string;
};

export default function QuotesPageClient({
  quotes,
  productSkus,
  paymentMethods,
  convertedQuoteIds,
  contactSuggestions,
  managerName,
  managerPhone,
}: QuotesPageClientProps) {
  const [sellerFilter, setSellerFilter] = useState("");
  const [draftQuery, setDraftQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [rowFontSize, setRowFontSize] = useState(DEFAULT_ROW_FONT_SIZE);

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

  const hasActiveFilter = Boolean(
    sellerFilter.trim() || appliedQuery.trim(),
  );

  return (
    <>
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
        convertedQuoteIds={convertedQuoteIds}
        contactSuggestions={contactSuggestions}
        managerName={managerName}
        managerPhone={managerPhone}
        rowFontSize={rowFontSize}
        emptyMessage={
          hasActiveFilter || draftQuery.trim()
            ? "검색 조건에 맞는 견적 기록이 없습니다."
            : undefined
        }
      />
    </>
  );
}
