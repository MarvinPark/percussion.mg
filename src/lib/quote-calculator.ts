export function roundUp1000(value: number) {
  if (value <= 0) return 0;
  return Math.ceil(value / 1000) * 1000;
}

export function calculateQuoteLine(input: {
  quantity: number;
  consumerPrice: number;
  saleUnitPrice: number;
  purchasePrice: number;
  shippingCost?: number;
}) {
  const quantity = input.quantity || 0;
  const consumerTotal = input.consumerPrice * quantity;
  const roundedUnitPrice = roundUp1000(input.saleUnitPrice);
  const lineTotal = roundedUnitPrice * quantity;
  const purchaseTotal =
    input.purchasePrice * quantity + (input.shippingCost ?? 0);
  const margin = lineTotal - purchaseTotal;
  const marginRate =
    input.purchasePrice > 0
      ? input.saleUnitPrice / input.purchasePrice - 1
      : 0;

  return {
    consumerTotal,
    roundedUnitPrice,
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
