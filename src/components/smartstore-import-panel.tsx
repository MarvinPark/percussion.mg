"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  getSmartstoreDefaultRange,
  importSmartstoreOrders,
  previewSmartstoreOrders,
  type SmartstoreImportPreviewItem,
  type SmartstoreImportResult,
} from "@/app/(main)/sales/smartstore/actions";
import SmartstoreProductCombobox from "@/components/smartstore-product-combobox";
import SmartstoreProductCreateModal from "@/components/smartstore-product-create-modal";
import { formatKRW } from "@/lib/sales-calculator";
import { formatLinkedProductDisplayLabel } from "@/lib/product-search";
import { SMARTSTORE_SCHEMA_SQL } from "@/lib/smartstore-schema-sql";
import type { SaleProductOption } from "@/types/sale";

type SmartstoreImportPanelProps = {
  canImport: boolean;
  products: SaleProductOption[];
};

const buttonClass =
  "inline-flex h-9 items-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const primaryButtonClass =
  "inline-flex h-9 items-center rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:hover:bg-emerald-400";

function getEffectiveProductId(
  item: SmartstoreImportPreviewItem,
  manualMatches: Record<string, string>,
  dismissedAutoMatches: Set<string>,
) {
  const manualProductId = manualMatches[item.productOrderId];
  if (manualProductId) return manualProductId;
  if (dismissedAutoMatches.has(item.productOrderId)) return "";
  return item.matchedProductId ?? "";
}

function formatMatchedProductLabel(item: SmartstoreImportPreviewItem) {
  return formatLinkedProductDisplayLabel({
    brand: item.matchedProductBrand,
    model_name: item.matchedProductModelName,
    sku: item.matchedProductSku,
  });
}

function summarizePreview(
  items: SmartstoreImportPreviewItem[],
  manualMatches: Record<string, string>,
  dismissedAutoMatches: Set<string>,
  autoCreateProducts: boolean,
) {
  const importable = items.filter((item) => {
    if (item.alreadyImported) return false;
    if (getEffectiveProductId(item, manualMatches, dismissedAutoMatches)) {
      return true;
    }
    return autoCreateProducts;
  }).length;
  const existing = items.filter((item) => item.alreadyImported).length;
  const unmatched = items.filter((item) => {
    if (item.alreadyImported) return false;
    if (getEffectiveProductId(item, manualMatches, dismissedAutoMatches)) {
      return false;
    }
    return !autoCreateProducts;
  }).length;
  const needsLink = items.filter((item) => {
    if (item.alreadyImported) return false;
    if (getEffectiveProductId(item, manualMatches, dismissedAutoMatches)) {
      return false;
    }
    return autoCreateProducts;
  }).length;

  return { importable, existing, unmatched, needsLink, total: items.length };
}

