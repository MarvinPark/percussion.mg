export type CardFeePercent = 0 | 1 | 2 | 3 | 4 | 5;

export type AmountRoundingUnit = "none" | 100 | 1000 | 10000;

export type AmountRoundingMode = "none" | "ceil" | "round" | "floor";

export const CARD_FEE_PERCENT_OPTIONS: CardFeePercent[] = [0, 1, 2, 3, 4, 5];

export const AMOUNT_ROUNDING_UNIT_OPTIONS: {
  value: AmountRoundingUnit;
  label: string;
}[] = [
  { value: "none", label: "없음" },
  { value: 100, label: "백" },
  { value: 1000, label: "천" },
  { value: 10000, label: "만" },
];

export const AMOUNT_ROUNDING_MODE_OPTIONS: {
  value: AmountRoundingMode;
  label: string;
}[] = [
  { value: "none", label: "없음" },
  { value: "ceil", label: "올림" },
  { value: "round", label: "반올림" },
  { value: "floor", label: "버림" },
];

export function applyAmountRounding(
  value: number,
  unit: AmountRoundingUnit,
  mode: AmountRoundingMode,
) {
  if (value <= 0) return 0;
  if (unit === "none" || mode === "none") return Math.round(value);

  switch (mode) {
    case "ceil":
      return Math.ceil(value / unit) * unit;
    case "floor":
      return Math.floor(value / unit) * unit;
    default:
      return Math.round(value / unit) * unit;
  }
}

export function calculateCardPaymentTotal(
  baseAmount: number,
  cardFeePercent: CardFeePercent,
  roundingUnit: AmountRoundingUnit,
  roundingMode: AmountRoundingMode,
) {
  if (cardFeePercent === 0) return baseAmount;

  const withFee = baseAmount * (1 + cardFeePercent / 100);
  return applyAmountRounding(withFee, roundingUnit, roundingMode);
}

export type InvoiceLinePricing = {
  adjustedUnitPrice: number;
  adjustedLineTotal: number;
};

export function calculateInvoiceLinePricing(
  item: {
    rounded_unit_price: number;
    quantity: number;
  },
  cardFeePercent: CardFeePercent,
  roundingUnit: AmountRoundingUnit,
  roundingMode: AmountRoundingMode,
): InvoiceLinePricing {
  const quantity = Math.max(0, item.quantity);

  if (cardFeePercent === 0) {
    return {
      adjustedUnitPrice: item.rounded_unit_price,
      adjustedLineTotal: item.rounded_unit_price * quantity,
    };
  }

  const unitWithFee = item.rounded_unit_price * (1 + cardFeePercent / 100);
  const adjustedUnitPrice = applyAmountRounding(
    unitWithFee,
    roundingUnit,
    roundingMode,
  );
  const adjustedLineTotal = adjustedUnitPrice * quantity;

  return { adjustedUnitPrice, adjustedLineTotal };
}

export function calculateInvoiceDocumentTotal(
  items: {
    rounded_unit_price: number;
    quantity: number;
  }[],
  cardFeePercent: CardFeePercent,
  roundingUnit: AmountRoundingUnit,
  roundingMode: AmountRoundingMode,
) {
  return items.reduce(
    (sum, item) =>
      sum +
      calculateInvoiceLinePricing(
        item,
        cardFeePercent,
        roundingUnit,
        roundingMode,
      ).adjustedLineTotal,
    0,
  );
}
