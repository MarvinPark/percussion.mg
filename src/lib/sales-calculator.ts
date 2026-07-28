export function calculateSaleAmounts(input: {
  quantity: number;
  unitSalePrice: number;
  unitPurchasePrice: number;
  feeRate: number;
}) {
  const totalAmount = input.unitSalePrice * input.quantity;
  const paymentFeeAmount = Math.round(totalAmount * (input.feeRate / 100));
  const grossMargin =
    (input.unitSalePrice - input.unitPurchasePrice) * input.quantity;
  const marginAmount = grossMargin - paymentFeeAmount;

  return {
    totalAmount,
    paymentFeeAmount,
    marginAmount,
  };
}

export function formatKRW(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function getMonthKey(dateStr: string) {
  return dateStr.slice(0, 7);
}

export function getYearKey(dateStr: string) {
  return dateStr.slice(0, 4);
}
