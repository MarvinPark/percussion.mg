"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from "react";
import {
  importCafe24ExcelOrders,
  previewCafe24ExcelImport,
} from "@/app/(main)/sales/cafe24-excel/actions";
import Cafe24ExcelProductCreateModal from "@/components/cafe24-excel-product-create-modal";
import PaymentMethodCombobox from "@/components/payment-method-combobox";
import PriceInput from "@/components/price-input";
import SmartstoreProductCombobox from "@/components/smartstore-product-combobox";
import { parseCafe24OrdersFile } from "@/lib/cafe24-orders/parse-orders-file";
import type {
  Cafe24ExcelImportPreviewItem,
  Cafe24ExcelImportResult,
  ParsedCafe24OrderRow,
} from "@/lib/cafe24-orders/types";
import { formatKRW } from "@/lib/sales-calculator";
import { formatLinkedProductDisplayLabel } from "@/lib/product-search";
import {
  DEFAULT_FULFILLMENT_LOCATION,
  FULFILLMENT_LOCATIONS,
  type FulfillmentLocation,
} from "@/lib/quote-fulfillment";
import { SMARTSTORE_SCHEMA_SQL } from "@/lib/smartstore-schema-sql";
import type { PaymentMethod, SaleProductOption } from "@/types/sale";

type Cafe24ExcelImportPanelProps = {
  canImport: boolean;
  products: SaleProductOption[];
  paymentMethods: PaymentMethod[];
};

const buttonClass =
  "inline-flex h-9 items-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

const primaryButtonClass =
  "inline-flex h-9 items-center rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400";

const compactSelectClass =
  "h-[26px] rounded border border-zinc-300 bg-white px-2 py-1 text-xs leading-none text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

function getEffectiveProductId(
  item: Cafe24ExcelImportPreviewItem,
  manualMatches: Record<string, string>,
  dismissedAutoMatches: Set<string>,
) {
  const manualProductId = manualMatches[item.lineId];
  if (manualProductId) return manualProductId;
  if (dismissedAutoMatches.has(item.lineId)) return "";
  return item.matchedProductId ?? "";
}

function formatMatchedProductLabel(item: Cafe24ExcelImportPreviewItem) {
  return formatLinkedProductDisplayLabel({
    brand: item.matchedProductBrand,
    model_name: item.matchedProductModelName,
    sku: item.matchedProductSku,
  });
}

function getLinkedProduct(
  item: Cafe24ExcelImportPreviewItem,
  manualMatches: Record<string, string>,
  dismissedAutoMatches: Set<string>,
  products: SaleProductOption[],
) {
  const productId = getEffectiveProductId(
    item,
    manualMatches,
    dismissedAutoMatches,
  );
  if (!productId) return null;
  return products.find((product) => product.id === productId) ?? null;
}

function getPurchasePrice(
  item: Cafe24ExcelImportPreviewItem,
  purchasePrices: Record<string, number>,
  manualMatches: Record<string, string>,
  dismissedAutoMatches: Set<string>,
  products: SaleProductOption[],
) {
  if (purchasePrices[item.lineId] !== undefined) {
    return purchasePrices[item.lineId];
  }

  const linkedProduct = getLinkedProduct(
    item,
    manualMatches,
    dismissedAutoMatches,
    products,
  );
  if (linkedProduct) {
    return Number(linkedProduct.purchase_price) || 0;
  }

  return item.matchedProductPurchasePrice ?? 0;
}

