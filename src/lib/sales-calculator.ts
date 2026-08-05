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

export function formatKRW(value: number | string | null | undefined) {
  const amount = Math.round(Number(value) || 0);
  return amount.toLocaleString("ko-KR");
}

export function parsePriceInput(value: string) {
  const digits = value.replace(/[^\d-]/g, "");
  if (!digits || digits === "-") return 0;
  return Math.max(0, Math.round(Number(digits) || 0));
}

export function getMonthKey(dateStr: string) {
  return dateStr.slice(0, 7);
}

export function getYearKey(dateStr: string) {
  return dateStr.slice(0, 4);
}
