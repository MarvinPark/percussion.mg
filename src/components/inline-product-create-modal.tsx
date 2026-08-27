"use client";

import { useState } from "react";
import PriceInput from "@/components/price-input";
import type { InlineCreatedProduct } from "@/lib/inline-product-create-shared";

export type InlineProductCreateContext = "sale" | "quote" | "products";

type InlineProductCreateModalProps = {
  context: InlineProductCreateContext;
  initialModelName: string;
  onClose: () => void;
  onCreated: (product: InlineCreatedProduct) => void;
};

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100";

const labelClass =
  "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

const CONTEXT_COPY: Record<
  InlineProductCreateContext,
  { description: string; stockHint?: string }
> = {
  sale: {
    description:
      "검색되지 않은 제품을 재고에 등록한 뒤 판매에 추가할 수 있습니다.",
  },
  quote: {
    description:
      "검색되지 않은 제품을 재고에 등록한 뒤 견적에 추가할 수 있습니다.",
    stockHint: "기본 보관 위치(3층) 재고로 등록됩니다.",
  },
  products: {
    description: "제품 목록에 바로 등록합니다.",
    stockHint: "기본 보관 위치(3층) 재고로 등록됩니다.",
  },
};

function defaultSku(modelName: string) {
  const sanitized = modelName
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9가-힣_-]/g, "")
    .slice(0, 80);
  return sanitized || "NEW-PRODUCT";
}

export default function InlineProductCreateModal({
  context,
  initialModelName,
  onClose,
  onCreated,
}: InlineProductCreateModalProps) {
  const trimmedModel = initialModelName.trim();
  const [productName, setProductName] = useState(trimmedModel);
  const [modelName, setModelName] = useState(trimmedModel);
  const [sku, setSku] = useState(defaultSku(trimmedModel));
  const [supplier, setSupplier] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [salePrice, setSalePrice] = useState(0);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const copy = CONTEXT_COPY[context];
  const showStockQuantity = context === "quote" || context === "products";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch("/api/products/inline-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: productName,
          model_name: modelName,
          sku,
          supplier,
          category,
          brand,
          purchase_price: purchasePrice,
          sale_price: salePrice,
          stock_quantity: showStockQuantity ? stockQuantity : 0,
        }),
      });

      const result = (await response.json()) as
        | { product: InlineCreatedProduct }
        | { error: string };

      if (!response.ok || !("product" in result)) {
        setError(
          "error" in result ? result.error : "제품 등록에 실패했습니다.",
        );
        return;
      }

      onCreated(result.product);
      onClose();
    } catch {
      setError("제품 등록에 실패했습니다.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            제품 등록
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {copy.description}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="inline_create_supplier" className={labelClass}>
              공급처 <span className="text-red-500">*</span>
            </label>
            <input
              id="inline_create_supplier"
              value={supplier}
              onChange={(event) => setSupplier(event.target.value)}
              required
              placeholder="예: A사"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="inline_create_product_name" className={labelClass}>
              제품명 <span className="text-red-500">*</span>
            </label>
            <input
              id="inline_create_product_name"
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="inline_create_model_name" className={labelClass}>
              모델명 <span className="text-red-500">*</span>
            </label>
            <input
              id="inline_create_model_name"
              value={modelName}
              onChange={(event) => setModelName(event.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="inline_create_sku" className={labelClass}>
              SKU (모델번호) <span className="text-red-500">*</span>
            </label>
            <input
              id="inline_create_sku"
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="inline_create_category" className={labelClass}>
                카테고리
              </label>
              <input
                id="inline_create_category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="inline_create_brand" className={labelClass}>
                브랜드
              </label>
              <input
                id="inline_create_brand"
                value={brand}
                onChange={(event) => setBrand(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="inline_create_purchase_price"
                className={labelClass}
              >
                매입가 (원)
              </label>
              <PriceInput
                id="inline_create_purchase_price"
                min={0}
                value={purchasePrice}
                onChange={setPurchasePrice}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="inline_create_sale_price" className={labelClass}>
                소비자가 (원)
              </label>
              <PriceInput
                id="inline_create_sale_price"
                min={0}
                value={salePrice}
                onChange={setSalePrice}
                className={inputClass}
              />
            </div>
          </div>

          {showStockQuantity ? (
            <div>
              <label
                htmlFor="inline_create_stock_quantity"
                className={labelClass}
              >
                현재 재고수량
              </label>
              <input
                id="inline_create_stock_quantity"
                type="number"
                min={0}
                value={stockQuantity}
                onChange={(event) =>
                  setStockQuantity(Math.max(0, Number(event.target.value) || 0))
                }
                className={inputClass}
              />
              {copy.stockHint ? (
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {copy.stockHint}
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500"
            >
              {isPending ? "등록 중..." : "등록하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
