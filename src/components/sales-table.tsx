"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSale } from "@/app/(main)/sales/actions";
import DeleteConfirmDialog from "@/components/delete-confirm-dialog";
import SaleEditModal from "@/components/sale-edit-modal";
import { formatKRW } from "@/lib/sales-calculator";
import { displaySaleCategory } from "@/lib/sale-categories";
import type { PaymentMethod, SaleProductOption, SaleWithProduct } from "@/types/sale";
import type { StaffOption } from "@/components/sales-page-client";

function formatDateCompact(value: string) {
  const date = new Date(value);
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

const headerClass = "whitespace-nowrap px-3 py-2 text-xs font-semibold";
const cellClass = "whitespace-nowrap px-3 py-1.5 leading-tight";

const actionButtonClass =
  "rounded border border-zinc-300 px-1.5 py-0.5 leading-none font-normal text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800";

const deleteButtonClass =
  "rounded bg-red-600 px-1.5 py-0.5 leading-none font-normal text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400";

type SalesTableProps = {
  sales: SaleWithProduct[];
  products: SaleProductOption[];
  paymentMethods: PaymentMethod[];
  saleCategories: string[];
  staffOptions: StaffOption[];
  rowFontSize?: number;
  emptyMessage?: string;
  canManageSales?: boolean;
};

export default function SalesTable({
  sales,
  products,
  paymentMethods,
  saleCategories,
  staffOptions,
  rowFontSize = 12,
  emptyMessage,
  canManageSales = true,
}: SalesTableProps) {
  const router = useRouter();
  const [editingSale, setEditingSale] = useState<SaleWithProduct | null>(null);
  const [deletingSale, setDeletingSale] = useState<SaleWithProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const subFontSize = Math.max(8, rowFontSize - 2);
  const actionFontSize = Math.max(9, rowFontSize - 1);

  function handleDeleteConfirm() {
    if (!deletingSale) return;

    setError(null);
    startDeleteTransition(async () => {
      const result = await deleteSale(deletingSale.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setDeletingSale(null);
      if (editingSale?.id === deletingSale.id) {
        setEditingSale(null);
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <table className="min-w-full">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            <tr>
              <th className={headerClass}>판매자</th>
              <th className={headerClass}>구분</th>
              <th className={headerClass}>날짜</th>
              <th className={headerClass}>제품</th>
              <th className={headerClass}>수량</th>
              <th className={headerClass}>매출</th>
              <th className={headerClass}>수수료</th>
              <th className={headerClass}>마진</th>
              <th className={headerClass}>고객</th>
              <th className={headerClass}>결제</th>
              {canManageSales ? (
              <th className={`${headerClass} text-right`}>수정</th>
              ) : null}
            </tr>
          </thead>
          <tbody style={{ fontSize: `${rowFontSize}px` }}>
            {sales.length === 0 ? (
              <tr>
                <td
                  colSpan={canManageSales ? 11 : 10}
                  className="px-3 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400"
                >
                  {emptyMessage ?? "표시할 판매 기록이 없습니다."}
                </td>
              </tr>
            ) : null}
            {sales.map((sale) => (
              <tr
                key={sale.id}
                onDoubleClick={canManageSales ? () => setEditingSale(sale) : undefined}
                title={canManageSales ? "더블클릭하여 수정" : undefined}
                className={`border-b border-zinc-100 transition last:border-0 dark:border-zinc-800 ${
                  canManageSales
                    ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    : ""
                }`}
              >
                <td className={`${cellClass} text-zinc-900 dark:text-zinc-100`}>
                  {sale.created_by_name ?? "-"}
                </td>
                <td className={`${cellClass} text-zinc-900 dark:text-zinc-100`}>
                  {displaySaleCategory(sale.sale_category)}
                </td>
                <td className={`${cellClass} text-zinc-900 dark:text-zinc-100`}>
                  {formatDateCompact(sale.sold_at)}
                </td>
                <td className={`${cellClass} text-zinc-900 dark:text-zinc-100`}>
                  <p className="font-medium">
                    {sale.products?.model_name ?? "-"}
                  </p>
                  {sale.products?.product_name ? (
                    <p
                      className="text-zinc-500 dark:text-zinc-400"
                      style={{ fontSize: `${subFontSize}px` }}
                    >
                      {sale.products.product_name}
                    </p>
                  ) : null}
                </td>
                <td className={`${cellClass} text-zinc-900 dark:text-zinc-100`}>
                  {sale.quantity}개
                </td>
                <td className={`${cellClass} font-medium text-zinc-900 dark:text-zinc-100`}>
                  {formatKRW(sale.total_amount)}원
                </td>
                <td className={`${cellClass} text-orange-700 dark:text-orange-300`}>
                  -{formatKRW(sale.payment_fee_amount)}원
                </td>
                <td className={`${cellClass} font-semibold text-green-700 dark:text-green-300`}>
                  {formatKRW(sale.margin_amount)}원
                </td>
                <td className={`${cellClass} text-zinc-700 dark:text-zinc-300`}>
                  <p>{sale.customer_name ?? "-"}</p>
                  {sale.business_partner ? (
                    <p
                      className="text-zinc-500 dark:text-zinc-400"
                      style={{ fontSize: `${subFontSize}px` }}
                    >
                      {sale.business_partner}
                    </p>
                  ) : null}
                </td>
                <td className={`${cellClass} text-zinc-700 dark:text-zinc-300`}>
                  {sale.payment_method}
                </td>
                {canManageSales ? (
                <td className={`${cellClass}`}>
                  <div
                    className="flex items-center justify-end gap-1"
                    onDoubleClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditingSale(sale);
                      }}
                      className={actionButtonClass}
                      style={{ fontSize: `${actionFontSize}px` }}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeletingSale(sale);
                      }}
                      className={deleteButtonClass}
                      style={{ fontSize: `${actionFontSize}px` }}
                      aria-label="삭제"
                    >
                      -
                    </button>
                  </div>
                </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {editingSale ? (
        <SaleEditModal
          sale={editingSale}
          products={products}
          paymentMethods={paymentMethods}
          saleCategories={saleCategories}
          staffOptions={staffOptions}
          onClose={() => setEditingSale(null)}
        />
      ) : null}

      {deletingSale ? (
        <DeleteConfirmDialog
          count={1}
          onCancel={() => {
            if (!isDeleting) setDeletingSale(null);
          }}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </>
  );
}
