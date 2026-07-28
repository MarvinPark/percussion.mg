"use client";

import { useState } from "react";
import StockEditModal, { type StockEditProduct } from "@/components/stock-edit-modal";

type DashboardLowStockAlertProps = {
  products: StockEditProduct[];
};

export default function DashboardLowStockAlert({
  products,
}: DashboardLowStockAlertProps) {
  const [selectedProduct, setSelectedProduct] = useState<StockEditProduct | null>(
    null,
  );

  if (products.length === 0) return null;

  return (
    <>
      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950">
        <h3 className="font-medium text-amber-900 dark:text-amber-200">
          재고 부족 알림
        </h3>
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
          항목을 클릭하면 재고를 바로 수정할 수 있습니다.
        </p>
        <ul className="mt-3 space-y-1 text-sm text-amber-800 dark:text-amber-300">
          {products.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelectedProduct(item)}
                className="w-full rounded-lg px-2 py-1.5 text-left transition hover:bg-amber-100/80 dark:hover:bg-amber-900/50"
              >
                {item.product_name} — 현재 {item.stock_quantity}개 (최소{" "}
                {item.min_stock_quantity}개)
              </button>
            </li>
          ))}
        </ul>
      </div>

      {selectedProduct ? (
        <StockEditModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      ) : null}
    </>
  );
}
