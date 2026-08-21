"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { deleteSale, updateSale } from "@/app/(main)/sales/actions";
import DeleteConfirmDialog from "@/components/delete-confirm-dialog";
import ProductSearchSelect from "@/components/product-search-select";
import PaymentMethodCombobox from "@/components/payment-method-combobox";
import PhoneInput from "@/components/phone-input";
import PriceInput from "@/components/price-input";
import SaleCategorySelect from "@/components/sale-category-select";
import {
  calculateSaleAmounts,
  formatKRW,
  marginAmountClass,
} from "@/lib/sales-calculator";
import { displaySaleCategoryFromList } from "@/lib/sale-category-options";
import { useLivePaymentMethods } from "@/hooks/use-live-payment-methods";
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
  saleCategories: string[];
  staffOptions: StaffOption[];
  onClose: () => void;
};

function soldAtInputValue(value: string) {
  return value.slice(0, 10);
}

export default function SaleEditModal({
  sale,
  products,
  paymentMethods,
  saleCategories,
  staffOptions,
  onClose,
}: SaleEditModalProps) {
  const router = useRouter();
  const livePaymentMethods = useLivePaymentMethods(paymentMethods);
  const initialProduct = products.find((item) => item.id === sale.product_id);

  const sellerNameOptions = useMemo(() => {
    const names = staffOptions.map((staff) => staff.full_name);
    const currentName = sale.created_by_name?.trim();
    if (currentName && !names.includes(currentName)) {
      return [currentName, ...names];
    }
    return names;
  }, [staffOptions, sale.created_by_name]);

  const [selectedProduct, setSelectedProduct] = useState<SaleProductOption | null>(
    initialProduct ?? null,
  );
  const [selectedProductId, setSelectedProductId] = useState(sale.product_id);
  const [sellerName, setSellerName] = useState(
    sale.created_by_name?.trim() || sellerNameOptions[0] || "",
  );
  const [quantity, setQuantity] = useState(sale.quantity);
  const [unitSalePrice, setUnitSalePrice] = useState(Number(sale.unit_sale_price));
  const [unitPurchasePrice, setUnitPurchasePrice] = useState(
    Number(sale.unit_purchase_price),
  );
  const [shippingCost, setShippingCost] = useState(
    Number(sale.shipping_cost) || 0,
  );
  const [paymentMethodId, setPaymentMethodId] = useState(() => {
    const matched = livePaymentMethods.find(
      (method) => method.name === sale.payment_method,
    );
    return matched?.id ?? livePaymentMethods[0]?.id ?? "";
  });
  const [saleCategory, setSaleCategory] = useState(() =>
    displaySaleCategoryFromList(sale.sale_category, saleCategories),
  );
  const [soldAt, setSoldAt] = useState(soldAtInputValue(sale.sold_at));
  const [customerName, setCustomerName] = useState(sale.customer_name ?? "");
  const [businessPartner, setBusinessPartner] = useState(sale.business_partner ?? "");
  const [customerPhone, setCustomerPhone] = useState(sale.customer_phone ?? "");
  const [customerAddress, setCustomerAddress] = useState(sale.customer_address ?? "");
  const [note, setNote] = useState(sale.note ?? "");
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

  const saleCategoryOptions = useMemo(() => {
    const current = sale.sale_category?.trim();
    if (current && !saleCategories.includes(current)) {
      return [current, ...saleCategories];
    }
    return saleCategories;
  }, [sale.sale_category, saleCategories]);

  useEffect(() => {
    if (paymentMethodId) return;

    const matched = livePaymentMethods.find(
      (method) => method.name === sale.payment_method,
    );
    if (matched) {
      setPaymentMethodId(matched.id);
      return;
    }

    if (livePaymentMethods[0]) {
      setPaymentMethodId(livePaymentMethods[0].id);
    }
  }, [livePaymentMethods, paymentMethodId, sale.payment_method]);

  function buildFormData() {
    const formData = new FormData();

    formData.set("sale_id", sale.id);
    formData.set("sold_at", soldAt);
    formData.set("product_id", selectedProductId);
    formData.set("sale_category", saleCategory);
    formData.set("quantity", String(quantity));
    formData.set("unit_sale_price", String(Math.max(0, Math.round(unitSalePrice))));
    formData.set(
      "shipping_cost",
      String(Math.max(0, Math.round(shippingCost))),
    );
    formData.set("payment_method_id", paymentMethodId);
    formData.set("created_by_name", sellerName.trim());
    formData.set("created_by_user_id", selectedSellerUserId);
    formData.set("customer_name", customerName.trim());
    formData.set("business_partner", businessPartner.trim());
    formData.set("customer_phone", customerPhone.trim());
    formData.set("customer_address", customerAddress.trim());
    formData.set("note", note.trim());

    return formData;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);

    if (!soldAt.trim()) {
      setSaveError("판매 날짜를 입력해 주세요.");
      return;
    }

    if (!selectedProductId) {
      setSaveError("제품을 선택해 주세요.");
      return;
    }

    if (!sellerName.trim()) {
      setSaveError("담당자를 선택해 주세요.");
      return;
    }

    if (!paymentMethodId) {
      setSaveError("결제 방식을 선택해 주세요.");
      return;
    }

    if (!saleCategory.trim()) {
      setSaveError("구분을 선택해 주세요.");
      return;
    }

    if (!quantity || quantity <= 0) {
      setSaveError("수량은 1 이상 입력해 주세요.");
      return;
    }

    if (unitSalePrice < 0) {
      setSaveError("판매 단가는 0 이상이어야 합니다.");
      return;
    }

    if (shippingCost < 0) {
      setSaveError("업체 배송비는 0 이상이어야 합니다.");
      return;
    }

    const formData = buildFormData();

    startSaveTransition(async () => {
      try {
        const result = await updateSale(formData);
        if (result?.error) {
          setSaveError(result.error);
          return;
        }
        await router.refresh();
        onClose();
      } catch (error) {
        console.error("sale update failed:", error);
        setSaveError("판매 수정 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    });
  }

  const selectedPayment = livePaymentMethods.find(
    (method) => method.id === paymentMethodId,
  );

  const preview = useMemo(
    () =>
      calculateSaleAmounts({
        quantity,
        unitSalePrice,
        unitPurchasePrice,
        feeRate: selectedPayment?.fee_rate ?? 0,
        shippingCost,
      }),
    [quantity, unitSalePrice, unitPurchasePrice, selectedPayment, shippingCost],
  );

  function handleProductChange(product: SaleProductOption | null) {
    setSelectedProduct(product);
    setSelectedProductId(product?.id ?? "");
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

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
              categories={saleCategoryOptions}
              value={saleCategory}
              onChange={setSaleCategory}
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
                value={soldAt}
                onChange={(event) => setSoldAt(event.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="edit_payment_method_id" className={labelClass}>
                결제 방식 <span className="text-red-500">*</span>
              </label>
              <PaymentMethodCombobox
                id="edit_payment_method_id"
                paymentMethods={livePaymentMethods}
                value={paymentMethodId}
                onChange={setPaymentMethodId}
                className={inputClass}
                placeholder="결제 방식 입력 또는 선택"
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit_product_search" className={labelClass}>
              판매 제품 <span className="text-red-500">*</span>
            </label>
            <ProductSearchSelect
              selectedProduct={selectedProduct}
              onSelect={handleProductChange}
              emphasizeModelName
              showHiddenField={false}
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
                min={0}
                value={unitSalePrice}
                onChange={setUnitSalePrice}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="edit_shipping_cost" className={labelClass}>
                업체 배송비 (원)
              </label>
              <PriceInput
                id="edit_shipping_cost"
                min={0}
                value={shippingCost}
                onChange={setShippingCost}
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
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
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
                  value={businessPartner}
                  onChange={(event) => setBusinessPartner(event.target.value)}
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
                  value={customerPhone}
                  onChange={setCustomerPhone}
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
                  value={customerAddress}
                  onChange={(event) => setCustomerAddress(event.target.value)}
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
              value={note}
              onChange={(event) => setNote(event.target.value)}
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
                <dd
                  className={`font-bold ${marginAmountClass(preview.marginAmount)}`}
                >
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
