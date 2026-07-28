"use client";

import { useState } from "react";
import SaleEditModal from "@/components/sale-edit-modal";
import { formatKRW } from "@/lib/sales-calculator";
import { formatPhoneForDisplay } from "@/lib/phone-format";
import { displaySaleCategory } from "@/lib/sale-categories";
import type { PaymentMethod, SaleProductOption, SaleWithProduct } from "@/types/sale";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

type SalesTableProps = {
  sales: SaleWithProduct[];
  products: SaleProductOption[];
  paymentMethods: PaymentMethod[];
};

export default function SalesTable({
  sales,
  products,
  paymentMethods,
}: SalesTableProps) {
  const [editingSale, setEditingSale] = useState<SaleWithProduct | null>(null);

  return (
    <>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <table className="min-w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <tr>
              <th className="px-4 py-3 font-semibold">구분</th>
              <th className="px-4 py-3 font-semibold">날짜</th>
              <th className="px-4 py-3 font-semibold">제품</th>
              <th className="px-4 py-3 font-semibold">수량</th>
              <th className="px-4 py-3 font-semibold">매출</th>
              <th className="px-4 py-3 font-semibold">수수료</th>
              <th className="px-4 py-3 font-semibold">마진</th>
              <th className="px-4 py-3 font-semibold">고객</th>
              <th className="px-4 py-3 font-semibold">결제</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr
                key={sale.id}
                onDoubleClick={() => setEditingSale(sale)}
                title="더블클릭하여 수정"
                className="cursor-pointer border-b border-zinc-100 transition hover:bg-zinc-50 last:border-0 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
              >
                <td className="whitespace-nowrap px-4 py-3 text-zinc-900 dark:text-zinc-100">
                  {displaySaleCategory(sale.sale_category)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-zinc-900 dark:text-zinc-100">
                  {formatDate(sale.sold_at)}
                </td>
                <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                  <p>{sale.products?.product_name ?? "-"}</p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {sale.products?.model_name}
                  </p>
                </td>
                <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                  {sale.quantity}개
                </td>
                <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                  {formatKRW(sale.total_amount)}원
                </td>
                <td className="px-4 py-3 text-orange-700 dark:text-orange-300">
                  -{formatKRW(sale.payment_fee_amount)}원
                </td>
                <td className="px-4 py-3 font-semibold text-green-700 dark:text-green-300">
                  {formatKRW(sale.margin_amount)}원
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  {sale.customer_name ?? "-"}
                  {sale.business_partner ? (
                    <p className="text-xs text-zinc-500">{sale.business_partner}</p>
                  ) : null}
                  {sale.customer_phone ? (
                    <p className="text-xs text-zinc-500">
                      {formatPhoneForDisplay(sale.customer_phone)}
                    </p>
                  ) : null}
                  {sale.customer_address ? (
                    <p className="text-xs text-zinc-500">{sale.customer_address}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                  {sale.payment_method}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingSale ? (
        <SaleEditModal
          sale={editingSale}
          products={products}
          paymentMethods={paymentMethods}
          onClose={() => setEditingSale(null)}
        />
      ) : null}
    </>
  );
}
