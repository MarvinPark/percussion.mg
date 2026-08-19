"use client";

import dynamic from "next/dynamic";
import type { PaymentMethod, SaleProductOption } from "@/types/sale";

const Cafe24ExcelImportPanel = dynamic(
  () => import("@/components/cafe24-excel-import-panel"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        엑셀 매출 등록 불러오는 중...
      </div>
    ),
  },
);

const SmartstoreImportPanel = dynamic(
  () => import("@/components/smartstore-import-panel"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        스마트스토어 주문 가져오기 불러오는 중...
      </div>
    ),
  },
);

type SalesImportPanelsProps = {
  canImport: boolean;
  products: SaleProductOption[];
  paymentMethods: PaymentMethod[];
};

export default function SalesImportPanels({
  canImport,
  products,
  paymentMethods,
}: SalesImportPanelsProps) {
  if (!canImport) return null;

  return (
    <div className="mt-6 space-y-4">
      <Cafe24ExcelImportPanel
        canImport={canImport}
        products={products}
        paymentMethods={paymentMethods}
      />
      <SmartstoreImportPanel canImport={canImport} products={products} />
    </div>
  );
}
