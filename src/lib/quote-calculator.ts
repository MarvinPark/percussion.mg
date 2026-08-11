export function calculateQuoteLine(input: {
  quantity: number;
  consumerPrice: number;
  saleUnitPrice: number;
  purchasePrice: number;
  shippingCost?: number;
}) {
  const quantity = input.quantity || 0;
  const consumerTotal = input.consumerPrice * quantity;
  const unitPrice = input.saleUnitPrice;
  const lineTotal = unitPrice * quantity;
  const purchaseTotal =
    input.purchasePrice * quantity + (input.shippingCost ?? 0);
  const margin = lineTotal - purchaseTotal;
  const marginRate =
    input.purchasePrice > 0
      ? input.saleUnitPrice / input.purchasePrice - 1
      : 0;

  return {
    consumerTotal,
    roundedUnitPrice: unitPrice,
    lineTotal,
    purchaseTotal,
    margin,
    marginRate,
  };
}

export function calculateQuoteTotals(items: {
  line_total: number;
  margin?: number;
}[]) {
  const totalAmount = items.reduce((sum, item) => sum + item.line_total, 0);
  const totalMargin = items.reduce((sum, item) => sum + (item.margin ?? 0), 0);
  const cardAmount = Math.round(totalAmount * 1.04);
  return { totalAmount, totalMargin, cardAmount };
}

export function calculateQuoteFinalMargin(
  totalAmount: number,
  totalMargin: number,
  feeRate: number,
) {
  const paymentFeeAmount = Math.round(totalAmount * (feeRate / 100));
  return {
    paymentFeeAmount,
    finalMargin: totalMargin - paymentFeeAmount,
  };
}
