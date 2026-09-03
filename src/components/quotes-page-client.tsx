"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QuotesList, { type QuoteListItem } from "@/components/quotes-list";
import QuotesListSearch from "@/components/quotes-list-search";
import SalesSellerFilter from "@/components/sales-seller-filter";
import {
  migrateQuoteFavorites,
  removeQuoteFavorites,
  toggleQuoteFavorite,
} from "@/app/(main)/quotes/actions";
import {
  loadQuoteFavoriteIds,
  loadQuotesPageSize,
  saveQuoteFavoriteIds,
  saveQuotesPageSize,
} from "@/lib/quotes-list-preferences";
import {
  buildProductSkuMap,
  filterQuotes,
  filterQuotesBySeller,
  getQuoteSearchSelectionValue,
  getUniqueQuoteSellerNames,
} from "@/lib/quotes-search";
import {
  paginateItems,
  TABLE_PAGE_SIZE,
  type TablePageSize,
} from "@/lib/table-page-size";
import type { PaymentMethod } from "@/types/sale";
import type { SaleContactSuggestions } from "@/lib/sale-contact-suggestions";

const INITIAL_SECTION_PAGES = {
  quoteCompleted: 1,
  salesCompleted: 1,
} as const;

type QuoteSectionKey = keyof typeof INITIAL_SECTION_PAGES;
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
  userId: string;
  quotes: QuoteListItem[];
  productSkus: { id: string; sku?: string | null }[];
  paymentMethods: PaymentMethod[];
  saleCategories: string[];
  convertedQuoteIds: string[];
  initialFavoriteQuoteIds: string[];
  contactSuggestions: SaleContactSuggestions;
  managerName: string;
  managerPhone: string;
  currentUserName: string;
  staffOptions: StaffOption[];
};