function summarizeResult(result: SmartstoreImportResult) {
  return [
    `${result.imported}건 등록`,
    result.createdProducts ? `${result.createdProducts}건 제품 자동 등록` : null,
    result.skippedExisting ? `${result.skippedExisting}건 기등록` : null,
    result.skippedUnmatched ? `${result.skippedUnmatched}건 미매칭` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

export default function SmartstoreImportPanel({
  canImport,
  products,
}: SmartstoreImportPanelProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [items, setItems] = useState<SmartstoreImportPreviewItem[]>([]);
  const [localProducts, setLocalProducts] = useState(products);
  const [schemaReady, setSchemaReady] = useState(true);
  const [autoCreateProducts, setAutoCreateProducts] = useState(true);
  const [manualMatches, setManualMatches] = useState<Record<string, string>>(
    {},
  );
  const [dismissedAutoMatches, setDismissedAutoMatches] = useState<Set<string>>(
    () => new Set(),
  );
  const [createModalItem, setCreateModalItem] =
    useState<SmartstoreImportPreviewItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const [isImportPending, startImportTransition] = useTransition();
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  useEffect(() => {
    if (!isOpen || (fromDate && toDate)) return;

    getSmartstoreDefaultRange().then((range) => {
      setFromDate(range.fromDate);
      setToDate(range.toDate);
    });
  }, [isOpen, fromDate, toDate]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const sortedProducts = useMemo(
    () =>
      [...localProducts].sort((a, b) =>
        a.product_name.localeCompare(b.product_name, "ko"),
      ),
    [localProducts],
  );

  if (!canImport) return null;

  const previewSummary = summarizePreview(
    items,
    manualMatches,
    dismissedAutoMatches,
    autoCreateProducts,
  );

  function handlePreview() {
    setError(null);
    setMessage(null);
    setItems([]);
    setManualMatches({});
    setDismissedAutoMatches(new Set());

    startPreviewTransition(async () => {
      const result = await previewSmartstoreOrders(fromDate, toDate);
      if ("error" in result) {
        setError(result.error ?? "주문 조회에 실패했습니다.");
        return;
      }

      setItems(result.items);
      setSchemaReady(result.schemaReady);
      if (result.items.length === 0) {
        setMessage("해당 기간에 결제 완료된 스마트스토어 주문이 없습니다.");
      }
    });
  }

  function handleImport() {
    setError(null);
    setMessage(null);

    startImportTransition(async () => {
      const result = await importSmartstoreOrders(fromDate, toDate, {
        autoCreateProducts,
        manualMatches,
        dismissedAutoMatches: [...dismissedAutoMatches],
      });
      if ("error" in result) {
        setError(result.error ?? "가져오기에 실패했습니다.");
        return;
      }

      setMessage(`스마트스토어 주문을 가져왔습니다. ${summarizeResult(result)}`);
      if (result.errors.length > 0) {
        setError(result.errors.slice(0, 3).join("\n"));
      }

      setItems([]);
      setManualMatches({});
      setDismissedAutoMatches(new Set());
      router.refresh();
    });
  }

  function handleManualMatch(
    productOrderId: string,
    product: SaleProductOption,
  ) {
    setDismissedAutoMatches((current) => {
      const next = new Set(current);
      next.delete(productOrderId);
      return next;
    });
    setLocalProducts((current) => {
      if (current.some((entry) => entry.id === product.id)) return current;
      return [...current, product];
    });
    setManualMatches((current) => ({
      ...current,
      [productOrderId]: product.id,
    }));
  }

  function handleManualClear(productOrderId: string, hadAutoMatch: boolean) {
    setManualMatches((current) => {
      const next = { ...current };
      delete next[productOrderId];
      return next;
    });
    if (hadAutoMatch) {
      setDismissedAutoMatches((current) => {
        const next = new Set(current);
        next.add(productOrderId);
        return next;
      });
    }
  }

  function handleProductCreated(
    item: SmartstoreImportPreviewItem,
    product: SaleProductOption,
  ) {
    setLocalProducts((current) => {
      if (current.some((entry) => entry.id === product.id)) return current;
      return [...current, product];
    });
    handleManualMatch(item.productOrderId, product);
    setMessage(`「${product.product_name}」 제품을 등록하고 연결했습니다.`);
    router.refresh();
  }

  function handleCopySql() {
    void navigator.clipboard.writeText(SMARTSTORE_SCHEMA_SQL).then(() => {
      setCopiedSql(true);
      window.setTimeout(() => setCopiedSql(false), 2000);
    });
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/30">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
            스마트스토어 주문
          </p>
          <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">
            결제 완료 주문을 매출로 가져옵니다. 재고는 자동 차감하지 않습니다.
          </p>
        </div>
        <button
          type="button"
          className={buttonClass}
          onClick={() => setIsOpen((open) => !open)}
        >
          {isOpen ? "닫기" : "불러오기"}
        </button>
      </div>

      {isOpen ? (
        <div className="space-y-4 border-t border-emerald-200 px-4 py-4 dark:border-emerald-900">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                시작일
              </span>
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                종료일
              </span>
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
              />
            </label>
            <button
              type="button"
              onClick={handlePreview}
              disabled={isPreviewPending || isImportPending}
              className={buttonClass}
            >
              {isPreviewPending ? "조회 중..." : "미리보기"}
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={
                isPreviewPending ||
                isImportPending ||
                previewSummary.importable === 0 ||
                !schemaReady
              }
              className={primaryButtonClass}
            >
              {isImportPending ? "가져오는 중..." : "매출 등록"}
            </button>
          </div>

          <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={autoCreateProducts}
              onChange={(event) => setAutoCreateProducts(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              미매칭 제품을 재고에 자동 등록 (공급처: 스마트스토어, 재고 0)
              <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                연결 제품 칸에서 제품명·SKU·모델명으로 검색할 수 있습니다. 상품
                영역 우클릭으로 제품 등록 팝업을 열 수 있습니다.
              </span>
            </span>
          </label>

          {!schemaReady ? (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
              <p>
                매출 등록하려면 Supabase에서 SQL을 <strong>한 번</strong> 실행해야
                합니다. (미리보기는 SQL 없이도 됩니다)
              </p>
              <ol className="list-decimal space-y-1 pl-5 text-xs sm:text-sm">
                <li>Supabase 대시보드 → SQL Editor → New query</li>
                <li>아래 SQL 붙여넣기 → Run</li>
                <li>Success 확인 후 이 페이지 새로고침</li>
              </ol>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleCopySql} className={buttonClass}>
                  {copiedSql ? "SQL 복사됨" : "SQL 복사"}
                </button>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClass}
                >
                  Supabase 열기
                </a>
              </div>
              <pre className="max-h-40 overflow-auto rounded border border-amber-200 bg-white p-2 text-[11px] leading-relaxed text-zinc-800 dark:border-amber-900 dark:bg-zinc-950 dark:text-zinc-200">
                {SMARTSTORE_SCHEMA_SQL}
              </pre>
            </div>
          ) : null}

          {message ? (
            <p
              role="status"
              className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200"
            >
              {message}
            </p>
          ) : null}

          {error ? (
            <p className="whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          ) : null}

          {items.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                총 {previewSummary.total}건 · 등록 가능 {previewSummary.importable}
                건 · 기등록 {previewSummary.existing}건
                {previewSummary.needsLink
                  ? ` · 연결필요 ${previewSummary.needsLink}건`
                  : ""}
                {previewSummary.unmatched
                  ? ` · 미매칭 ${previewSummary.unmatched}건`
                  : ""}
              </p>
              <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                <table className="min-w-full text-xs">
                  <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">날짜</th>
                      <th className="px-3 py-2 text-left font-semibold">상품</th>
                      <th className="px-3 py-2 text-left font-semibold">연결 제품</th>
                      <th className="px-3 py-2 text-right font-semibold">수량</th>
                      <th className="px-3 py-2 text-right font-semibold">결제금액</th>
                      <th className="px-3 py-2 text-left font-semibold">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const manualProductId =
                        manualMatches[item.productOrderId] ?? "";
                      const linkedProductId = getEffectiveProductId(
                        item,
                        manualMatches,
                        dismissedAutoMatches,
                      );
                      const status = item.alreadyImported
                        ? "기등록"
                        : manualProductId
                          ? "수동 연결"
                          : linkedProductId
                            ? "등록 가능"
                            : autoCreateProducts
                              ? "연결필요"
                              : "미매칭";
                      const linkedProductLabel = formatMatchedProductLabel(item);

                      return (
                        <tr
                          key={item.productOrderId}
                          className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                        >
                          <td className="px-3 py-2 whitespace-nowrap">{item.soldAt}</td>
                          <td
                            className="cursor-context-menu px-3 py-2"
                            title="우클릭: 제품 등록"
                            onContextMenu={(event) => {
                              if (item.alreadyImported) return;
                              event.preventDefault();
                              setCreateModalItem(item);
                            }}
                          >
                            <div>{item.productName}</div>
                            {item.sellerProductCode ? (
                              <div className="text-zinc-500">
                                SKU: {item.sellerProductCode}
                              </div>
                            ) : null}
                            {item.productOption ? (
                              <div className="text-zinc-500">{item.productOption}</div>
                            ) : null}
                            {!item.alreadyImported ? (
                              <div className="mt-1 text-[10px] text-zinc-400">
                                우클릭: 제품 등록
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2">
                            {item.alreadyImported ? (
                              item.matchedProductName ?? "—"
                            ) : (
                              <SmartstoreProductCombobox
                                products={sortedProducts}
                                selectedProductId={linkedProductId}
                                autoMatchedProductId={item.matchedProductId}
                                linkedProductLabel={linkedProductLabel}
                                onSelect={(product) =>
                                  handleManualMatch(item.productOrderId, product)
                                }
                                onClear={() =>
                                  handleManualClear(
                                    item.productOrderId,
                                    Boolean(item.matchedProductId),
                                  )
                                }
                              />
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">{item.quantity}</td>
                          <td className="px-3 py-2 text-right">
                            {formatKRW(item.totalPaymentAmount)}원
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {createModalItem ? (
        <SmartstoreProductCreateModal
          item={createModalItem}
          onClose={() => setCreateModalItem(null)}
          onCreated={(product) => {
            handleProductCreated(createModalItem, product);
            setCreateModalItem(null);
          }}
        />
      ) : null}
    </div>
  );
}
