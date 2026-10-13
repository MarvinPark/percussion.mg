"use client";

import { useMemo, useState, useTransition } from "react";
import {
  registerStockInForProductId,
  registerStockInsFromText,
  type StockInTextMissingRow,
} from "@/app/(main)/products/actions";
import BlockingLoadingOverlay from "@/components/blocking-loading-overlay";
import InlineProductCreateModal from "@/components/inline-product-create-modal";
import StockInTextMatchDialog from "@/components/stock-in-text-match-dialog";
import StockInTextMissingActionDialog from "@/components/stock-in-text-missing-action-dialog";
import StockInTextResultDialog, {
  type StockInTextResultState,
} from "@/components/stock-in-text-result-dialog";
import { parseStockInText } from "@/lib/stock-in-text-parser";
import { splitStockInLookupCode } from "@/lib/stock-in-text-product-lookup";
import type { InlineCreatedProduct } from "@/lib/inline-product-create-shared";
import type { SaleProductOption } from "@/types/sale";

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400";

const labelClass = "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const PLACEHOLDER = `매입처: KSV
XENYX 802S *1
Behringer C2 *1
Gibraltar SC-19A * 1`;

export default function StockInTextRegister() {
  const [movementDate, setMovementDate] = useState(todayString);
  const [text, setText] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [result, setResult] = useState<StockInTextResultState | null>(null);
  const [missingActionTarget, setMissingActionTarget] =
    useState<StockInTextMissingRow | null>(null);
  const [matchTarget, setMatchTarget] = useState<StockInTextMissingRow | null>(
    null,
  );
  const [registerTarget, setRegisterTarget] =
    useState<StockInTextMissingRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isRegisteringStock, setIsRegisteringStock] = useState(false);

  const preview = useMemo(() => parseStockInText(text), [text]);

  const showResultDialog =
    result && !missingActionTarget && !matchTarget && !registerTarget;

  function handleSubmit() {
    setClientError(null);
    startTransition(async () => {
      const response = await registerStockInsFromText({
        movement_date: movementDate,
        text,
      });

      if ("error" in response) {
        setClientError(response.error ?? "입고 처리에 실패했습니다.");
        return;
      }

      setResult({
        movement_date: response.movement_date,
        supplier: response.supplier,
        applied: response.applied,
        not_found: response.not_found,
        parse_errors: response.parse_errors,
      });

      if (response.applied.length > 0 && response.not_found.length === 0) {
        setText("");
      }
    });
  }

  function handleResolveMissing(row: StockInTextMissingRow) {
    if (row.is_stock_product) {
      setMissingActionTarget(row);
      return;
    }
    setRegisterTarget(row);
  }

  async function applyStockInForMissingRow(
    row: StockInTextMissingRow,
    product: { id: string; sku: string; product_name: string },
  ) {
    if (!result) return false;

    setIsRegisteringStock(true);
    try {
      const stockResult = await registerStockInForProductId({
        product_id: product.id,
        quantity: row.quantity,
        movement_date: result.movement_date,
      });

      if (stockResult.error) {
        setClientError(stockResult.error);
        return false;
      }

      setResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          applied: [
            ...prev.applied,
            {
              sku: product.sku,
              product_id: product.id,
              product_name: product.product_name,
              quantity: row.quantity,
              line_numbers: row.line_numbers,
            },
          ],
          not_found: prev.not_found.filter((item) => item.sku !== row.sku),
        };
      });
      return true;
    } finally {
      setIsRegisteringStock(false);
    }
  }

  async function handleProductCreated(product: InlineCreatedProduct) {
    if (!registerTarget) return;
    const ok = await applyStockInForMissingRow(registerTarget, product);
    if (ok) setRegisterTarget(null);
  }

  async function handleMatchedProduct(product: SaleProductOption) {
    if (!matchTarget) return;
    const ok = await applyStockInForMissingRow(matchTarget, {
      id: product.id,
      sku: product.sku ?? product.model_name,
      product_name: product.product_name,
    });
    if (ok) setMatchTarget(null);
  }

  const registerLookupSplit = registerTarget
    ? splitStockInLookupCode(registerTarget.sku)
    : null;
  const matchSearchQuery = matchTarget
    ? splitStockInLookupCode(matchTarget.sku).model_name || matchTarget.sku
    : "";

  const previewLineCount = preview.lines.length;
  const previewQty = preview.lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <section className="space-y-4 border-t border-zinc-200 pt-6 dark:border-zinc-700">
      <div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          텍스트로 입고
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          첫 줄에{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            매입처: 공급처명
          </code>
          을 넣으면 해당 매입처 제품만 찾아 재고에 반영합니다. 모델명·SKU와
          수량을 여러 줄 붙여넣을 수 있으며, 미등록 품목은 결과 창에서 기존
          제품과 매칭하거나 새로 등록할 수 있습니다.
        </p>
      </div>

      <div className="max-w-xs">
        <label htmlFor="text_stock_movement_date" className={labelClass}>
          입고일
        </label>
        <input
          id="text_stock_movement_date"
          type="date"
          value={movementDate}
          onChange={(event) => setMovementDate(event.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="stock_in_text" className={labelClass}>
          입고 목록
        </label>
        <textarea
          id="stock_in_text"
          rows={8}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={PLACEHOLDER}
          className={`${inputClass} font-mono text-xs leading-relaxed`}
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          품목 줄 형식:{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            모델명 수량
          </code>
          ,{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
            브랜드 모델명 * 수량
          </code>
          , 끝에{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">ea</code>{" "}
          가능 · 같은 품목 키는 수량 합산
        </p>
        {previewLineCount > 0 || preview.supplier ? (
          <p className="mt-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
            미리보기
            {preview.supplier ? `: 매입처 ${preview.supplier}` : ""}
            {previewLineCount > 0
              ? ` · ${previewLineCount}품목 · 총 ${previewQty}개`
              : ""}
            {preview.errors.length > 0
              ? ` · 형식 오류 ${preview.errors.length}줄`
              : ""}
          </p>
        ) : null}
      </div>

      {clientError ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {clientError}
        </p>
      ) : null}

      <button
        type="button"
        disabled={isPending || !text.trim()}
        onClick={handleSubmit}
        className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60 dark:bg-emerald-500 dark:hover:bg-emerald-400"
      >
        {isPending ? "처리 중..." : "텍스트 입고 실행"}
      </button>

      {showResultDialog ? (
        <StockInTextResultDialog
          result={result}
          onClose={() => setResult(null)}
          onResolveMissing={handleResolveMissing}
        />
      ) : null}

      {missingActionTarget ? (
        <StockInTextMissingActionDialog
          row={missingActionTarget}
          onClose={() => {
            if (!isRegisteringStock) setMissingActionTarget(null);
          }}
          onMatchExisting={() => {
            setMatchTarget(missingActionTarget);
            setMissingActionTarget(null);
          }}
          onRegisterNew={() => {
            setRegisterTarget(missingActionTarget);
            setMissingActionTarget(null);
          }}
        />
      ) : null}

      {matchTarget ? (
        <StockInTextMatchDialog
          row={matchTarget}
          initialSearchQuery={matchSearchQuery}
          isSubmitting={isRegisteringStock}
          onClose={() => {
            if (!isRegisteringStock) setMatchTarget(null);
          }}
          onConfirm={handleMatchedProduct}
        />
      ) : null}

      {registerTarget ? (
        <InlineProductCreateModal
          context="stock"
          elevated
          initialModelName={
            registerLookupSplit?.model_name || registerTarget.sku
          }
          initialBrand={registerLookupSplit?.brand ?? ""}
          initialSupplier={result?.supplier ?? preview.supplier ?? ""}
          onClose={() => {
            if (!isRegisteringStock) setRegisterTarget(null);
          }}
          onCreated={handleProductCreated}
        />
      ) : null}

      <BlockingLoadingOverlay
        open={isPending || isRegisteringStock}
        message={
          isRegisteringStock
            ? "제품 연결 및 입고 중..."
            : "텍스트 입고 처리 중..."
        }
      />
    </section>
  );
}
