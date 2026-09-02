"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QuoteCardPricingControls, {
  type AmountRoundingMode,
  type AmountRoundingUnit,
  type CardFeePercent,
} from "@/components/quote-card-pricing-controls";
import SalesSellerFilter from "@/components/sales-seller-filter";
import { resolveQuoteConvertPricing } from "@/lib/quote-card-pricing";
import { parseFulfillmentLocation, defaultQuoteConvertPurchaseQuantity } from "@/lib/quote-fulfillment";
import { formatKRW } from "@/lib/sales-calculator";
import { marginText } from "@/lib/ui-classes";

export type QuoteConvertLineItem = {
  id: string;
  model_name: string;
  product_name: string;
  quantity: number;
  fulfillment_location: string;
  purchase_price: number;
};

type StaffOption = {
  id: string;
  full_name: string;
};

export type QuoteConvertConfirmPayload = {
  seller: { userId: string; name: string };
  cardFeePercent: CardFeePercent;
  actualFeeRate: number;
  roundingUnit: AmountRoundingUnit;
  roundingMode: AmountRoundingMode;
  purchaseQuantities: Record<string, number>;
};

type QuoteConvertDialogProps = {
  title: string;
  description?: string;
  quoteTotal: number;
  items: QuoteConvertLineItem[];
  defaultCardFeePercent?: CardFeePercent;
  defaultActualFeeRate?: number;
  staffOptions: StaffOption[];
  defaultSellerName: string;
  showSellerPicker: boolean;
  isPending?: boolean;
  onConfirm: (payload: QuoteConvertConfirmPayload) => void;
  onCancel: () => void;
};

const tableInputClass =
  "w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const controlSelectClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const labelClass =
  "mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300";

function defaultCardFeePercentFromPayment(
  paymentMethodName: string | null | undefined,
): CardFeePercent {
  const name = paymentMethodName?.trim() ?? "";
  if (!name) return 0;
  if (/카드|네이버|페이|할부/i.test(name)) return 4;
  return 0;
}

function clampActualFeeRate(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(10, Math.max(0, Math.round(value * 10) / 10));
}

