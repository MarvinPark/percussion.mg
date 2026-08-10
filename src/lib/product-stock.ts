type StockAlertFields = {
  stock_quantity: number;
  min_stock_quantity: number;
};

/** 최소알림이 0이거나 미설정이면 재고 부족 알림을 표시하지 않습니다. */
export function isLowStockProduct(product: StockAlertFields): boolean {
  return (
    product.min_stock_quantity > 0 &&
    product.stock_quantity <= product.min_stock_quantity
  );
}