function summarizePreview(
  items: Cafe24ExcelImportPreviewItem[],
  manualMatches: Record<string, string>,
  dismissedAutoMatches: Set<string>,
  paymentMethodIds: Record<string, string>,
  autoCreateProducts: boolean,
) {
  const importable = items.filter((item) => {
    if (item.alreadyImported) return false;
    if (!paymentMethodIds[item.lineId]) return false;
    if (getEffectiveProductId(item, manualMatches, dismissedAutoMatches)) {
      return true;
    }
    return autoCreateProducts;
  }).length;

  const existing = items.filter((item) => item.alreadyImported).length;
  const missingPayment = items.filter(
    (item) => !item.alreadyImported && !paymentMethodIds[item.lineId],
  ).length;
  const unmatched = items.filter((item) => {
    if (item.alreadyImported) return false;
    if (!paymentMethodIds[item.lineId]) return false;
    if (getEffectiveProductId(item, manualMatches, dismissedAutoMatches)) {
      return false;
    }
    return !autoCreateProducts;
  }).length;
  const needsLink = items.filter((item) => {
    if (item.alreadyImported) return false;
    if (!paymentMethodIds[item.lineId]) return false;
    if (getEffectiveProductId(item, manualMatches, dismissedAutoMatches)) {
      return false;
    }
    return autoCreateProducts;
  }).length;

  return {
    importable,
    existing,
    missingPayment,
    unmatched,
    needsLink,
    total: items.length,
  };
}

