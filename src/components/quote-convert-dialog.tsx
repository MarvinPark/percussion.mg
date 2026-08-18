"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QuoteCardPricingControls, {
  type AmountRoundingMode,
  type AmountRoundingUnit,
  type CardFeePercent,
} from "@/components/quote-card-pricing-controls";
import SalesSellerFilter from "@/components/sales-seller-filter";
import { resolveQuoteConvertPricing } from "@/lib/quote-card-pricing";
import { formatKRW } from "@/lib/sales-calculator";

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
};

type QuoteConvertDialogProps = {
  title: string;
  description?: string;
  quoteTotal: number;
  defaultCardFeePercent?: CardFeePercent;
  defaultActualFeeRate?: number;
  staffOptions: StaffOption[];
  defaultSellerName: string;
  showSellerPicker: boolean;
  isPending?: boolean;
  onConfirm: (payload: QuoteConvertConfirmPayload) => void;
  onCancel: () => void;
};

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
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-convert-dialog-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
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
              <dd className="font-semibold text-orange-700 dark:text-orange-300">
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
              <dd className="font-semibold text-emerald-700 dark:text-emerald-300">
                +{formatKRW(feePreview.feeSpreadAmount)}원
              </dd>
            </div>
          ) : null}
        </dl>

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
