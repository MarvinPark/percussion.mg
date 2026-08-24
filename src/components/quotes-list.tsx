"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { deleteQuote, convertQuoteToSale, cancelQuoteConversion, pasteQuote } from "@/app/(main)/quotes/actions";
import ConfirmDialog from "@/components/confirm-dialog";
import DeleteConfirmDialog from "@/components/delete-confirm-dialog";
import QuoteConvertDialog, {
  defaultCardFeePercentFromPayment,
  type QuoteConvertConfirmPayload,
} from "@/components/quote-convert-dialog";
import QuoteForm from "@/components/quote-form";
import TablePageSizeSelect from "@/components/table-page-size-select";
import TablePagination from "@/components/table-pagination";
import { buildQuotePreviewFromSaved, dbQuoteItemToInput } from "@/lib/quote-mapper";
import { quoteToCopiedPayload } from "@/lib/quote-clipboard";
import { buildQuoteOrderCopyText } from "@/lib/quote-order-copy";
import { displaySaleCategoryFromList } from "@/lib/sale-category-options";
import type { SaleContactSuggestions } from "@/lib/sale-contact-suggestions";
import { formatKRW } from "@/lib/sales-calculator";
import type { TablePageSize } from "@/lib/table-page-size";
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
    fulfillment_location?: string | null;
  }[];
};

type StaffOption = {
  id: string;
  full_name: string;
};

type QuoteListSectionData = {
  items: QuoteListItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: TablePageSize;
  onPageSizeChange?: (pageSize: TablePageSize) => void;
};

type QuotesListProps = {
  userId: string;
  favoriteQuotes?: QuoteListItem[];
  quoteCompletedSection: QuoteListSectionData;
  salesCompletedSection: QuoteListSectionData;
  favoriteQuoteIds: Set<string>;
  onToggleFavorite: (quoteId: string) => void;
  paymentMethods: PaymentMethod[];
  saleCategories: string[];
  convertedQuoteIds: string[];
  contactSuggestions: SaleContactSuggestions;
  managerName: string;
  managerPhone: string;
  currentUserName: string;
  staffOptions: StaffOption[];
  rowFontSize?: number;
  highlightedQuoteIds?: Set<string>;
  onQuoteDuplicated?: (quoteId: string) => void;
  emptyMessage?: string;
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

const wideActionButtonClass =
  "inline-flex h-[26px] w-[5.75rem] shrink-0 items-center justify-center rounded border text-[11px] font-medium leading-none whitespace-nowrap";

const starButtonClass =
  "inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded text-[18px] leading-none transition hover:bg-zinc-100 dark:hover:bg-zinc-800";

type QuoteListSectionProps = {
  title: string;
  titleClassName?: string;
  totalCount: number;
  collapsed: boolean;
  onToggle: () => void;
  pageSize?: TablePageSize;
  onPageSizeChange?: (pageSize: TablePageSize) => void;
  children: React.ReactNode;
};

function QuoteListSection({
  title,
  titleClassName = "text-base font-bold text-zinc-900 dark:text-zinc-100",
  totalCount,
  collapsed,
  onToggle,
  pageSize,
  onPageSizeChange,
  children,
}: QuoteListSectionProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/80">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <span
            aria-hidden="true"
            className="inline-flex w-4 shrink-0 justify-center text-sm text-zinc-500 dark:text-zinc-400"
          >
            {collapsed ? "▸" : "▾"}
          </span>
          <span className={titleClassName}>
            {title}
          </span>
          <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
            {totalCount}건
          </span>
        </button>

        {pageSize !== undefined && onPageSizeChange ? (
          <div className="ml-auto">
            <TablePageSizeSelect
              value={pageSize}
              onChange={onPageSizeChange}
              compact
            />
          </div>
        ) : null}
      </div>

      {!collapsed ? <div className="space-y-1 px-2 py-2">{children}</div> : null}
    </section>
  );
}