export default function QuotesPageClient({
  userId,
  quotes,
  productSkus,
  paymentMethods,
  saleCategories,
  convertedQuoteIds,
  initialFavoriteQuoteIds,
  contactSuggestions,
  managerName,
  managerPhone,
  currentUserName,
  staffOptions,
}: QuotesPageClientProps) {
  const router = useRouter();
  const [sellerFilter, setSellerFilter] = useState(currentUserName);
  const [draftQuery, setDraftQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [rowFontSize, setRowFontSize] = useState(DEFAULT_ROW_FONT_SIZE);
  const [pageSize, setPageSize] = useState<TablePageSize>(TABLE_PAGE_SIZE);
  const [currentPageBySection, setCurrentPageBySection] = useState<
    Record<QuoteSectionKey, number>
  >({ ...INITIAL_SECTION_PAGES });
  const [pageSizeBySection, setPageSizeBySection] = useState<
    Partial<Record<QuoteSectionKey, TablePageSize>>
  >({});
  const [pageSizeLoaded, setPageSizeLoaded] = useState(false);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [favoriteQuoteIds, setFavoriteQuoteIds] = useState<Set<string>>(
    () => new Set(initialFavoriteQuoteIds),
  );
  const [highlightedQuoteIds, setHighlightedQuoteIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPageSize(loadQuotesPageSize(userId));
    setPageSizeLoaded(true);
    setFavoritesLoaded(true);
  }, [userId]);

  useEffect(() => {
    if (!favoritesLoaded) return;

    const localIds = loadQuoteFavoriteIds(userId);
    if (localIds.size === 0) return;

    void migrateQuoteFavorites([...localIds]).then((result) => {
      if (result.error) return;

      saveQuoteFavoriteIds(userId, new Set());
      setFavoriteQuoteIds((prev) => {
        const next = new Set([...prev, ...localIds]);
        return next.size === prev.size ? prev : next;
      });
    });
  }, [favoritesLoaded, userId]);

  useEffect(() => {
    if (!favoritesLoaded) return;
    const quoteIdSet = new Set(quotes.map((quote) => quote.id));
    setFavoriteQuoteIds((prev) => {
      const next = new Set([...prev].filter((id) => quoteIdSet.has(id)));
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [favoritesLoaded, quotes]);

  useEffect(() => {
    if (!favoritesLoaded || convertedQuoteIds.length === 0) return;

    const convertedSet = new Set(convertedQuoteIds);
    setFavoriteQuoteIds((prev) => {
      const removed: string[] = [];
      const next = new Set(prev);

      for (const quoteId of convertedSet) {
        if (next.delete(quoteId)) {
          removed.push(quoteId);
        }
      }

      if (removed.length === 0) return prev;
      void removeQuoteFavorites(removed);
      return next;
    });
  }, [convertedQuoteIds, favoritesLoaded]);

  useEffect(() => {
    if (!pageSizeLoaded) return;
    saveQuotesPageSize(userId, pageSize);
  }, [pageSizeLoaded, pageSize, userId]);

  useEffect(() => {
    setCurrentPageBySection({ ...INITIAL_SECTION_PAGES });
  }, [sellerFilter, appliedQuery, pageSize]);

  const convertedQuoteIdSet = useMemo(
    () => new Set(convertedQuoteIds),
    [convertedQuoteIds],
  );

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

  const { favoriteQuotes, quoteCompletedQuotes, salesCompletedQuotes } =
    useMemo(() => {
      const favorites: QuoteListItem[] = [];
      const quoteCompleted: QuoteListItem[] = [];
      const salesCompleted: QuoteListItem[] = [];

      for (const quote of filteredQuotes) {
        if (favoriteQuoteIds.has(quote.id)) {
          favorites.push(quote);
          continue;
        }

        if (convertedQuoteIdSet.has(quote.id)) {
          salesCompleted.push(quote);
        } else {
          quoteCompleted.push(quote);
        }
      }

      return {
        favoriteQuotes: favorites,
        quoteCompletedQuotes: quoteCompleted,
        salesCompletedQuotes: salesCompleted,
      };
    }, [filteredQuotes, favoriteQuoteIds, convertedQuoteIdSet]);

  const quoteCompletedPagination = useMemo(() => {
    const sectionPageSize =
      pageSizeBySection.quoteCompleted ?? pageSize;
    return paginateItems(
      quoteCompletedQuotes,
      currentPageBySection.quoteCompleted,
      sectionPageSize,
    );
  }, [
    quoteCompletedQuotes,
    currentPageBySection.quoteCompleted,
    pageSize,
    pageSizeBySection.quoteCompleted,
  ]);

  const salesCompletedPagination = useMemo(() => {
    const sectionPageSize = pageSizeBySection.salesCompleted ?? pageSize;
    return paginateItems(
      salesCompletedQuotes,
      currentPageBySection.salesCompleted,
      sectionPageSize,
    );
  }, [
    salesCompletedQuotes,
    currentPageBySection.salesCompleted,
    pageSize,
    pageSizeBySection.salesCompleted,
  ]);

  useEffect(() => {
    if (
      currentPageBySection.quoteCompleted !==
      quoteCompletedPagination.currentPage
    ) {
      setCurrentPageBySection((current) => ({
        ...current,
        quoteCompleted: quoteCompletedPagination.currentPage,
      }));
    }
  }, [
    currentPageBySection.quoteCompleted,
    quoteCompletedPagination.currentPage,
  ]);

  useEffect(() => {
    if (
      currentPageBySection.salesCompleted !==
      salesCompletedPagination.currentPage
    ) {
      setCurrentPageBySection((current) => ({
        ...current,
        salesCompleted: salesCompletedPagination.currentPage,
      }));
    }
  }, [
    currentPageBySection.salesCompleted,
    salesCompletedPagination.currentPage,
  ]);

  const applySearch = useCallback(() => {
    setAppliedQuery(draftQuery);
    setCurrentPageBySection({ ...INITIAL_SECTION_PAGES });
  }, [draftQuery]);

  const handleSelectQuote = useCallback(
    (quote: QuoteListItem) => {
      const value = getQuoteSearchSelectionValue(quote, productSkuById);
      setDraftQuery(value);
      setAppliedQuery(value);
      setCurrentPageBySection({ ...INITIAL_SECTION_PAGES });
    },
    [productSkuById],
  );

  const handleReset = useCallback(() => {
    setSellerFilter("");
    setDraftQuery("");
    setAppliedQuery("");
    setCurrentPageBySection({ ...INITIAL_SECTION_PAGES });
  }, []);

  const handleToggleFavorite = useCallback((quoteId: string) => {
    setFavoriteQuoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(quoteId)) {
        next.delete(quoteId);
      } else {
        next.add(quoteId);
      }
      return next;
    });

    void toggleQuoteFavorite(quoteId).then((result) => {
      if (result.error) {
        showToast(result.error);
        setFavoriteQuoteIds((prev) => {
          const next = new Set(prev);
          if (next.has(quoteId)) {
            next.delete(quoteId);
          } else {
            next.add(quoteId);
          }
          return next;
        });
        return;
      }

      if (typeof result.favorited === "boolean") {
        setFavoriteQuoteIds((prev) => {
          const next = new Set(prev);
          if (result.favorited) {
            next.add(quoteId);
          } else {
            next.delete(quoteId);
          }
          return next;
        });
      }
    });
  }, [showToast]);

  const handlePageSizeChange = useCallback(
    (sectionKey: QuoteSectionKey, nextPageSize: TablePageSize) => {
      setPageSizeBySection((current) => ({
        ...current,
        [sectionKey]: nextPageSize,
      }));
      setCurrentPageBySection((current) => ({
        ...current,
        [sectionKey]: 1,
      }));
    },
    [],
  );

  const handleQuoteDuplicated = useCallback(
    (quoteId: string) => {
      showToast("견적을 복제했습니다");
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      setHighlightedQuoteIds(new Set([quoteId]));
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedQuoteIds(new Set());
      }, 2000);
      router.refresh();
    },
    [router, showToast],
  );

  const hasActiveFilter = Boolean(
    sellerFilter.trim() || appliedQuery.trim(),
  );

  return (
    <>
      {toast ? <ActionToast message={toast} /> : null}

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

        <div className="flex flex-wrap items-center gap-2">
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
      </div>

      <QuotesList
        userId={userId}
        favoriteQuotes={favoriteQuotes}
        quoteCompletedSection={{
          items: quoteCompletedPagination.items,
          totalCount: quoteCompletedQuotes.length,
          currentPage: quoteCompletedPagination.currentPage,
          totalPages: quoteCompletedPagination.totalPages,
          onPageChange: (page) =>
            setCurrentPageBySection((current) => ({
              ...current,
              quoteCompleted: page,
            })),
          pageSize: pageSizeBySection.quoteCompleted ?? pageSize,
          onPageSizeChange: (nextPageSize) =>
            handlePageSizeChange("quoteCompleted", nextPageSize),
        }}
        salesCompletedSection={{
          items: salesCompletedPagination.items,
          totalCount: salesCompletedQuotes.length,
          currentPage: salesCompletedPagination.currentPage,
          totalPages: salesCompletedPagination.totalPages,
          onPageChange: (page) =>
            setCurrentPageBySection((current) => ({
              ...current,
              salesCompleted: page,
            })),
          pageSize: pageSizeBySection.salesCompleted ?? pageSize,
          onPageSizeChange: (nextPageSize) =>
            handlePageSizeChange("salesCompleted", nextPageSize),
        }}
        favoriteQuoteIds={favoriteQuoteIds}
        onToggleFavorite={handleToggleFavorite}
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
        onQuoteDuplicated={handleQuoteDuplicated}
        emptyMessage={
          hasActiveFilter || draftQuery.trim()
            ? "검색 조건에 맞는 견적 기록이 없습니다."
            : undefined
        }
      />
    </>
  );
}