function formatFeeRate(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export default function QuoteConvertDialog({
  title,
  description,
  quoteTotal,
  items,
  defaultCardFeePercent,
  defaultActualFeeRate = 0,
  staffOptions,
  defaultSellerName,
  showSellerPicker,
  isPending = false,
  onConfirm,
  onCancel,
}: QuoteConvertDialogProps) {
  const yesButtonRef = useRef<HTMLButtonElement>(null);
  const sellerNames = staffOptions.map((staff) => staff.full_name);
  const [selectedSellerName, setSelectedSellerName] = useState(defaultSellerName);
  const [purchaseQuantities, setPurchaseQuantities] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      items.map((item) => {
        const defaultQuantity = defaultQuoteConvertPurchaseQuantity(item);
        return [
          item.id,
          defaultQuantity > 0 ? String(defaultQuantity) : "",
        ];
      }),
    ),
  );
  const [cardFeePercent, setCardFeePercent] = useState<CardFeePercent>(
    defaultCardFeePercent ?? 0,
  );
  const [actualFeeRate, setActualFeeRate] = useState(() =>
    clampActualFeeRate(defaultActualFeeRate),
  );
  const [roundingUnit, setRoundingUnit] = useState<AmountRoundingUnit>(1000);
  const [roundingMode, setRoundingMode] = useState<AmountRoundingMode>("ceil");

  useEffect(() => {
    yesButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || isPending) return;
      event.preventDefault();
      onCancel();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onCancel]);

  const pricingPreview = useMemo(
    () =>
      resolveQuoteConvertPricing(
        quoteTotal,
        cardFeePercent,
        roundingUnit,
        roundingMode,
      ),
    [quoteTotal, cardFeePercent, roundingUnit, roundingMode],
  );

  const saleTotal =
    cardFeePercent > 0 ? pricingPreview.cardPaymentTotal : quoteTotal;

  const feePreview = useMemo(() => {
    const pgFeeAmount = Math.round(saleTotal * (actualFeeRate / 100));
    const feeSpreadAmount =
      cardFeePercent > actualFeeRate
        ? Math.round(saleTotal * ((cardFeePercent - actualFeeRate) / 100))
        : 0;

    return { pgFeeAmount, feeSpreadAmount };
  }, [saleTotal, actualFeeRate, cardFeePercent]);

  function handleConfirm() {
    const selectedStaff =
      staffOptions.find((staff) => staff.full_name === selectedSellerName) ??
      staffOptions.find((staff) => staff.full_name === defaultSellerName) ??
      null;

    if (showSellerPicker && !selectedStaff) return;

    onConfirm({
      seller: {
        userId: selectedStaff?.id ?? "",
        name:
          selectedStaff?.full_name ??
          (selectedSellerName.trim() || defaultSellerName),
      },
      cardFeePercent,
      actualFeeRate: clampActualFeeRate(actualFeeRate),
      roundingUnit,
      roundingMode,
      purchaseQuantities: Object.fromEntries(
        items.map((item) => {
          const raw = purchaseQuantities[item.id]?.trim() ?? "";
          const parsed = raw ? Math.max(0, Math.round(Number(raw) || 0)) : 0;
          return [item.id, parsed];
        }),
      ),
    });
  }

  function updatePurchaseQuantity(itemId: string, value: string) {
    setPurchaseQuantities((current) => ({
      ...current,
      [itemId]: value,
    }));
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-convert-dialog-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <h3
          id="quote-convert-dialog-title"
          className="text-base font-semibold text-zinc-900 dark:text-zinc-100"
        >
          {title}
        </h3>
        {description ? (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        ) : null}

        <div className="mt-4">
          <QuoteCardPricingControls
            cardFeePercent={cardFeePercent}
            roundingUnit={roundingUnit}
            roundingMode={roundingMode}
            onCardFeePercentChange={setCardFeePercent}
            onRoundingUnitChange={setRoundingUnit}
            onRoundingModeChange={setRoundingMode}
            helperText="손님에게 청구할 카드 추가 요율입니다. 견적 합계에 더한 뒤 금액 단위·처리를 적용하며, 차액은 마지막 제품에 반영됩니다."
          />
        </div>

        <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/40">
          <label htmlFor="quote_convert_actual_fee_rate" className={labelClass}>
            실제 PG 수수료 (마진 차감)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="quote_convert_actual_fee_rate"
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={actualFeeRate}
              onChange={(event) =>
                setActualFeeRate(clampActualFeeRate(Number(event.target.value)))
              }
              className={controlSelectClass}
            />
            <span className="shrink-0 text-sm text-zinc-600 dark:text-zinc-400">
              %
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            VAN·PG에 실제로 나가는 수수료율입니다. 매출 마진 계산에만 사용되며,
            {cardFeePercent > 0
              ? ` 고객 청구(+${cardFeePercent}%)와 다를 수 있습니다.`
              : " 고객 청구 할증과 별도입니다."}
          </p>
        </div>

        <dl className="mt-4 space-y-1 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800/40">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-zinc-600 dark:text-zinc-400">견적 합계</dt>
            <dd className="font-semibold text-zinc-900 dark:text-zinc-100">
              {formatKRW(quoteTotal)}원
            </dd>
          </div>
          {cardFeePercent > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-zinc-600 dark:text-zinc-400">
                카드결제+{cardFeePercent}%
              </dt>
              <dd className="font-semibold text-blue-700 dark:text-blue-300">
                {formatKRW(pricingPreview.cardPaymentTotal)}원
              </dd>
            </div>
          ) : null}
          {pricingPreview.delta !== 0 ? (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-zinc-600 dark:text-zinc-400">
                차액 (마지막 제품 반영)
              </dt>
              <dd className="font-semibold text-zinc-700 dark:text-zinc-300">
                {pricingPreview.delta > 0 ? "+" : ""}
                {formatKRW(pricingPreview.delta)}원
              </dd>
            </div>
          ) : null}
          {actualFeeRate > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-zinc-600 dark:text-zinc-400">
                PG 수수료 ({formatFeeRate(actualFeeRate)}%)
              </dt>
              <dd className="font-semibold text-red-700 dark:text-red-300">
                -{formatKRW(feePreview.pgFeeAmount)}원
              </dd>
            </div>
          ) : null}
          {feePreview.feeSpreadAmount > 0 ? (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-zinc-600 dark:text-zinc-400">
                수수료 차익 (+{cardFeePercent}% − {formatFeeRate(actualFeeRate)}%)
              </dt>
              <dd className={`font-semibold ${marginText}`}>
                +{formatKRW(feePreview.feeSpreadAmount)}원
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
          <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/40">
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              매출전환 품목 · 매입 수량
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              매입 수량을 입력하면 입고 후 판매 수량만큼 재고에서 차감합니다.
              비워두면 입고 없이 재고에서 바로 차감합니다.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="border-b border-zinc-200 text-left text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">모델명</th>
                  <th className="px-3 py-2 font-semibold">제품명</th>
                  <th className="px-3 py-2 font-semibold">출고</th>
                  <th className="px-3 py-2 font-semibold text-right">판매수량</th>
                  <th className="px-3 py-2 font-semibold text-right">매입가</th>
                  <th className="min-w-[5.5rem] px-3 py-2 font-semibold text-right">
                    매입수량
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className="px-3 py-2 font-medium text-zinc-900 dark:text-zinc-100">
                      {item.model_name}
                    </td>
                    <td className="max-w-[10rem] truncate px-3 py-2 text-zinc-700 dark:text-zinc-300">
                      {item.product_name}
                    </td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                      {parseFulfillmentLocation(item.fulfillment_location)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-900 dark:text-zinc-100">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                      {formatKRW(item.purchase_price)}원
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        value={purchaseQuantities[item.id] ?? ""}
                        onChange={(event) =>
                          updatePurchaseQuantity(item.id, event.target.value)
                        }
                        placeholder="—"
                        className={`${tableInputClass} text-right tabular-nums`}
                        aria-label={`${item.model_name} 매입 수량`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showSellerPicker ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              매출 담당자 선택
            </p>
            <SalesSellerFilter
              value={selectedSellerName}
              options={sellerNames}
              onChange={setSelectedSellerName}
            />
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-normal text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            아니오
          </button>
          <button
            ref={yesButtonRef}
            type="button"
            onClick={handleConfirm}
            disabled={isPending || (showSellerPicker && !selectedSellerName)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-normal text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            {isPending ? "처리 중..." : "네"}
          </button>
        </div>
      </div>
    </div>
  );
}

export { defaultCardFeePercentFromPayment };
