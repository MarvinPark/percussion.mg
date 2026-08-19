"use client";

import { useState, useTransition } from "react";
import { createProductForCafe24ExcelLink } from "@/app/(main)/sales/cafe24-excel/actions";
import PriceInput from "@/components/price-input";
import type { Cafe24ExcelImportPreviewItem } from "@/lib/cafe24-orders/types";
import type { SaleProductOption } from "@/types/sale";

type Cafe24ExcelProductCreateModalProps = {
  item: Cafe24ExcelImportPreviewItem;
  onClose: () => void;
  onCreated: (product: SaleProductOption) => void;
};

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

const labelClass =
  "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

function defaultSku(item: Cafe24ExcelImportPreviewItem) {
  if (item.sellerProductCode.trim()) {
    return item.sellerProductCode.trim().slice(0, 80);
  }
  if (item.productNo.trim()) {
    return `C24-${item.productNo.trim()}`.slice(0, 80);
  }
  return `C24-${item.lineId.replace(/[^a-zA-Z0-9|]/g, "").slice(-16) || "item"}`;
}

export default function Cafe24ExcelProductCreateModal({
  item,
  onClose,
  onCreated,
}: Cafe24ExcelProductCreateModalProps) {
  const [supplier, setSupplier] = useState("카페24");
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
  const [salePrice, setSalePrice] = useState(item.unitSalePrice);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createProductForCafe24ExcelLink({
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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            제품 등록
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            카페24 주문 상품을 재고에 등록합니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={labelClass}>공급처</label>
            <input
              value={supplier}
              onChange={(event) => setSupplier(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>카테고리</label>
              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>브랜드</label>
              <input
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>제품명 *</label>
            <input
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>모델명 *</label>
            <input
              value={modelName}
              onChange={(event) => setModelName(event.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>SKU *</label>
            <input
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>색상</label>
              <input
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>옵션</label>
              <input
                value={productOption}
                onChange={(event) => setProductOption(event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>사이즈</label>
              <input
                value={size}
                onChange={(event) => setSize(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>매입가</label>
              <PriceInput value={purchasePrice} onChange={setPurchasePrice} />
            </div>
            <div>
              <label className={labelClass}>소비자가</label>
              <PriceInput value={salePrice} onChange={setSalePrice} />
            </div>
          </div>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-600 dark:text-zinc-200"
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
