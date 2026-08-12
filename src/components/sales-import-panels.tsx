"use client";

import dynamic from "next/dynamic";
import type { SaleProductOption } from "@/types/sale";

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
};

export default function SalesImportPanels({
  canImport,
  products,
}: SalesImportPanelsProps) {
  if (!canImport) return null;

  return (
    <div className="mt-6 space-y-4">
      <SmartstoreImportPanel canImport={canImport} products={products} />
    </div>
  );
}
