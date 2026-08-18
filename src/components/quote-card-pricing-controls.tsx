"use client";

import {
  AMOUNT_ROUNDING_MODE_OPTIONS,
  AMOUNT_ROUNDING_UNIT_OPTIONS,
  CARD_FEE_PERCENT_OPTIONS,
  type AmountRoundingMode,
  type AmountRoundingUnit,
  type CardFeePercent,
} from "@/lib/quote-card-pricing";

const controlSelectClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100";

const labelClass =
  "mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300";

function parseRoundingUnit(value: string): AmountRoundingUnit {
  return value === "none" ? "none" : (Number(value) as AmountRoundingUnit);
}

type QuoteCardPricingControlsProps = {
  cardFeePercent: CardFeePercent;
  roundingUnit: AmountRoundingUnit;
  roundingMode: AmountRoundingMode;
  onCardFeePercentChange: (value: CardFeePercent) => void;
  onRoundingUnitChange: (value: AmountRoundingUnit) => void;
  onRoundingModeChange: (value: AmountRoundingMode) => void;
  helperText?: string;
  compact?: boolean;
};

export default function QuoteCardPricingControls({
  cardFeePercent,
  roundingUnit,
  roundingMode,
  onCardFeePercentChange,
  onRoundingUnitChange,
  onRoundingModeChange,
  helperText,
  compact = false,
}: QuoteCardPricingControlsProps) {
  const roundingDisabled = cardFeePercent === 0;

  return (
    <div className={compact ? "space-y-3" : "space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/40"}>
      {!compact ? (
        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          카드 결제 금액
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="card_pricing_fee_percent" className={labelClass}>
            고객 청구
          </label>
          <select
            id="card_pricing_fee_percent"
            value={cardFeePercent}
            onChange={(event) =>
              onCardFeePercentChange(Number(event.target.value) as CardFeePercent)
            }
            className={controlSelectClass}
          >
            {CARD_FEE_PERCENT_OPTIONS.map((percent) => (
              <option key={percent} value={percent}>
                {percent === 0 ? "없음 (0%)" : `+${percent}%`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="card_pricing_rounding_unit"
            className={`${labelClass} ${
              roundingDisabled ? "text-zinc-400 dark:text-zinc-600" : ""
            }`}
          >
            금액 단위
          </label>
          <select
            id="card_pricing_rounding_unit"
            value={roundingUnit}
            disabled={roundingDisabled}
            onChange={(event) =>
              onRoundingUnitChange(parseRoundingUnit(event.target.value))
            }
            className={controlSelectClass}
          >
            {AMOUNT_ROUNDING_UNIT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="card_pricing_rounding_mode"
            className={`${labelClass} ${
              roundingDisabled ? "text-zinc-400 dark:text-zinc-600" : ""
            }`}
          >
            금액 처리
          </label>
          <select
            id="card_pricing_rounding_mode"
            value={roundingMode}
            disabled={roundingDisabled}
            onChange={(event) =>
              onRoundingModeChange(event.target.value as AmountRoundingMode)
            }
            className={controlSelectClass}
          >
            {AMOUNT_ROUNDING_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {helperText ??
          (cardFeePercent === 0
            ? "카드 수수료가 없으면 견적 합계 그대로 매출에 반영됩니다."
            : "선택한 수수료·단위·처리 방식이 각 제품 판매단가와 실결제 금액에 반영됩니다.")}
      </p>
    </div>
  );
}

export type { CardFeePercent, AmountRoundingUnit, AmountRoundingMode };
