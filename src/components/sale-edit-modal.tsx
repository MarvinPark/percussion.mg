"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { deleteSale, updateSale } from "@/app/(main)/sales/actions";
import DeleteConfirmDialog from "@/components/delete-confirm-dialog";
import ProductSearchSelect from "@/components/product-search-select";
import PhoneInput from "@/components/phone-input";
import PriceInput from "@/components/price-input";
import SaleCategorySelect from "@/components/sale-category-select";
import {
  calculateSaleAmounts,
  formatKRW,
} from "@/lib/sales-calculator";
import type { PaymentMethod, SaleProductOption, SaleWithProduct } from "@/types/sale";
import type { StaffOption } from "@/components/sales-page-client";

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400";

const labelClass =
  "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

type SaleEditModalProps = {
  sale: SaleWithProduct;
  products: SaleProductOption[];
  paymentMethods: PaymentMethod[];
  staffOptions: StaffOption[];
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
  staffOptions,
  onClose,
}: SaleEditModalProps) {
  const router = useRouter();
  const initialProduct = products.find((item) => item.id === sale.product_id);

  const sellerNameOptions = useMemo(() => {
    const names = staffOptions.map((staff) => staff.full_name);
    const currentName = sale.created_by_name?.trim();
    if (currentName && !names.includes(currentName)) {
      return [currentName, ...names];
    }
    return names;
  }, [staffOptions, sale.created_by_name]);

  const [selectedProductId, setSelectedProductId] = useState(sale.product_id);
  const [sellerName, setSellerName] = useState(
    sale.created_by_name?.trim() || sellerNameOptions[0] || "",
  );
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();

  const selectedSellerUserId = useMemo(() => {
    const matchedStaff = staffOptions.find((staff) => staff.full_name === sellerName);
    if (matchedStaff) return matchedStaff.id;
    if (sellerName === sale.created_by_name?.trim()) {
      return sale.created_by_user_id ?? "";
    }
    return "";
  }, [staffOptions, sellerName, sale.created_by_name, sale.created_by_user_id]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);

    if (!selectedProductId) {
      setSaveError("제품을 선택해 주세요.");
      return;
    }

    if (!sellerName.trim()) {
      setSaveError("담당자를 선택해 주세요.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.set("product_id", selectedProductId);
    formData.set("created_by_name", sellerName.trim());
    formData.set("created_by_user_id", selectedSellerUserId);

    startSaveTransition(async () => {
      const result = await updateSale(formData);
      if (result?.error) {
        setSaveError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

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

  function handleDeleteConfirm() {
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteSale(sale.id);
      if (result.error) {
        setDeleteError(result.error);
        setShowDeleteConfirm(false);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (isSaving || isDeleting) return;

      if (showDeleteConfirm) {
        setShowDeleteConfirm(false);
        return;
      }

      onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, showDeleteConfirm, isSaving, isDeleting]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
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
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="sale_id" value={sale.id} />
          <input type="hidden" name="product_id" value={selectedProductId} />

          <div>
            <label htmlFor="edit_created_by_name" className={labelClass}>
              담당자 <span className="text-red-500">*</span>
            </label>
            {sellerNameOptions.length > 0 ? (
              <select
                id="edit_created_by_name"
                value={sellerName}
                onChange={(event) => setSellerName(event.target.value)}
                className={inputClass}
                required
              >
                {sellerNameOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="edit_created_by_name"
                name="created_by_name"
                type="text"
                required
                value={sellerName}
                onChange={(event) => setSellerName(event.target.value)}
                className={inputClass}
              />
            )}
          </div>

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
              showHiddenField={false}
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
              <PriceInput
                id="edit_unit_sale_price"
                name="unit_sale_price"
                min={0}
                required
                value={unitSalePrice}
                onChange={setUnitSalePrice}
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

          {saveError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {saveError}
            </p>
          ) : null}

          {deleteError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {deleteError}
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
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSaving || isDeleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 dark:bg-red-500 dark:hover:bg-red-400"
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </button>
            <button
              type="submit"
              disabled={isSaving || isDeleting || !selectedProductId}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400"
            >
              {isSaving ? "저장 중..." : "수정 저장"}
            </button>
          </div>
        </form>

        {showDeleteConfirm ? (
          <DeleteConfirmDialog
            count={1}
            onCancel={() => {
              if (!isDeleting) setShowDeleteConfirm(false);
            }}
            onConfirm={handleDeleteConfirm}
          />
        ) : null}
      </div>
    </div>
  );
}