export default function QuotesList({
  userId,
  favoriteQuotes = [],
  quoteCompletedSection,
  salesCompletedSection,
  favoriteQuoteIds,
  onToggleFavorite,
  paymentMethods,
  saleCategories,
  convertedQuoteIds,
  contactSuggestions,
  managerName,
  managerPhone,
  currentUserName,
  staffOptions,
  rowFontSize = 12,
  emptyMessage,
  highlightedQuoteIds,
  onQuoteDuplicated,
}: QuotesListProps) {
  const router = useRouter();
  const convertedQuoteIdSet = new Set(convertedQuoteIds);
  const subFontSize = Math.max(8, rowFontSize - 2);
  const [collapsedSections, setCollapsedSections] = useState({
    favorites: false,
    quoteCompleted: false,
    salesCompleted: false,
  });
  const [editingQuote, setEditingQuote] = useState<QuoteListItem | null>(null);
  const [convertingQuote, setConvertingQuote] = useState<QuoteListItem | null>(
    null,
  );
  const [cancellingQuote, setCancellingQuote] = useState<QuoteListItem | null>(
    null,
  );
  const [deletingQuote, setDeletingQuote] = useState<QuoteListItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isConverting, startConvert] = useTransition();
  const [isCancelling, startCancel] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [isDuplicating, startDuplicate] = useTransition();
  const [duplicatingQuoteId, setDuplicatingQuoteId] = useState<string | null>(
    null,
  );
  const [copiedOrderQuoteId, setCopiedOrderQuoteId] = useState<string | null>(
    null,
  );
  const [preview, setPreview] = useState<{
    quote: QuoteListItem;
    mode: "quote" | "invoice";
  } | null>(null);

  function handleEditSaved() {
    setEditingQuote(null);
    router.refresh();
  }

  useEffect(() => {
    if (!editingQuote) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setEditingQuote(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [editingQuote]);

  function handleConfirmConvert(payload: QuoteConvertConfirmPayload) {
    if (!convertingQuote) return;

    startConvert(async () => {
      setActionError(null);
      const result = await convertQuoteToSale(convertingQuote.id, {
        sellerUserId: payload.seller.userId,
        sellerName: payload.seller.name,
        cardFeePercent: payload.cardFeePercent,
        actualFeeRate: payload.actualFeeRate,
        roundingUnit: payload.roundingUnit,
        roundingMode: payload.roundingMode,
        purchaseQuantities: payload.purchaseQuantities,
      });
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

  function handleConfirmDelete() {
    if (!deletingQuote) return;

    startDelete(async () => {
      setActionError(null);
      const formData = new FormData();
      formData.set("quote_id", deletingQuote.id);
      await deleteQuote(formData);
      setDeletingQuote(null);
      router.refresh();
    });
  }

  function handleCopyOrderText(quote: QuoteListItem) {
    const text = buildQuoteOrderCopyText(quote);

    void navigator.clipboard.writeText(text).then(() => {
      setCopiedOrderQuoteId(quote.id);
      window.setTimeout(() => {
        setCopiedOrderQuoteId((current) =>
          current === quote.id ? null : current,
        );
      }, 1500);
    });
  }

  function handleDuplicateQuote(quote: QuoteListItem) {
    if (isDuplicating) return;

    setActionError(null);
    setDuplicatingQuoteId(quote.id);

    startDuplicate(async () => {
      const result = await pasteQuote(quoteToCopiedPayload(quote));
      setDuplicatingQuoteId(null);

      if (result.error) {
        setActionError(result.error);
        return;
      }

      if (result.quoteId) {
        onQuoteDuplicated?.(result.quoteId);
      } else {
        router.refresh();
      }
    });
  }

  function renderQuoteRow(quote: QuoteListItem) {
    const isConverted = convertedQuoteIdSet.has(quote.id);
    const isHighlighted = highlightedQuoteIds?.has(quote.id) ?? false;
    const isFavorite = favoriteQuoteIds.has(quote.id);

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
        className={`cursor-pointer rounded-lg border px-2 py-[5.5px] transition ${
          isHighlighted ? "paste-row-highlight" : ""
        } ${
          isConverted
            ? "border-zinc-200 bg-zinc-100 hover:border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/80 dark:hover:bg-zinc-800/80"
            : "border-zinc-200 bg-white hover:border-amber-300 hover:bg-amber-50/70 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-amber-700 dark:hover:bg-amber-950/30"
        }`}
      >
        <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between md:gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-1.5 md:items-center">
            <button
              type="button"
              aria-label={isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}
              aria-pressed={isFavorite}
              onClick={(event) => {
                event.stopPropagation();
                onToggleFavorite(quote.id);
              }}
              className={`${starButtonClass} ${
                isFavorite
                  ? "text-amber-500 dark:text-amber-400"
                  : "text-zinc-300 hover:text-amber-400 dark:text-zinc-600 dark:hover:text-amber-400"
              }`}
            >
              {isFavorite ? "★" : "☆"}
            </button>

            <div className="min-w-0 w-full leading-tight">
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
          </div>
          <div
            className="flex w-full shrink-0 flex-wrap items-center justify-center gap-1 md:w-auto md:self-center"
            onClick={(event) => event.stopPropagation()}
          >
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
            <button
              type="button"
              onClick={() => handleCopyOrderText(quote)}
              className={`${wideActionButtonClass} border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800`}
            >
              {copiedOrderQuoteId === quote.id ? "복사됨" : "발주글복사"}
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
            <button
              type="button"
              disabled={isDuplicating}
              onClick={() => handleDuplicateQuote(quote)}
              className={`${actionButtonClass} border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800`}
            >
              {duplicatingQuoteId === quote.id ? "복제 중..." : "복제"}
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                setActionError(null);
                setDeletingQuote(quote);
              }}
              className={`${actionButtonClass} border-zinc-300 text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-zinc-600 dark:hover:bg-red-950/30`}
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasQuotes =
    favoriteQuotes.length > 0 ||
    quoteCompletedSection.totalCount > 0 ||
    salesCompletedSection.totalCount > 0;

  function renderQuoteSection(
    sectionKey: "quoteCompleted" | "salesCompleted",
    title: string,
    titleClassName: string | undefined,
    section: QuoteListSectionData,
  ) {
    if (section.totalCount <= 0) return null;

    return (
      <div key={sectionKey} className="space-y-4">
        <QuoteListSection
          title={title}
          titleClassName={titleClassName}
          totalCount={section.totalCount}
          collapsed={collapsedSections[sectionKey]}
          onToggle={() =>
            setCollapsedSections((current) => ({
              ...current,
              [sectionKey]: !current[sectionKey],
            }))
          }
          pageSize={section.pageSize}
          onPageSizeChange={section.onPageSizeChange}
        >
          {section.items.length > 0 ? (
            section.items.map((quote) => renderQuoteRow(quote))
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              {emptyMessage ?? "표시할 견적 기록이 없습니다."}
            </div>
          )}
        </QuoteListSection>

        <TablePagination
          currentPage={section.currentPage}
          totalPages={section.totalPages}
          onPageChange={section.onPageChange}
          ariaLabel={`${title} 페이지`}
        />
      </div>
    );
  }

  return (
    <>
      {actionError ? (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {actionError}
        </p>
      ) : null}

      <div className="mt-4 space-y-4">
        {!hasQuotes ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-3 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            {emptyMessage ?? "표시할 견적 기록이 없습니다."}
          </div>
        ) : null}

        {favoriteQuotes.length > 0 ? (
          <QuoteListSection
            title="즐겨찾기"
            titleClassName="text-base font-bold text-blue-600 dark:text-blue-400"
            totalCount={favoriteQuotes.length}
            collapsed={collapsedSections.favorites}
            onToggle={() =>
              setCollapsedSections((current) => ({
                ...current,
                favorites: !current.favorites,
              }))
            }
          >
            {favoriteQuotes.map((quote) => renderQuoteRow(quote))}
          </QuoteListSection>
        ) : null}

        {renderQuoteSection(
          "quoteCompleted",
          "견적중",
          "text-base font-bold text-zinc-900 dark:text-zinc-100",
          quoteCompletedSection,
        )}

        {renderQuoteSection(
          "salesCompleted",
          "매출완료",
          "text-base font-bold text-zinc-700 dark:text-zinc-200",
          salesCompletedSection,
        )}
      </div>

      {editingQuote ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quote-edit-title"
            className="my-4 w-full max-w-app rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
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
              userId={userId}
              quoteId={editingQuote.id}
              initialQuote={{
                quote_date: editingQuote.quote_date,
                sale_category: displaySaleCategoryFromList(
                  editingQuote.sale_category,
                  saleCategories,
                ),
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
              saleCategories={saleCategories}
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
        <QuoteConvertDialog
          title="매출기록하겠습니까?"
          description={`${convertingQuote.customer_name} 견적 (${convertingQuote.quote_items.length}개 제품)을 매출로 기록합니다.`}
          quoteTotal={convertingQuote.total_amount}
          items={convertingQuote.quote_items.map((item) => ({
            id: item.id,
            model_name: item.model_name,
            product_name: item.product_name,
            quantity: item.quantity,
            fulfillment_location: item.fulfillment_location ?? "매장",
            purchase_price: item.purchase_price,
          }))}
          defaultCardFeePercent={defaultCardFeePercentFromPayment(
            convertingQuote.payment_method,
          )}
          defaultActualFeeRate={
            paymentMethods.find(
              (method) => method.id === convertingQuote.payment_method_id,
            )?.fee_rate ?? 0
          }
          staffOptions={staffOptions}
          defaultSellerName={
            isOthersQuote(convertingQuote)
              ? convertingQuote.created_by_name?.trim() ||
                currentUserName ||
                staffOptions[0]?.full_name ||
                ""
              : currentUserName || staffOptions[0]?.full_name || ""
          }
          showSellerPicker={isOthersQuote(convertingQuote)}
          isPending={isConverting}
          onConfirm={handleConfirmConvert}
          onCancel={() => {
            if (!isConverting) setConvertingQuote(null);
          }}
        />
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

      {deletingQuote ? (
        <DeleteConfirmDialog
          count={1}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            if (!isDeleting) setDeletingQuote(null);
          }}
        />
      ) : null}
    </>
  );
}
