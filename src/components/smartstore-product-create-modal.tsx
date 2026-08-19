"use client";

import { useState, useTransition } from "react";
import { createProductForSmartstoreLink } from "@/app/(main)/sales/smartstore/actions";
import PriceInput from "@/components/price-input";
import type { SmartstoreImportPreviewItem } from "@/app/(main)/sales/smartstore/actions";
import type { SaleProductOption } from "@/types/sale";

type SmartstoreProductCreateModalProps = {
  item: SmartstoreImportPreviewItem;
  onClose: () => void;
  onCreated: (product: SaleProductOption) => void;
};

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

const labelClass =
  "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

function defaultSku(item: SmartstoreImportPreviewItem) {
  if (item.sellerProductCode.trim()) {
    return item.sellerProductCode.trim().slice(0, 80);
  }
  return `SS-${item.productOrderId.replace(/[^a-zA-Z0-9]/g, "").slice(-12) || "item"}`;
}

function defaultSalePrice(item: SmartstoreImportPreviewItem) {
  if (item.quantity <= 0) return item.totalPaymentAmount;
  return Math.round(item.totalPaymentAmount / item.quantity);
}

export default function SmartstoreProductCreateModal({
  item,
  onClose,
  onCreated,
}: SmartstoreProductCreateModalProps) {
  const [supplier, setSupplier] = useState("스마트스토어");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [productName, setProductName] = useState(item.productName);
  const [modelName, setModelName] = useState(
    item.productOption.trim() || item.productName,
  );
  const [sku, setSku] = useState(defaultSku(item));
  const [color, setColor] = useState("");
  const [productOption, setProductOption] = useState(item.productOption);
  const [size, setSize] = useState("");
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [salePrice, setSalePrice] = useState(defaultSalePrice(item));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createProductForSmartstoreLink({
        supplier,
        category,
        brand,
        product_name: productName,
        model_name: modelName,
        sku,
        color,
        product_option: productOption,
        size,
        purchase_price: purchasePrice,
        sale_price: salePrice,
      });

      if ("error" in result) {
        setError(result.error ?? "제품 등록에 실패했습니다.");
        return;
      }

      onCreated(result.product);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            제품 등록
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            스마트스토어 주문 상품을 재고에 등록합니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="smartstore_supplier" className={labelClass}>
                공급처
              </label>
              <input
                id="smartstore_supplier"
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="smartstore_category" className={labelClass}>
                카테고리
              </label>
              <input
                id="smartstore_category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="예: 일렉기타"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="smartstore_brand" className={labelClass}>
                브랜드
              </label>
              <input
                id="smartstore_brand"
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                placeholder="예: Fender"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="smartstore_product_name" className={labelClass}>
                제품명
              </label>
              <input
                id="smartstore_product_name"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="smartstore_model_name" className={labelClass}>
                모델명
              </label>
              <input
                id="smartstore_model_name"
                value={modelName}
                onChange={(event) => setModelName(event.target.value)}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="smartstore_sku" className={labelClass}>
                SKU
              </label>
              <input
                id="smartstore_sku"
                value={sku}
                onChange={(event) => setSku(event.target.value)}
                required
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="smartstore_color" className={labelClass}>
                색상
              </label>
              <input
                id="smartstore_color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                placeholder="예: 레드"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="smartstore_product_option" className={labelClass}>
                옵션
              </label>
              <input
                id="smartstore_product_option"
                value={productOption}
                onChange={(event) => setProductOption(event.target.value)}
                placeholder="예: HSS 픽업"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="smartstore_size" className={labelClass}>
                사이즈
              </label>
              <input
                id="smartstore_size"
                value={size}
                onChange={(event) => setSize(event.target.value)}
                placeholder="예: 14인치"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="smartstore_purchase_price" className={labelClass}>
                매입가
              </label>
              <PriceInput
                id="smartstore_purchase_price"
                min={0}
                value={purchasePrice}
                onChange={setPurchasePrice}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="smartstore_sale_price" className={labelClass}>
                소비자가
              </label>
              <PriceInput
                id="smartstore_sale_price"
                min={0}
                value={salePrice}
                onChange={setSalePrice}
                className={inputClass}
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? "등록 중..." : "등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
