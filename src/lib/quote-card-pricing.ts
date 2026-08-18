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

/** 견적 합계 기준 카드결제 금액 (견적서 하단과 동일). 차액은 마지막 제품 줄에 반영. */
export function resolveQuoteConvertPricing(
  quoteTotal: number,
  cardFeePercent: CardFeePercent,
  roundingUnit: AmountRoundingUnit,
  roundingMode: AmountRoundingMode,
) {
  const normalizedTotal = Math.max(0, Math.round(quoteTotal));
  const cardPaymentTotal = calculateCardPaymentTotal(
    normalizedTotal,
    cardFeePercent,
    roundingUnit,
    roundingMode,
  );

  return {
    quoteTotal: normalizedTotal,
    cardPaymentTotal,
    delta: cardPaymentTotal - normalizedTotal,
  };
}

export function adjustUnitSalePriceForLineDelta(input: {
  quantity: number;
  unitSalePrice: number;
  delta: number;
}): number {
  const quantity = Math.max(1, Math.round(input.quantity));
  const unitSalePrice = Math.round(input.unitSalePrice);
  const oldLineTotal = unitSalePrice * quantity;
  const newLineTotal = oldLineTotal + Math.round(input.delta);
  return Math.max(0, Math.round(newLineTotal / quantity));
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
    line_total?: number;
  }[],
  cardFeePercent: CardFeePercent,
  roundingUnit: AmountRoundingUnit,
  roundingMode: AmountRoundingMode,
) {
  return resolveInvoiceDocumentPricing(
    items,
    cardFeePercent,
    roundingUnit,
    roundingMode,
  ).documentTotal;
}

/** 거래명세서: 합계 기준 카드 금액(견적서·매출전환과 동일). 차액은 마지막 줄에 반영. */
export function resolveInvoiceDocumentPricing(
  items: {
    rounded_unit_price: number;
    quantity: number;
    line_total?: number;
  }[],
  cardFeePercent: CardFeePercent,
  roundingUnit: AmountRoundingUnit,
  roundingMode: AmountRoundingMode,
) {
  const quoteTotal = items.reduce((sum, item) => {
    const quantity = Math.max(0, item.quantity);
    return (
      sum +
      Math.round(item.line_total ?? item.rounded_unit_price * quantity)
    );
  }, 0);

  if (cardFeePercent === 0 || items.length === 0) {
    return {
      linePricing: items.map((item) => {
        const quantity = Math.max(0, item.quantity);
        const lineTotal = Math.round(
          item.line_total ?? item.rounded_unit_price * quantity,
        );
        return {
          adjustedUnitPrice: Math.round(item.rounded_unit_price),
          adjustedLineTotal: lineTotal,
        };
      }),
      documentTotal: quoteTotal,
    };
  }

  const { cardPaymentTotal, delta } = resolveQuoteConvertPricing(
    quoteTotal,
    cardFeePercent,
    roundingUnit,
    roundingMode,
  );
  const lastIndex = items.length - 1;

  const linePricing = items.map((item, index) => {
    const quantity = Math.max(0, item.quantity);
    const baseUnit = Math.round(item.rounded_unit_price);
    const isLastLine = index === lastIndex;

    if (!isLastLine || delta === 0) {
      return {
        adjustedUnitPrice: baseUnit,
        adjustedLineTotal: baseUnit * quantity,
      };
    }

    const adjustedUnitPrice = adjustUnitSalePriceForLineDelta({
      quantity,
      unitSalePrice: baseUnit,
      delta,
    });

    return {
      adjustedUnitPrice,
      adjustedLineTotal: adjustedUnitPrice * quantity,
    };
  });

  return {
    linePricing,
    documentTotal: cardPaymentTotal,
  };
}
