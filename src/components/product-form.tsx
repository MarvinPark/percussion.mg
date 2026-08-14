"use client";

import { useActionState, useEffect, useState } from "react";
import { createProduct, updateProduct } from "@/app/(main)/products/actions";
import PriceInput from "@/components/price-input";
import ProductRegistrationReportModal from "@/components/product-registration-report-modal";
import { STOCK_LOCATIONS } from "@/lib/stock-locations";
import type { Product } from "@/types/product";

const inputClass =
  "w-full rounded-lg border border-zinc-400 bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus:border-zinc-300 dark:focus:ring-zinc-300";

const labelClass =
  "mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";

type ProductFormProps = {
  product?: Product;
};

export default function ProductForm({ product }: ProductFormProps) {
  const isEdit = !!product;
  const [reportOpen, setReportOpen] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      if (isEdit) {
        formData.set("id", product.id);
        return (await updateProduct(formData)) ?? null;
      }
      return (await createProduct(formData)) ?? null;
    },
    null,
  );

  useEffect(() => {
    if (state?.error) {
      setReportOpen(true);
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      {isEdit ? <input type="hidden" name="id" value={product.id} /> : null}

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          기본 정보
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="product_name" className={labelClass}>
              제품명 <span className="text-red-500">*</span>
            </label>
            <input
              id="product_name"
              name="product_name"
              required
              defaultValue={product?.product_name ?? ""}
              placeholder="예: Fender Stratocaster"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="sku" className={labelClass}>
              SKU (모델번호) <span className="text-red-500">*</span>
            </label>
            <input
              id="sku"
              name="sku"
              required
              defaultValue={product?.sku ?? ""}
              placeholder="예: FEN-STRAT-RED-M"
              className={inputClass}
            />
            <p className="mt-1 text-xs font-medium text-zinc-700 dark:text-zinc-400">
              같은 SKU라도 매입가가 다르면 SKU 뒤에 -1, -2처럼 번호가 붙어 등록됩니다. 매입가가 같으면 등록되지 않습니다.
            </p>
          </div>

          <div>
            <label htmlFor="model_name" className={labelClass}>
              모델명 <span className="text-red-500">*</span>
            </label>
            <input
              id="model_name"
              name="model_name"
              required
              defaultValue={product?.model_name ?? ""}
              placeholder="예: American Professional II"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="brand" className={labelClass}>
              브랜드
            </label>
            <input
              id="brand"
              name="brand"
              defaultValue={product?.brand ?? ""}
              placeholder="예: Fender"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="category" className={labelClass}>
              카테고리
            </label>
            <input
              id="category"
              name="category"
              defaultValue={product?.category ?? ""}
              placeholder="예: 일렉기타"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="supplier" className={labelClass}>
              공급처 <span className="text-red-500">*</span>
            </label>
            <input
              id="supplier"
              name="supplier"
              required
              defaultValue={product?.supplier ?? ""}
              placeholder="예: A사, B사"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="stock_location" className={labelClass}>
              재고 위치 <span className="text-red-500">*</span>
            </label>
            <select
              id="stock_location"
              name="stock_location"
              required
              defaultValue={product?.stock_location ?? "3층"}
              className={inputClass}
            >
              {STOCK_LOCATIONS.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs font-medium text-zinc-700 dark:text-zinc-400">
              {isEdit
                ? "입고·출고 시 기본으로 적용되는 위치입니다."
                : "등록하는 재고가 들어갈 위치입니다."}
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <input
                type="checkbox"
                name="is_key_stock"
                defaultChecked={product?.is_key_stock ?? false}
                className="h-4 w-4 rounded border-zinc-400 accent-blue-600"
              />
              주요 재고
            </label>
            <p className="mt-1 text-xs font-medium text-zinc-700 dark:text-zinc-400">
              체크하면 주요재고 페이지에 표시됩니다.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          검색 키워드 태그
        </h2>
        <div>
          <label htmlFor="keywords" className={labelClass}>
            키워드 태그
          </label>
          <input
            id="keywords"
            name="keywords"
            defaultValue={product?.keywords ?? ""}
            placeholder="예: 드럼, 전자드럼, 롤랜드, 입문용"
            className={inputClass}
          />
          <p className="mt-1 text-xs font-medium text-zinc-700 dark:text-zinc-400">
            쉼표(,)로 구분해서 입력하세요. 판매 등록 시 이 키워드로도 검색됩니다.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          옵션 (색상 / 사이즈 등)
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="color" className={labelClass}>
              색상
            </label>
            <input
              id="color"
              name="color"
              defaultValue={product?.color ?? ""}
              placeholder="예: 레드"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="product_option" className={labelClass}>
              옵션
            </label>
            <input
              id="product_option"
              name="product_option"
              defaultValue={product?.product_option ?? ""}
              placeholder="예: HSS 픽업"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="size" className={labelClass}>
              사이즈
            </label>
            <input
              id="size"
              name="size"
              defaultValue={product?.size ?? ""}
              placeholder="예: 14인치"
              className={inputClass}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          가격 · 재고
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="purchase_price" className={labelClass}>
              매입가격 (원)
            </label>
            <PriceInput
              id="purchase_price"
              name="purchase_price"
              min={0}
              defaultValue={product?.purchase_price ?? 0}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="sale_price" className={labelClass}>
              소비자가 (원)
            </label>
            <PriceInput
              id="sale_price"
              name="sale_price"
              min={0}
              defaultValue={product?.sale_price ?? 0}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="stock_quantity" className={labelClass}>
              {isEdit ? "현재 재고수량 (합계)" : "현재 재고수량"}
            </label>
            {isEdit ? (
              <input
                id="stock_quantity"
                type="number"
                min={0}
                readOnly
                value={
                  (product?.stock_floor3 ?? 0) +
                  (product?.stock_b1 ?? 0) +
                  (product?.stock_display ?? 0)
                }
                className={`${inputClass} bg-zinc-100 dark:bg-zinc-800/80`}
              />
            ) : (
              <input
                id="stock_quantity"
                name="stock_quantity"
                type="number"
                min={0}
                defaultValue={0}
                className={inputClass}
              />
            )}
          </div>
          {isEdit ? (
            <>
              <div>
                <label htmlFor="stock_floor3" className={labelClass}>
                  3층 재고
                </label>
                <input
                  id="stock_floor3"
                  name="stock_floor3"
                  type="number"
                  min={0}
                  defaultValue={product?.stock_floor3 ?? 0}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="stock_b1" className={labelClass}>
                  B1 재고
                </label>
                <input
                  id="stock_b1"
                  name="stock_b1"
                  type="number"
                  min={0}
                  defaultValue={product?.stock_b1 ?? 0}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="stock_display" className={labelClass}>
                  의왕 재고
                </label>
                <input
                  id="stock_display"
                  name="stock_display"
                  type="number"
                  min={0}
                  defaultValue={product?.stock_display ?? 0}
                  className={inputClass}
                />
              </div>
            </>
          ) : null}
          <div>
            <label htmlFor="min_stock_quantity" className={labelClass}>
              최소 재고 알림
            </label>
            <input
              id="min_stock_quantity"
              name="min_stock_quantity"
              type="number"
              min={0}
              defaultValue={product?.min_stock_quantity ?? 0}
              className={inputClass}
            />
            <p className="mt-1 text-xs font-medium text-zinc-700 dark:text-zinc-400">
              재고가 이 수량 이하로 떨어지면 나중에 알림을 표시합니다.
            </p>
          </div>
        </div>
      </section>

      {state?.error && !reportOpen ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-400 sm:w-auto"
      >
        {isPending
          ? isEdit
            ? "저장 중..."
            : "등록 중..."
          : isEdit
            ? "수정 저장"
            : "제품 등록"}
      </button>

      {reportOpen && state?.error ? (
        <ProductRegistrationReportModal
          report={{
            title: isEdit ? "제품 수정 실패" : "제품 등록 실패",
            description: "입력 내용을 확인한 뒤 다시 시도해 주세요.",
            error: state.error,
          }}
          onClose={() => setReportOpen(false)}
        />
      ) : null}
    </form>
  );
}