function summarizeResult(result: Cafe24ExcelImportResult) {
  return [
    `${result.imported}건 등록`,
    result.createdProducts ? `${result.createdProducts}건 제품 자동 등록` : null,
    result.skippedExisting ? `${result.skippedExisting}건 기등록` : null,
    result.skippedMissingPayment
      ? `${result.skippedMissingPayment}건 결제방식 미선택`
      : null,
    result.skippedUnmatched ? `${result.skippedUnmatched}건 미매칭` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

function createPaymentFocusRef(
  refs: Record<string, HTMLInputElement | null>,
  lineId: string,
): RefObject<HTMLInputElement | null> {
  return {
    get current() {
      return refs[lineId] ?? null;
    },
  };
}

export default function Cafe24ExcelImportPanel({
  canImport,
  products,
  paymentMethods,
}: Cafe24ExcelImportPanelProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const paymentInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedCafe24OrderRow[]>([]);
  const [items, setItems] = useState<Cafe24ExcelImportPreviewItem[]>([]);
  const [localProducts, setLocalProducts] = useState(products);
  const [schemaReady, setSchemaReady] = useState(true);
  const [autoCreateProducts, setAutoCreateProducts] = useState(true);
  const [hideImported, setHideImported] = useState(true);
  const [bulkPaymentMethodId, setBulkPaymentMethodId] = useState("");
  const [bulkFulfillmentLocation, setBulkFulfillmentLocation] =
    useState<FulfillmentLocation>(DEFAULT_FULFILLMENT_LOCATION);
  const [manualMatches, setManualMatches] = useState<Record<string, string>>(
    {},
  );
  const [paymentMethodIds, setPaymentMethodIds] = useState<
    Record<string, string>
  >({});
  const [fulfillmentLocations, setFulfillmentLocations] = useState<
    Record<string, FulfillmentLocation>
  >({});
  const [purchasePrices, setPurchasePrices] = useState<Record<string, number>>(
    {},
  );
  const [dismissedAutoMatches, setDismissedAutoMatches] = useState<Set<string>>(
    () => new Set(),
  );
  const [createModalItem, setCreateModalItem] =
    useState<Cafe24ExcelImportPreviewItem | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const [isImportPending, startImportTransition] = useTransition();
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

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

  const visibleItems = useMemo(
    () => (hideImported ? items.filter((item) => !item.alreadyImported) : items),
    [hideImported, items],
  );

  const previewSummary = summarizePreview(
    items,
    manualMatches,
    dismissedAutoMatches,
    paymentMethodIds,
    autoCreateProducts,
  );

  if (!canImport) return null;

  async function refreshPreviewRows(rows: ParsedCafe24OrderRow[]) {
    const result = await previewCafe24ExcelImport(rows);
    if ("error" in result) {
      setError(result.error ?? "미리보기 생성에 실패했습니다.");
      return false;
    }

    setItems(result.items);
    setSchemaReady(result.schemaReady);
    setManualMatches({});
    setDismissedAutoMatches(new Set());
    setPurchasePrices({});
    setFulfillmentLocations((current) => {
      const next = { ...current };
      for (const item of result.items) {
        if (item.alreadyImported) continue;
        if (!next[item.lineId]) {
          next[item.lineId] = DEFAULT_FULFILLMENT_LOCATION;
        }
      }
      return next;
    });
    return true;
  }

  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setMessage(null);
    setItems([]);
    setParsedRows([]);
    setManualMatches({});
    setPaymentMethodIds({});
    setFulfillmentLocations({});
    setPurchasePrices({});
    setDismissedAutoMatches(new Set());

    startPreviewTransition(async () => {
      const buffer = await file.arrayBuffer();
      const parsed = parseCafe24OrdersFile(buffer);
      if ("error" in parsed) {
        setError(parsed.error);
        setFileName(null);
        return;
      }

      setFileName(file.name);
      setParsedRows(parsed.rows);

      const refreshed = await refreshPreviewRows(parsed.rows);
      if (refreshed && parsed.rows.length === 0) {
        setMessage("등록 가능한 주문 행이 없습니다.");
      }
    });
  }

  function handleApplyBulkPaymentMethod() {
    if (!bulkPaymentMethodId) return;

    setPaymentMethodIds((current) => {
      const next = { ...current };
      for (const item of items) {
        if (item.alreadyImported) continue;
        next[item.lineId] = bulkPaymentMethodId;
      }
      return next;
    });
  }

  function handleApplyBulkFulfillmentLocation() {
    setFulfillmentLocations((current) => {
      const next = { ...current };
      for (const item of items) {
        if (item.alreadyImported) continue;
        next[item.lineId] = bulkFulfillmentLocation;
      }
      return next;
    });
  }

  function handleImport() {
    setError(null);
    setMessage(null);

    const effectiveManualMatches = { ...manualMatches };
    for (const item of items) {
      if (item.alreadyImported) continue;
      if (effectiveManualMatches[item.lineId]) continue;
      if (dismissedAutoMatches.has(item.lineId)) continue;
      if (item.matchedProductId) {
        effectiveManualMatches[item.lineId] = item.matchedProductId;
      }
    }

    startImportTransition(async () => {
      const effectivePurchasePrices: Record<string, number> = {};
      for (const item of items) {
        if (item.alreadyImported) continue;
        effectivePurchasePrices[item.lineId] = getPurchasePrice(
          item,
          purchasePrices,
          effectiveManualMatches,
          dismissedAutoMatches,
          localProducts,
        );
      }

      const result = await importCafe24ExcelOrders(parsedRows, {
        autoCreateProducts,
        manualMatches: effectiveManualMatches,
        dismissedAutoMatches: [...dismissedAutoMatches],
        paymentMethodIds,
        fulfillmentLocations,
        purchasePrices: effectivePurchasePrices,
      });

      if ("error" in result) {
        setError(result.error ?? "매출 등록에 실패했습니다.");
        return;
      }

      setMessage(`엑셀 매출을 등록했습니다. ${summarizeResult(result)}`);
      if (result.errors.length > 0) {
        setError(result.errors.slice(0, 3).join("\n"));
      }

      if (parsedRows.length > 0) {
        await refreshPreviewRows(parsedRows);
      }
      router.refresh();
    });
  }

  function handleManualMatch(lineId: string, product: SaleProductOption) {
    setDismissedAutoMatches((current) => {
      const next = new Set(current);
      next.delete(lineId);
      return next;
    });
    setLocalProducts((current) => {
      if (current.some((entry) => entry.id === product.id)) return current;
      return [...current, product];
    });
    setManualMatches((current) => ({
      ...current,
      [lineId]: product.id,
    }));
    setPurchasePrices((current) => ({
      ...current,
      [lineId]: Number(product.purchase_price) || 0,
    }));
  }

  function handleManualClear(lineId: string, hadAutoMatch: boolean) {
    setManualMatches((current) => {
      const next = { ...current };
      delete next[lineId];
      return next;
    });
    setPurchasePrices((current) => {
      const next = { ...current };
      delete next[lineId];
      return next;
    });
    if (hadAutoMatch) {
      setDismissedAutoMatches((current) => {
        const next = new Set(current);
        next.add(lineId);
        return next;
      });
    }
  }

  function handleProductCreated(
    item: Cafe24ExcelImportPreviewItem,
    product: SaleProductOption,
  ) {
    setLocalProducts((current) => {
      if (current.some((entry) => entry.id === product.id)) return current;
      return [...current, product];
    });
    handleManualMatch(item.lineId, product);
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
    <div className="rounded-xl border border-blue-200 bg-blue-50/70 dark:border-blue-900 dark:bg-blue-950/30">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            엑셀 매출 등록
          </p>
          <p className="mt-1 text-xs text-blue-800/80 dark:text-blue-200/80">
            카페24에서 다운로드한 주문 엑셀(CSV/XLSX)을 업로드해 매출로
            등록합니다. 행마다 출고지를 선택할 수 있으며, 「매장」일 때만 재고가
            차감됩니다.
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
        <div className="space-y-4 border-t border-blue-200 px-4 py-4 dark:border-blue-900">
          <div className="flex flex-wrap items-end gap-3">
            <div className="text-sm">
              <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                카페24 주문 파일
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPreviewPending || isImportPending}
                className={buttonClass}
              >
                {isPreviewPending ? "읽는 중..." : "파일 선택"}
              </button>
              {fileName ? (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {fileName} · {parsedRows.length}행
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={handleImport}
              disabled={
                isPreviewPending ||
                isImportPending ||
                previewSummary.importable === 0 ||
                !schemaReady ||
                parsedRows.length === 0
              }
              className={primaryButtonClass}
            >
              {isImportPending ? "등록 중..." : "매출 등록"}
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
            <label className="min-w-[12rem] flex-1 text-sm">
              <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                기본 결제방식
              </span>
              <PaymentMethodCombobox
                paymentMethods={paymentMethods}
                value={bulkPaymentMethodId}
                onChange={setBulkPaymentMethodId}
                className={`${compactSelectClass} w-36 sm:w-40`}
                placeholder="결제방식 검색"
                showFeeInLabel
              />
            </label>
            <button
              type="button"
              onClick={handleApplyBulkPaymentMethod}
              disabled={!bulkPaymentMethodId || items.length === 0}
              className={buttonClass}
            >
              모든 행에 적용
            </button>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              각 행에서 결제방식을 개별 선택할 수도 있습니다.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
                기본 출고지
              </span>
              <select
                value={bulkFulfillmentLocation}
                onChange={(event) =>
                  setBulkFulfillmentLocation(
                    event.target.value as FulfillmentLocation,
                  )
                }
                className={`${compactSelectClass} min-w-[6rem]`}
              >
                {FULFILLMENT_LOCATIONS.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleApplyBulkFulfillmentLocation}
              disabled={items.length === 0}
              className={buttonClass}
            >
              모든 행에 적용
            </button>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              각 행에서 출고지를 개별 선택할 수도 있습니다.
            </p>
          </div>

          <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={hideImported}
              onChange={(event) => setHideImported(event.target.checked)}
              className="mt-0.5"
            />
            <span>기등록 주문 숨기기</span>
          </label>

          <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={autoCreateProducts}
              onChange={(event) => setAutoCreateProducts(event.target.checked)}
              className="mt-0.5"
            />
            <span>
              미매칭 제품을 재고에 자동 등록 (공급처: 카페24, 재고 0)
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
                합니다.
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleCopySql} className={buttonClass}>
                  {copiedSql ? "SQL 복사됨" : "SQL 복사"}
                </button>
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
                {previewSummary.missingPayment
                  ? ` · 결제방식 필요 ${previewSummary.missingPayment}건`
                  : ""}
                {hideImported && previewSummary.existing > 0
                  ? ` (${previewSummary.existing}건 숨김)`
                  : ""}
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
                      <th className="px-3 py-2 text-left font-semibold">쇼핑몰</th>
                      <th className="px-3 py-2 text-left font-semibold">상품</th>
                      <th className="px-3 py-2 text-left font-semibold">연결 제품</th>
                      <th className="px-3 py-2 text-left font-semibold">결제방식</th>
                      <th className="px-3 py-2 text-left font-semibold">출고지</th>
                      <th className="px-3 py-2 text-right font-semibold">수량</th>
                      <th className="px-3 py-2 text-right font-semibold">매입가</th>
                      <th className="px-3 py-2 text-right font-semibold">소비자가</th>
                      <th className="px-3 py-2 text-left font-semibold">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-3 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400"
                        >
                          표시할 주문이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      visibleItems.map((item) => {
                        const manualProductId = manualMatches[item.lineId] ?? "";
                        const linkedProductId = getEffectiveProductId(
                          item,
                          manualMatches,
                          dismissedAutoMatches,
                        );
                        const paymentMethodId = paymentMethodIds[item.lineId] ?? "";
                        const rowFulfillmentLocation =
                          fulfillmentLocations[item.lineId] ??
                          DEFAULT_FULFILLMENT_LOCATION;
                        const status = item.alreadyImported
                          ? "기등록"
                          : !paymentMethodId
                            ? "결제방식 필요"
                            : manualProductId
                              ? "수동 연결"
                              : linkedProductId
                                ? "등록 가능"
                                : autoCreateProducts
                                  ? "연결필요"
                                  : "미매칭";
                        const linkedProductLabel = formatMatchedProductLabel(item);
                        const lineTotal = item.unitSalePrice * item.quantity;
                        const purchasePrice = getPurchasePrice(
                          item,
                          purchasePrices,
                          manualMatches,
                          dismissedAutoMatches,
                          localProducts,
                        );

                        return (
                          <tr
                            key={item.lineId}
                            className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                          >
                            <td className="px-3 py-2 whitespace-nowrap">
                              {item.soldAt}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {item.mallName || "—"}
                            </td>
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
                              <div className="text-zinc-500">
                                주문 {item.orderNo}
                              </div>
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
                                  nextFocusRef={createPaymentFocusRef(
                                    paymentInputRefs.current,
                                    item.lineId,
                                  )}
                                  onSelect={(product) =>
                                    handleManualMatch(item.lineId, product)
                                  }
                                  onClear={() =>
                                    handleManualClear(
                                      item.lineId,
                                      Boolean(item.matchedProductId),
                                    )
                                  }
                                />
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {item.alreadyImported ? (
                                "—"
                              ) : (
                                <PaymentMethodCombobox
                                  paymentMethods={paymentMethods}
                                  value={paymentMethodId}
                                  registerInput={(element) => {
                                    paymentInputRefs.current[item.lineId] =
                                      element;
                                  }}
                                  onChange={(nextValue) =>
                                    setPaymentMethodIds((current) => ({
                                      ...current,
                                      [item.lineId]: nextValue,
                                    }))
                                  }
                                  className={`${compactSelectClass} w-36 sm:w-40`}
                                  placeholder="결제방식"
                                  showFeeInLabel
                                />
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {item.alreadyImported ? (
                                "—"
                              ) : (
                                <select
                                  value={rowFulfillmentLocation}
                                  onChange={(event) =>
                                    setFulfillmentLocations((current) => ({
                                      ...current,
                                      [item.lineId]:
                                        event.target.value as FulfillmentLocation,
                                    }))
                                  }
                                  className={compactSelectClass}
                                >
                                  {FULFILLMENT_LOCATIONS.map((location) => (
                                    <option key={location} value={location}>
                                      {location}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">{item.quantity}</td>
                            <td className="px-3 py-2 text-right">
                              {item.alreadyImported ? (
                                "—"
                              ) : (
                                <PriceInput
                                  value={purchasePrice}
                                  onChange={(nextValue) =>
                                    setPurchasePrices((current) => ({
                                      ...current,
                                      [item.lineId]: Math.max(0, nextValue),
                                    }))
                                  }
                                  className={`${compactSelectClass} w-24 text-right`}
                                  aria-label={`${item.orderNo} 매입가`}
                                />
                              )}
                            </td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              {formatKRW(lineTotal)}원
                              {item.quantity > 1 ? (
                                <div className="text-zinc-500">
                                  @{formatKRW(item.unitSalePrice)}원
                                </div>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">{status}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {createModalItem ? (
        <Cafe24ExcelProductCreateModal
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
