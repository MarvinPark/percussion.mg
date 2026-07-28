"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { updateSale } from "@/app/sales/actions";
import ProductSearchSelect from "@/components/product-search-select";
import PhoneInput from "@/components/phone-input";
import SaleCategorySelect from "@/components/sale-category-select";
import {
  calculateSaleAmounts,
  formatKRW,
} from "@/lib/sales-calculator";
import type { PaymentMethod, SaleProductOption, SaleWithProduct } from "@/types/sale";

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400";

const labelClass =
  "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

type SaleEditModalProps = {
  sale: SaleWithProduct;
  products: SaleProductOption[];
  paymentMethods: PaymentMethod[];
  onClose: () => void;
};

function productDisplayLabel(product: SaleProductOption) {
  return `${product.product_name} / ${product.model_name} (${product.supplier}) — 재고 ${product.stock_quantity}개`;
}

function soldAtInputValue(value: string) {
  return value.slice(0, 10);
}

export default function SaleEditModal({
  sale,
  products,
  paymentMethods,
  onClose,
}: SaleEditModalProps) {
  const router = useRouter();
  const initialProduct = products.find((item) => item.id === sale.product_id);

  const [selectedProductId, setSelectedProductId] = useState(sale.product_id);
  const [quantity, setQuantity] = useState(sale.quantity);
  const [unitSalePrice, setUnitSalePrice] = useState(Number(sale.unit_sale_price));
  const [unitPurchasePrice, setUnitPurchasePrice] = useState(
    Number(sale.unit_purchase_price),
  );
  const [paymentMethodId, setPaymentMethodId] = useState(() => {
    const matched = paymentMethods.find(
      (method) => method.name === sale.payment_method,
    );
    return matched?.id ?? paymentMethods[0]?.id ?? "";
  });

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string; ok?: boolean } | null, formData: FormData) => {
      return (await updateSale(formData)) ?? null;
    },
    null,
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onClose();
    }
  }, [state?.ok, router, onClose]);

  const selectedPayment = paymentMethods.find(
    (method) => method.id === paymentMethodId,
  );

  const preview = useMemo(
    () =>
      calculateSaleAmounts({
        quantity,
        unitSalePrice,
        unitPurchasePrice,
        feeRate: selectedPayment?.fee_rate ?? 0,
      }),
    [quantity, unitSalePrice, unitPurchasePrice, selectedPayment],
  );

  function handleProductChange(productId: string) {
    setSelectedProductId(productId);
    const product = products.find((item) => item.id === productId);
    if (product) {
      setUnitSalePrice(product.sale_price);
      setUnitPurchasePrice(product.purchase_price);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              판매 수정
            </h3>
            <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
              {sale.products?.product_name ?? "제품"} · 수량/제품 변경 시 재고가
              자동 조정됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="sale_id" value={sale.id} />

          <div>
            <label htmlFor="edit_sale_category" className={labelClass}>
              구분 <span className="text-red-500">*</span>
            </label>
            <SaleCategorySelect
              id="edit_sale_category"
              defaultValue={sale.sale_category}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit_sold_at" className={labelClass}>
                판매 날짜 <span className="text-red-500">*</span>
              </label>
              <input
                id="edit_sold_at"
                name="sold_at"
                type="date"
                required
                defaultValue={soldAtInputValue(sale.sold_at)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="edit_payment_method_id" className={labelClass}>
                결제 방식 <span className="text-red-500">*</span>
              </label>
              <select
                id="edit_payment_method_id"
                name="payment_method_id"
                required
                value={paymentMethodId}
                onChange={(event) => setPaymentMethodId(event.target.value)}
                className={inputClass}
              >
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name} (수수료 {method.fee_rate}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="edit_product_search" className={labelClass}>
              판매 제품 <span className="text-red-500">*</span>
            </label>
            <ProductSearchSelect
              products={products}
              selectedProductId={selectedProductId}
              onSelect={handleProductChange}
              initialDisplayValue={
                initialProduct ? productDisplayLabel(initialProduct) : undefined
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit_quantity" className={labelClass}>
                판매 수량 <span className="text-red-500">*</span>
              </label>
              <input
                id="edit_quantity"
                name="quantity"
                type="number"
                min={1}
                required
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value) || 0)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="edit_unit_sale_price" className={labelClass}>
                판매 단가 (원) <span className="text-red-500">*</span>
              </label>
              <input
                id="edit_unit_sale_price"
                name="unit_sale_price"
                type="number"
                min={0}
                required
                value={unitSalePrice}
                onChange={(event) =>
                  setUnitSalePrice(Number(event.target.value) || 0)
                }
                className={inputClass}
              />
            </div>
          </div>

          <section className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/30">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              고객 / 거래처 정보
            </h4>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit_customer_name" className={labelClass}>
                  고객명
                </label>
                <input
                  id="edit_customer_name"
                  name="customer_name"
                  defaultValue={sale.customer_name ?? ""}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="edit_business_partner" className={labelClass}>
                  거래처명
                </label>
                <input
                  id="edit_business_partner"
                  name="business_partner"
                  defaultValue={sale.business_partner ?? ""}
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="edit_customer_phone" className={labelClass}>
                  전화번호
                </label>
                <PhoneInput
                  id="edit_customer_phone"
                  name="customer_phone"
                  defaultValue={sale.customer_phone ?? ""}
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="edit_customer_address" className={labelClass}>
                  주소
                </label>
                <input
                  id="edit_customer_address"
                  name="customer_address"
                  defaultValue={sale.customer_address ?? ""}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          <div>
            <label htmlFor="edit_note" className={labelClass}>
              메모 (선택)
            </label>
            <input
              id="edit_note"
              name="note"
              defaultValue={sale.note ?? ""}
              className={inputClass}
            />
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              예상 금액
            </p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-zinc-600 dark:text-zinc-400">매출 합계</dt>
                <dd className="font-bold text-zinc-900 dark:text-zinc-100">
                  {formatKRW(preview.totalAmount)}원
                </dd>
              </div>
              <div>
                <dt className="text-zinc-600 dark:text-zinc-400">결제 수수료</dt>
                <dd className="font-bold text-orange-700 dark:text-orange-300">
                  -{formatKRW(preview.paymentFeeAmount)}원
                </dd>
              </div>
              <div>
                <dt className="text-zinc-600 dark:text-zinc-400">마진 (이익)</dt>
                <dd className="font-bold text-green-700 dark:text-green-300">
                  {formatKRW(preview.marginAmount)}원
                </dd>
              </div>
            </dl>
          </div>

          {state?.error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {state.error}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending || !selectedProductId}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
            >
              {isPending ? "저장 중..." : "수정 저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
